# Howly Backend

## Docker

Clone both repositories as siblings, then start the full stack from this directory:

```bash
git clone <backend-repo-url> Backend
git clone <frontend-repo-url> Frontend
cd Backend
docker compose up -d
```

The backend connects to MongoDB Atlas using the credentials in `config.js`.

Open the app after the containers are running:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

Stop the stack:

```bash
docker compose down
```

## Local development

```bash
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/payments/webhook
```

## Habit taxonomy

Canonical categories and habits live in `data/habit-taxonomy.seed.json`. After changing that file, re-seed MongoDB:

```bash
npm run seed:taxonomy
```

Optionally reclassify existing habits and challenges:

```bash
npm run backfill:taxonomy
```
