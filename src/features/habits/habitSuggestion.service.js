import { ApiError } from '../../errors/ApiError.js';
import { generateText } from '../../ai/ai.service.js';

const ALLOWED_FREQUENCIES = new Set(['Daily', 'Weekly', 'Monthly']);
const MAX_SUGGESTIONS = 3;

function buildPrompt(input) {
    return [
        'You are a habit coach inside a habit-tracking app.',
        'The user describes what they want to achieve — this can be a single word or a full sentence.',
        'Suggest exactly 3 small, concrete, actionable habits for it.',
        '',
        'Respond with ONLY a JSON object in this exact shape, nothing else:',
        '{ "habits": [ { "title": string, "icon": string, "frequency": string } ] }',
        '',
        'Rules:',
        '- title: short and actionable, max 60 characters.',
        '- icon: a single emoji that fits the habit.',
        `- frequency: exactly one of ${[...ALLOWED_FREQUENCIES].join(', ')}.`,
        '- Return exactly 3 habits. No explanations, no markdown fences.',
        '',
        `User input: ${input}`,
    ].join('\n');
}

function parseModelJson(raw) {
    let text = raw.trim();

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
        text = fenced[1].trim();
    }

    try {
        return JSON.parse(text);
    } catch {
        const block = text.match(/[[{][\s\S]*[\]}]/);
        if (block) {
            try {
                return JSON.parse(block[0]);
            } catch {
                // fall through to the error below
            }
        }
        throw new ApiError(502, 'AI_BAD_OUTPUT', 'AI returned malformed suggestions. Please try again.');
    }
}

function normalizeSuggestions(parsed) {
    const list = Array.isArray(parsed) ? parsed : parsed?.habits;

    if (!Array.isArray(list)) {
        throw new ApiError(502, 'AI_BAD_OUTPUT', 'AI returned no usable suggestions. Please try again.');
    }

    const suggestions = list
        .filter((habit) => habit && typeof habit.title === 'string' && habit.title.trim())
        .slice(0, MAX_SUGGESTIONS)
        .map((habit) => ({
            title: habit.title.trim().slice(0, 100),
            icon: typeof habit.icon === 'string' && habit.icon.trim() ? habit.icon.trim().slice(0, 8) : '🎯',
            frequency: ALLOWED_FREQUENCIES.has(habit.frequency) ? habit.frequency : 'Daily',
        }));

    if (!suggestions.length) {
        throw new ApiError(502, 'AI_BAD_OUTPUT', 'AI returned no usable suggestions. Please try again.');
    }

    return suggestions;
}

export async function suggestHabitsFromGoal(input) {
    let raw;

    try {
        raw = await generateText(buildPrompt(input));
    } catch (err) {
        console.error('AI habit suggestion failed:', err);
        throw new ApiError(502, 'AI_UNAVAILABLE', 'Could not reach the AI service. Please try again.');
    }

    const parsed = parseModelJson(raw);
    return {
        goal: input.trim().slice(0, 60),
        suggestions: normalizeSuggestions(parsed),
    };
}
