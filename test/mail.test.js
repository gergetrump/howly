import test from 'node:test';
import assert from 'node:assert/strict';
import {
  challengeInvitationEmailTemplate,
  challengeInvitationEmailText,
  friendRequestEmailTemplate,
  friendRequestEmailText,
  streakReminderEmailTemplate,
  streakReminderEmailText,
} from '../src/features/mail/mail.service.js';

test('friend request notification email escapes user-controlled html and has text fallback', () => {
  const html = friendRequestEmailTemplate({
    requesterName: '<img src=x onerror=alert(1)>',
    socialUrl: 'https://howly.example/social?tab=requests&next=<bad>',
  });
  const text = friendRequestEmailText({
    requesterName: '<img src=x onerror=alert(1)>',
    socialUrl: 'https://howly.example/social?tab=requests&next=<bad>',
  });

  assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; sent you a friend request/);
  assert.match(html, /https:\/\/howly\.example\/social\?tab=requests&amp;next=&lt;bad&gt;/);
  assert.match(html, /&copy; \d{4} Howly/);
  assert.equal(html.includes('??'), false);
  assert.match(text, /sent you a friend request/);
  assert.match(text, /View request: https:\/\/howly\.example\/social/);
});

test('challenge invitation email escapes inviter and challenge title', () => {
  const html = challengeInvitationEmailTemplate({
    inviterName: '<script>alert(1)</script>',
    challengeTitle: '<b>Morning run</b>',
    challengeUrl: 'https://howly.example/challenges',
  });
  const text = challengeInvitationEmailText({
    inviterName: 'Mina',
    challengeTitle: 'Morning run',
    challengeUrl: 'https://howly.example/challenges',
  });

  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('<b>Morning run</b>'), false);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; invited you to a challenge/);
  assert.match(html, /&lt;b&gt;Morning run&lt;\/b&gt;/);
  assert.match(html, /copy and paste this link into your browser/);
  assert.match(text, /Mina invited you to a challenge/);
  assert.match(text, /Challenge: Morning run/);
});

test('streak reminder email escapes deadline and includes text fallback', () => {
  const html = streakReminderEmailTemplate({
    streak: 12,
    deadline: '<script>alert("soon")</script>',
    appUrl: 'https://howly.example',
  });
  const text = streakReminderEmailText({
    streak: 12,
    deadline: 'Jul 7, 2026, 20:00',
    appUrl: 'https://howly.example',
  });

  assert.equal(html.includes('<script>alert("soon")</script>'), false);
  assert.match(html, /&lt;script&gt;alert\(&quot;soon&quot;\)&lt;\/script&gt;/);
  assert.match(html, /Your 12-day streak repair window ends soon/);
  assert.match(text, /Your 12-day streak repair window ends soon/);
  assert.match(text, /Open Howly: https:\/\/howly\.example/);
});
