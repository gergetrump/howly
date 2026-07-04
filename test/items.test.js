import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import Item from '../src/features/items/item.model.js';

let mongo;
let app;

async function buildItem(overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 10);

  return Item.create({
    name: overrides.name || `Catalog Item ${suffix}`,
    type: overrides.type || 'accessory',
    price: overrides.price ?? 100,
    assetKey: overrides.assetKey || `catalog_item_${suffix}`,
    premiumOnly: overrides.premiumOnly ?? false,
    ...overrides,
  });
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  app = createApp();
});

afterEach(async () => {
  await Item.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

test('GET /api/items lists items sorted and filterable by type and premiumOnly', async () => {
  await buildItem({ name: 'Premium Hat', type: 'accessory', price: 300, premiumOnly: true, assetKey: 'premium-hat' });
  await buildItem({ name: 'Free Hoodie', type: 'clothing', price: 200, premiumOnly: false, assetKey: 'free-hoodie' });
  await buildItem({ name: 'Premium Hoodie', type: 'clothing', price: 500, premiumOnly: true, assetKey: 'premium-hoodie' });

  const clothingResponse = await request(app)
    .get('/api/items?type=clothing')
    .expect(200);

  assert.deepEqual(
    clothingResponse.body.map((item) => item.name),
    ['Free Hoodie', 'Premium Hoodie'],
  );

  const premiumResponse = await request(app)
    .get('/api/items?premiumOnly=true')
    .expect(200);

  assert.deepEqual(
    premiumResponse.body.map((item) => item.name),
    ['Premium Hat', 'Premium Hoodie'],
  );
});

test('POST /api/items rejects duplicate asset keys', async () => {
  await Item.syncIndexes();
  await buildItem({ assetKey: 'same-key' });

  const response = await request(app)
    .post('/api/items')
    .send({
      name: 'Duplicate',
      type: 'accessory',
      price: 100,
      assetKey: 'same-key',
    })
    .expect(400);

  assert.match(response.body.message, /assetKey already exists/);
  assert.equal(await Item.countDocuments({ assetKey: 'same-key' }), 1);
});

test('GET /api/items rejects invalid filters and missing items', async () => {
  await request(app)
    .get('/api/items?type=invalid')
    .expect(400)
    .expect((response) => {
      assert.match(response.body.message, /type must be one of/);
    });

  await request(app)
    .get(`/api/items/${new mongoose.Types.ObjectId().toString()}`)
    .expect(404);
});
