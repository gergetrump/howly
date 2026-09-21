# Howly Backend

## Docker

`docker-compose.yml` is stored in this repository and must be moved to the parent
folder after cloning. All paths in the compose file are relative to that parent
folder (the Team X directory).

```bash
mkdir Team-21
cd Team-21
git clone https://gitlab.lrz.de/seba-master-2026-21453271/team-21/Backend.git Backend
git clone https://gitlab.lrz.de/seba-master-2026-21453271/team-21/Frontend.git Frontend
mv Backend/docker-compose.yml .
docker compose up -d
```

Configuration lives in committed `config.js` files (no `.env` required). The
backend connects to MongoDB Atlas using the credentials in `Backend/config.js`.

Open the app after the containers are running:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

Stop the stack from the Team X directory:

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
