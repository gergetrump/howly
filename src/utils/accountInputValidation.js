const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'api',
  'howly',
  'moderator',
  'root',
  'support',
  'system',
]);

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const DISPLAY_NAME_MAX_LENGTH = 50;

function normalizeInputText(value) {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
}

export function validateUsernameValue(value, fieldName = 'username') {
  const username = normalizeInputText(value);

  if (!username) {
    return { error: `${fieldName} is required` };
  }

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return { error: `${fieldName} must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters` };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return { error: `${fieldName} may only contain letters, numbers, underscores, or hyphens` };
  }

  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return { error: `${fieldName} is reserved` };
  }

  return { value: username };
}

export function validateDisplayNameValue(value, fieldName) {
  const displayName = normalizeInputText(value);

  if (!displayName) {
    return { error: `${fieldName} is required` };
  }

  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return { error: `${fieldName} must be ${DISPLAY_NAME_MAX_LENGTH} characters or less` };
  }

  if (CONTROL_CHARACTER_PATTERN.test(displayName) || !DISPLAY_NAME_PATTERN.test(displayName)) {
    return { error: `${fieldName} may only contain letters, spaces, apostrophes, periods, or hyphens` };
  }

  return { value: displayName };
}

export { USERNAME_PATTERN, DISPLAY_NAME_PATTERN };
