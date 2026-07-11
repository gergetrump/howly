import test from 'node:test';
import assert from 'node:assert/strict';
import { findBlockedUsernameTerm } from '../src/moderation/usernameContentFilter.js';

test('blocks a plain slur', () => {
  assert.equal(findBlockedUsernameTerm('faggot123'), 'faggot');
});

test('blocks sexy (incl. leetspeak) in a username', () => {
  assert.equal(findBlockedUsernameTerm('sexybeast'), 'sexy');
  assert.ok(findBlockedUsernameTerm('s3xy_99'));
});

test('blocks a leetspeak slur', () => {
  assert.ok(findBlockedUsernameTerm('n1gg3r'));
});

test('blocks a slur split by underscores or hyphens', () => {
  assert.ok(findBlockedUsernameTerm('f_u_c_k_er'));
  assert.ok(findBlockedUsernameTerm('5h1t-lord'));
});

test('allows a clean username', () => {
  assert.equal(findBlockedUsernameTerm('runner_maya'), null);
  assert.equal(findBlockedUsernameTerm('daily_grind_99'), null);
});

test('allows innocent names that would trip a naive filter', () => {
  assert.equal(findBlockedUsernameTerm('killian'), null);
  assert.equal(findBlockedUsernameTerm('grapefan'), null);
  assert.equal(findBlockedUsernameTerm('therapist_tom'), null);
  assert.equal(findBlockedUsernameTerm('assassin_main'), null);
});
