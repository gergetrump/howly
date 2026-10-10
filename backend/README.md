# Howly Backend

Express API for the Howly habit tracker. Run it from this folder for local development, or from the repo root with Docker Compose.

## Local development

```bash
cp .env.example .env
# edit .env — at minimum set JWT_SECRET and MONGO_URI
npm install
npm run dev
```

API: http://localhost:3000

Production starts with `npm start` (`node src/server.js`). See the [root README](../README.md) for Docker and Render.

Optional Stripe webhooks:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

## Tests

```bash
npm test
```

## Habit taxonomy

Canonical categories live in `data/habit-taxonomy.seed.json`. After changing that file:

```bash
npm run seed:taxonomy
npm run backfill:taxonomy   # optional: reclassify existing habits and challenges
```

Demo accounts (optional):

```bash
npm run seed:demo-users
npm run tick:demo-users
npm run clean:demo-users
```

See the [root README](../README.md) for architecture, Docker, and the full environment variable list.
