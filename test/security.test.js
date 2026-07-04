import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import multer from 'multer';
import request from 'supertest';
import createApp from '../src/app.js';
import { rejectUnsafeRequestKeys } from '../src/security/security.middleware.js';

test('security middleware adds browser hardening headers', async () => {
    const app = createApp();

    const response = await request(app)
        .get('/')
        .expect(200);

    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.match(response.headers['content-security-policy'], /default-src 'self'/);
    assert.match(response.headers['content-security-policy'], /object-src 'none'/);
});

test('security middleware rejects Mongo operator keys before feature logic runs', async () => {
    const app = createApp();

    await request(app)
        .post('/api/auth/login')
        .send({
            email: { $ne: null },
            password: 'anything',
        })
        .expect(400)
        .expect((response) => {
            assert.equal(response.body.code, 'SECURITY_INVALID_REQUEST');
        });
});

test('security middleware rejects prototype pollution keys', async () => {
    const app = createApp();

    await request(app)
        .post('/api/auth/login')
        .send({
            email: 'user@example.com',
            password: 'anything',
            constructor: { prototype: { isAdmin: true } },
        })
        .expect(400)
        .expect((response) => {
            assert.equal(response.body.code, 'SECURITY_INVALID_REQUEST');
        });
});

test('security middleware does not rewrite normal user text that only looks like HTML', async () => {
    const app = express();
    app.use(express.json());
    app.use(rejectUnsafeRequestKeys);
    app.post('/echo', (req, res) => res.json(req.body));

    const payload = {
        message: '<script>alert("x")</script> costs $5 and also <3',
        nested: {
            note: 'Plain text stays plain text.',
        },
    };

    const response = await request(app)
        .post('/echo')
        .send(payload)
        .expect(200);

    assert.deepEqual(response.body, payload);
});

test('security middleware can guard multipart fields after upload parsing', async () => {
    const app = express();
    const upload = multer();

    app.post('/upload', upload.none(), rejectUnsafeRequestKeys, (req, res) => {
        res.json(req.body);
    });

    await request(app)
        .post('/upload')
        .field('message[$ne]', 'not a normal field')
        .expect(400)
        .expect((response) => {
            assert.equal(response.body.code, 'SECURITY_INVALID_REQUEST');
        });
});
