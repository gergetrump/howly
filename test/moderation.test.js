import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import config from '../config.js';
import { moderateText, moderateImage } from '../src/moderation/moderation.service.js';

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

test('flags a harmful image', async () => {
  config.moderation.apiKey = 'sk-test-key';
  global.fetch = async () => moderationResponse({ flagged: true });

  const result = await moderateImage('https://cdn.example.com/pic.jpg');

  assert.equal(result.flagged, true);
  assert.equal(result.checked, true);
});

test('passes a clean image', async () => {
  config.moderation.apiKey = 'sk-test-key';
  global.fetch = async () => moderationResponse({ flagged: false });

  const result = await moderateImage('https://cdn.example.com/pic.jpg');

  assert.equal(result.flagged, false);
  assert.equal(result.checked, true);
});

test('sends the image as an image_url moderation input', async () => {
  config.moderation.apiKey = 'sk-test-key';
  let sentBody;
  global.fetch = async (url, options) => {
    sentBody = JSON.parse(options.body);
    return moderationResponse({ flagged: false });
  };

  await moderateImage('https://cdn.example.com/pic.jpg');

  assert.equal(sentBody.input[0].type, 'image_url');
  assert.equal(sentBody.input[0].image_url.url, 'https://cdn.example.com/pic.jpg');
});

test('image moderation fails open when the request errors', async () => {
  config.moderation.apiKey = 'sk-test-key';
  global.fetch = async () => {
    throw new Error('network down');
  };

  const result = await moderateImage('https://cdn.example.com/pic.jpg');

  assert.equal(result.flagged, false);
  assert.equal(result.checked, false);
});
