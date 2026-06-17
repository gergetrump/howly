// Scripted lines the companion "speaks" during the AI goal → habit flow.
// Centralised here so the wording is easy to tweak without touching the modal.
export function getCompanionLines(name = 'Howly') {
    return {
        greeting: `Hi, I'm ${name}! 🐾 What do you want to achieve?`,
        thinking: 'Hmm, let me think for a sec…',
        results: 'Here are a few ideas for you! 👇',
        fallback: "I couldn't reach my brain just now — here are some classics! 👇",
        limit: "You've hit your habit limit for now.",
        error: 'Oops, my head is foggy — give it another try.',
    };
}
