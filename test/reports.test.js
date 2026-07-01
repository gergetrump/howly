import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import config from '../config.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import User from '../src/features/users/user.model.js';
import { Report } from '../src/features/reports/report.model.js';

let mongo;
let app;
let originalDisableEmailSending;

async function buildUser(overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 10);

  return User.create({
    username: overrides.username || `report_user_${suffix}`,
    email: overrides.email || `report_user_${suffix}@example.com`,
    firstName: overrides.firstName || 'Report',
    lastName: overrides.lastName || 'User',
    passwordHash: overrides.passwordHash || 'hashed',
    authProvider: overrides.authProvider || 'local',
    ...overrides,
  });
}

function authHeader(user) {
  return `Bearer ${signAccessToken(user)}`;
}

before(async () => {
  originalDisableEmailSending = config.disableEmailSending;
  config.disableEmailSending = true;
  config.jwtSecret = 'test-secret';
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  app = createApp();
});

afterEach(async () => {
  await Promise.all([
    Report.deleteMany({}),
    User.deleteMany({}),
  ]);
});

after(async () => {
  config.disableEmailSending = originalDisableEmailSending;
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

test('creating a user report stores tags, text, and attachment metadata', async () => {
  const reporter = await buildUser({ username: 'reporter' });
  const reportedUser = await buildUser({ username: 'reported' });

  const response = await request(app)
    .post('/api/reports')
    .set('Authorization', authHeader(reporter))
    .field('reportedUserId', reportedUser._id.toString())
    .field('message', 'This user sent suspicious messages.')
    .field('tags', JSON.stringify(['Fraud & Scams', 'Spam or Misinformation']))
    .attach('attachment', Buffer.from('fake-image'), {
      filename: 'evidence.png',
      contentType: 'image/png',
    })
    .expect(201);

  assert.match(response.body.message, /Thank you for your report/);

  const report = await Report.findById(response.body.report.id).lean();

  assert.equal(report.reporter.toString(), reporter._id.toString());
  assert.equal(report.reportedUser.toString(), reportedUser._id.toString());
  assert.deepEqual(report.tags, ['Fraud & Scams', 'Spam or Misinformation']);
  assert.equal(report.message, 'This user sent suspicious messages.');
  assert.equal(report.attachment.filename, 'evidence.png');
  assert.equal(report.attachment.mimeType, 'image/png');
});

test('creating a user report works without optional tags or attachment', async () => {
  const reporter = await buildUser({ username: 'notagreporter' });
  const reportedUser = await buildUser({ username: 'notagreported' });

  const response = await request(app)
    .post('/api/reports')
    .set('Authorization', authHeader(reporter))
    .field('reportedUserId', reportedUser._id.toString())
    .field('message', 'This report only has text.')
    .expect(201);

  const report = await Report.findById(response.body.report.id).lean();

  assert.deepEqual(report.tags, []);
  assert.equal(report.attachment, undefined);
  assert.equal(report.emailSent, false);
});

test('creating a user report requires report text', async () => {
  const reporter = await buildUser({ username: 'quietreporter' });
  const reportedUser = await buildUser({ username: 'quietreported' });

  await request(app)
    .post('/api/reports')
    .set('Authorization', authHeader(reporter))
    .field('reportedUserId', reportedUser._id.toString())
    .expect(400)
    .expect((response) => {
      assert.match(response.body.message, /required/i);
    });
});

test('creating a user report requires authentication', async () => {
  const reportedUser = await buildUser({ username: 'authreported' });

  await request(app)
    .post('/api/reports')
    .field('reportedUserId', reportedUser._id.toString())
    .field('message', 'This should not be accepted without a token.')
    .expect(401);

  const reportCount = await Report.countDocuments();

  assert.equal(reportCount, 0);
});

test('creating a user report rejects unsupported tags', async () => {
  const reporter = await buildUser({ username: 'tagreporter' });
  const reportedUser = await buildUser({ username: 'tagreported' });

  await request(app)
    .post('/api/reports')
    .set('Authorization', authHeader(reporter))
    .field('reportedUserId', reportedUser._id.toString())
    .field('message', 'This has an unsupported tag.')
    .field('tags', JSON.stringify(['Not A Real Tag']))
    .expect(400)
    .expect((response) => {
      assert.match(response.body.message, /Unsupported report tag/);
    });

  const reportCount = await Report.countDocuments();

  assert.equal(reportCount, 0);
});

test('creating a user report rejects unknown reported users', async () => {
  const reporter = await buildUser({ username: 'missingreporter' });
  const missingUserId = new mongoose.Types.ObjectId().toString();

  await request(app)
    .post('/api/reports')
    .set('Authorization', authHeader(reporter))
    .field('reportedUserId', missingUserId)
    .field('message', 'This user does not exist.')
    .expect(404)
    .expect((response) => {
      assert.equal(response.body.code, 'USER_NOT_FOUND');
    });

  const reportCount = await Report.countDocuments();

  assert.equal(reportCount, 0);
});

test('creating a user report rejects non-image attachments', async () => {
  const reporter = await buildUser({ username: 'filereporter' });
  const reportedUser = await buildUser({ username: 'filereported' });

  await request(app)
    .post('/api/reports')
    .set('Authorization', authHeader(reporter))
    .field('reportedUserId', reportedUser._id.toString())
    .field('message', 'This attachment should be rejected.')
    .attach('attachment', Buffer.from('not an image'), {
      filename: 'notes.txt',
      contentType: 'text/plain',
    })
    .expect(400)
    .expect((response) => {
      assert.equal(response.body.errorCode, 'UPLOAD_ERROR');
    });

  const reportCount = await Report.countDocuments();

  assert.equal(reportCount, 0);
});

test('a user cannot report themself', async () => {
  const reporter = await buildUser({ username: 'selfreporter' });

  await request(app)
    .post('/api/reports')
    .set('Authorization', authHeader(reporter))
    .field('reportedUserId', reporter._id.toString())
    .field('message', 'I should not be able to report myself.')
    .expect(400)
    .expect((response) => {
      assert.equal(response.body.code, 'CANNOT_REPORT_SELF');
    });
});
