import { ApiError } from '../../errors/ApiError.js';
import { CATEGORIES } from './habit.model.js';
import { generateText } from '../../ai/ai.service.js';

// AI suggestions are restricted to these frequencies (Custom needs explicit
// weekday picks, so it is left out of the AI flow) and to the app's categories.
const ALLOWED_FREQUENCIES = new Set(['Daily', 'Weekly', 'Monthly']);
const ALLOWED_CATEGORIES = new Set(CATEGORIES);
const MAX_SUGGESTIONS = 3;

function buildPrompt(goal) {
    return [
        'You are a habit coach inside a habit-tracking app.',
        'The user gives you a personal goal. Suggest exactly 3 small, concrete, actionable habits that help reach it.',
        '',
        'Respond with ONLY a JSON object in this exact shape, nothing else:',
        '{ "habits": [ { "title": string, "icon": string, "frequency": string, "category": string } ] }',
        '',
        'Rules:',
        '- title: short and actionable, max 60 characters.',
        '- icon: a single emoji that fits the habit.',
        `- frequency: exactly one of ${[...ALLOWED_FREQUENCIES].join(', ')}.`,
        `- category: exactly one of ${[...ALLOWED_CATEGORIES].join(', ')}.`,
        '- Return exactly 3 habits. No explanations, no markdown fences.',
        '',
        `User goal: ${goal}`,
    ].join('\n');
}

// Free models don't always return clean JSON, so parse defensively: strip code
// fences, then fall back to grabbing the first {...}/[...] block.
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

// Validate & sanitize the model output into ready-to-create habit objects.
// Anything invalid is coerced to a safe default rather than trusted blindly.
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
            category: ALLOWED_CATEGORIES.has(habit.category) ? habit.category : null,
        }));

    if (!suggestions.length) {
        throw new ApiError(502, 'AI_BAD_OUTPUT', 'AI returned no usable suggestions. Please try again.');
    }

    return suggestions;
}

/**
 * Turn a free-text goal into up to 3 validated, ready-to-create habit suggestions.
 *
 * Suggestions are NOT persisted — the client shows them, the user picks, and the
 * chosen ones are created afterwards via the normal habit-create flow.
 */
export async function suggestHabitsFromGoal(goal) {
    let raw;

    try {
        raw = await generateText(buildPrompt(goal));
    } catch (err) {
        console.error('AI habit suggestion failed:', err);
        throw new ApiError(502, 'AI_UNAVAILABLE', 'Could not reach the AI service. Please try again.');
    }

    return normalizeSuggestions(parseModelJson(raw));
}
