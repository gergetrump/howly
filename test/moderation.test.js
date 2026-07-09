import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import config from '../config.js';
import { moderateText } from '../src/moderation/moderation.service.js';

const originalFetch = global.fetch;
const originalApiKey = config.moderation.apiKey;
const originalConsoleError = console.error;

function moderationResponse({ flagged }) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ flagged, category_scores: { harassment: flagged ? 0.98 : 0.01 } }],
    }),
    text: async () => '',
  };
}

beforeEach(() => {
  console.error = () => {};
});

afterEach(() => {
  global.fetch = originalFetch;
  config.moderation.apiKey = originalApiKey;
  console.error = originalConsoleError;
});

test('flags harmful text', async () => {
  config.moderation.apiKey = 'sk-test-key';
  global.fetch = async () => moderationResponse({ flagged: true });

  const result = await moderateText('something harmful');

  assert.equal(result.flagged, true);
  assert.equal(result.checked, true);
});

test('passes clean text through', async () => {
  config.moderation.apiKey = 'sk-test-key';
  global.fetch = async () => moderationResponse({ flagged: false });

  const result = await moderateText('run three times a week');

  assert.equal(result.flagged, false);
  assert.equal(result.checked, true);
});

test('fails open when the API returns an error status', async () => {
  config.moderation.apiKey = 'sk-test-key';
  global.fetch = async () => ({ ok: false, status: 500, text: async () => 'boom', json: async () => ({}) });

  const result = await moderateText('run three times a week');

  assert.equal(result.flagged, false);
  assert.equal(result.checked, false);
});

test('fails open when the request throws (outage or timeout)', async () => {
  config.moderation.apiKey = 'sk-test-key';
  global.fetch = async () => {
    throw new Error('network down');
  };

  const result = await moderateText('run three times a week');

  assert.equal(result.flagged, false);
  assert.equal(result.checked, false);
});

test('skips the API entirely when no key is configured', async () => {
  config.moderation.apiKey = '';
  let apiCalled = false;
  global.fetch = async () => {
    apiCalled = true;
    return moderationResponse({ flagged: false });
  };

  const result = await moderateText('run three times a week');

  assert.equal(result.checked, false);
  assert.equal(apiCalled, false);
});

test('sends an abort signal so a hanging request can time out', async () => {
  config.moderation.apiKey = 'sk-test-key';
  let receivedSignal;
  global.fetch = async (url, options) => {
    receivedSignal = options.signal;
    return moderationResponse({ flagged: false });
  };

  await moderateText('run three times a week');

  assert.ok(receivedSignal instanceof AbortSignal);
});
