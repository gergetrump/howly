// The companions a user can choose during onboarding.
// `type` matches the backend Companion.type enum; `defaultName` pre-fills the
// name input (the user can edit it). Wolf is the default/preselected option.
export const COMPANIONS = [
    { type: 'wolf', label: 'Wolf', defaultName: 'Howly' },
    { type: 'panda', label: 'Panda', defaultName: 'Bamboo' },
    { type: 'bear', label: 'Bear', defaultName: 'Brownie' },
];

export const COMPANION_TYPES = COMPANIONS.map((companion) => companion.type);

export const DEFAULT_COMPANION_TYPE = 'wolf';

// Returns the default name for a companion type (falls back to Howly).
export function getDefaultCompanionName(type) {
    return COMPANIONS.find((companion) => companion.type === type)?.defaultName ?? 'Howly';
}
