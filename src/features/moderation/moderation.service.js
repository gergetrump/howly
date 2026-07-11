const COMMENT_MODERATION_BLOCKED = 'COMMENT_MODERATION_BLOCKED';

// Local, narrow moderation for comments. It blocks obvious abuse while keeping
// normal friend conversations out of an external moderation API.
const COMMENT_BLOCK_RULES = [
  {
    reason: 'threat',
    pattern: /\b(i\s+will|i\s+am\s+going\s+to|i'?m\s+going\s+to)\s+(hurt|harm|kill)\s+you\b/i,
  },
  {
    reason: 'threat',
    pattern: /\b(hurt|harm|kill)\s+you\b/i,
  },
  {
    reason: 'threat',
    pattern: /\b(hope\s+you\s+die|go\s+die|drop\s+dead)\b/i,
  },
  {
    reason: 'threat',
    pattern: /\b(i\s+will|i\s+am\s+going\s+to|i'?m\s+going\s+to)\s+(find|attack|beat)\s+you\b/i,
  },
  {
    reason: 'harassment',
    pattern: /\byou\s+are\s+(worthless|trash|disgusting|pathetic|a\s+loser|an\s+idiot|stupid)\b/i,
  },
  {
    reason: 'harassment',
    pattern: /\b(nobody\s+likes\s+you|everyone\s+hates\s+you|shut\s+up\s+idiot)\b/i,
  },
  {
    reason: 'self_harm_encouragement',
    pattern: /\b(kill|hurt)\s+yourself\b/i,
  },
  {
    reason: 'self_harm_encouragement',
    pattern: /\b(go\s+hurt\s+yourself|go\s+kill\s+yourself)\b/i,
  },
  {
    reason: 'sexual_content',
    pattern: /\b(send|share|show|drop)\s+(me\s+)?(nudes|nude\s+pics|naked\s+pics|naked\s+pictures|explicit\s+pics)\b/i,
  },
  {
    reason: 'sexual_content',
    pattern: /\b(send|share|show)\s+(me\s+)?your\s+(body|private\s+parts|chest|butt)\b/i,
  },
  {
    reason: 'sexual_content',
    pattern: /\b(have\s+)?sex\s+with\s+me\b/i,
  },
  {
    reason: 'sexual_content',
    pattern: /\b(i\s+want\s+to\s+see\s+you\s+naked|let\s+me\s+see\s+you\s+naked)\b/i,
  },
  {
    reason: 'sexual_content',
    pattern: /\b(send|share|show)\s+(me\s+)?(dirty|sexual|explicit)\s+(photos|pictures|pics)\b/i,
  },
  {
    reason: 'contact_spam',
    pattern: /\b(dm|message|follow)\s+me\s+on\s+(instagram|snapchat|telegram|whatsapp)\b/i,
  },
  {
    reason: 'contact_spam',
    pattern: /\b(click|tap|visit)\s+(this\s+)?link\s+(for\s+)?(free\s+coins|free\s+money|followers)\b/i,
  },
];

function normalizeModerationText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}'@#]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Small local rule layer for obvious abusive comments.
// Keep this separate from story logic so it can later be replaced by a
// moderation API or model without changing comment, tag, or notification code.
export function moderateCommentText(content) {
  const normalizedContent = normalizeModerationText(content);

  if (!normalizedContent) {
    return { allowed: true };
  }

  const matchedRule = COMMENT_BLOCK_RULES.find((rule) => rule.pattern.test(normalizedContent));

  if (!matchedRule) {
    return { allowed: true };
  }

  return {
    allowed: false,
    errorCode: COMMENT_MODERATION_BLOCKED,
    reason: matchedRule.reason,
  };
}

export { COMMENT_MODERATION_BLOCKED };
