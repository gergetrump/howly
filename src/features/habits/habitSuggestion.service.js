import { ApiError } from '../../errors/ApiError.js';
import { CATEGORIES } from './habit.model.js';
import { generateText } from '../../ai/ai.service.js';

// AI suggestions are restricted to these frequencies (Custom needs explicit
// weekday picks, so it is left out of the AI flow) and to the app's categories.
const ALLOWED_FREQUENCIES = new Set(['Daily', 'Weekly', 'Monthly']);
const ALLOWED_CATEGORIES = new Set(CATEGORIES);
const MAX_SUGGESTIONS = 3;

function buildPrompt(input) {
    return [
        'You are a habit coach inside a habit-tracking app.',
        'The user describes what they want to achieve — this can be a single word or a full sentence.',
        'First extract a short goal label, then suggest exactly 3 small, concrete, actionable habits for it.',
        '',
        'Respond with ONLY a JSON object in this exact shape, nothing else:',
        '{ "goal": string, "habits": [ { "title": string, "icon": string, "frequency": string, "category": string } ] }',
        '',
        'Rules:',
        '- goal: a short, clean label of at most 4 words (e.g. "Sleep better", "Read more", "Get fit").',
        '- title: short and actionable, max 60 characters.',
        '- icon: a single emoji that fits the habit.',
        `- frequency: exactly one of ${[...ALLOWED_FREQUENCIES].join(', ')}.`,
        `- category: exactly one of ${[...ALLOWED_CATEGORIES].join(', ')}.`,
        '- Return exactly 3 habits. No explanations, no markdown fences.',
        '',
        `User input: ${input}`,
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

// Use the model's extracted goal label if it looks sane, otherwise fall back to
// a trimmed version of what the user typed.
function normalizeGoal(parsed, fallbackInput) {
    const extracted = typeof parsed?.goal === 'string' ? parsed.goal.trim() : '';
    return (extracted || fallbackInput.trim()).slice(0, 60);
}

/**
 * Turn free-text input (a word or a full sentence) into a short goal label plus
 * up to 3 validated, ready-to-create habit suggestions.
 *
 * Suggestions are NOT persisted — the client shows them, the user edits/picks,
 * and the chosen ones are created via the normal habit-create flow.
 */
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
        goal: normalizeGoal(parsed, input),
        suggestions: normalizeSuggestions(parsed),
    };
}
