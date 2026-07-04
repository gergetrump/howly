# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/payments/webhook

## Habit taxonomy

Canonical categories and habits live in `data/habit-taxonomy.seed.json`. After changing that file, re-seed MongoDB:

```bash
npm run seed:taxonomy
```

Optionally reclassify existing habits and challenges:

```bash
npm run backfill:taxonomy
```
