<p align="center">
  <img src="frontend/src/assets/wolf.svg" alt="Howly companion" width="160" />
</p>

# Howly

**A gamified, social habit tracker in the browser.** Log a day in one click, run challenges with friends, and keep a cosmic companion that grows with your streak.

The live site is **[howlyhabit.com](https://howlyhabit.com)**.

## Why this project

Howly is a habit tracker with the rest of a consumer product attached: accounts, friends and stories, shared challenges, a shop, Stripe subscriptions, realtime notifications, and moderation on what people post.

## Features

- **Habits & streaks** — custom habits, check-ins, streak shields, and a repair window after a missed day
- **Social layer** — friends, picture stories, reactions, ghost mode, blocking, and reports
- **Challenges** — invite friends, track shared goals, and get recommendations
- **Companion & shop** — earn coins, buy items, and dress a wolf / panda / bear companion
- **Premium** — Stripe subscriptions unlock higher limits, coins, and shop items
- **AI coaching** — OpenRouter-backed habit suggestions with prompt-injection and safety guards
- **Analytics** — personal stats plus anonymized community trends
- **Safety** — JWT auth, Helmet, content moderation, unsigned webhook rejection, account deletion that cancels Stripe

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS 4, Radix / shadcn-style UI |
| Backend | Node.js, Express 5, Mongoose |
| Database | MongoDB |
| Auth | JWT, bcrypt, email verification |
| Payments | Stripe Checkout + webhooks |
| Media | Cloudinary, Sharp, Multer |
| AI | OpenRouter (GPT-4o-mini + free fallbacks), OpenAI moderation |
| Infra | Docker Compose |

## Architecture

```mermaid
flowchart LR
  Browser["React + Vite<br/>frontend/"] -->|REST + SSE| API["Express 5<br/>backend/"]
  API --> Mongo[(MongoDB)]
  API --> Stripe[Stripe]
  API --> Cloudinary[Cloudinary]
  API --> OpenRouter[OpenRouter / OpenAI]
  API --> SMTP[SMTP]
```

| Area | Backend | Frontend |
| --- | --- | --- |
| Auth & profile | `src/features/auth`, `src/features/users` | Login, register, verify, profile |
| Habits & analytics | `src/features/habits`, `analytics`, `trends` | Dashboard, analytics, trends |
| Social | `src/features/social`, `stories`, `reports` | Social feed, stories, friends |
| Challenges | `src/features/challenges` | Challenges |
| Economy | `items`, `inventory`, `streakFreeze`, `payment` | Shop, inventory, premium |
| Companion | `src/features/companion`, `src/ai` | Companion onboarding + chat |

## Repository layout

```
howly/
├── frontend/          # React SPA
├── backend/           # Express API
├── docker-compose.yml       # local development
├── docker-compose.prod.yml  # public deployment
├── render.yaml
└── README.md
```

Frontend and backend were originally separate GitLab repos. This repository merges both with `git subtree`, so commit history from each side is preserved.

## Quick start

### Docker

```bash
git clone https://github.com/gergetrump/howly.git
cd howly
docker compose up --build
```

- App: http://localhost:5173
- API: http://localhost:3000

Core tracking works without extra keys. Stripe, Cloudinary, AI suggestions, and email stay off until you add them to the environment.

### Local (two terminals)

Requires Node.js 20+ and MongoDB on `mongodb://127.0.0.1:27017/howly`.

```bash
# backend
cd backend
cp .env.example .env
npm install
npm run dev

# frontend
cd frontend
npm install
npm run dev
```

From the repo root you can also run `npm run dev:backend` and `npm run dev:frontend`.

```bash
cd backend && npm test
```

## Deploy

[howlyhabit.com](https://howlyhabit.com) is the public site. It serves the built React app and proxies `/api` and `/uploads` to the API.

That site is `infra/minimal`: one EC2 instance, and the API process on it also runs the streak jobs. The production design does not. There the API sets `RUN_SCHEDULERS=false`, and EventBridge runs the daily job and the reminder job as separate tasks. A MongoDB lease makes a second run in the same period a no-op.

Leave `infra/production` unapplied until you intend to pay for it.

### Minimal stack

This is what [howlyhabit.com](https://howlyhabit.com) runs. One small EC2 instance, an Elastic IP, ports 80 and 443, SES, and Session Manager. MongoDB runs in Docker on that instance. Copy `infra/minimal/terraform.tfvars.example` to `terraform.tfvars`, then:

```bash
cd infra/minimal
terraform init
terraform apply
```

howlyhabit.com uses the Route 53 zone from when the domain was registered, and Terraform adds the site records there. GitHub Actions deploys `main` after tests pass once these repository variables exist: `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`, and `AWS_INSTANCE_ID`. They are the Terraform outputs. Create SES SMTP credentials after the domain verifies, put them in `smtp_username` and `smtp_password`, and apply again.

Set `reviewer_email` and `reviewer_password` in `terraform.tfvars` to seed a demo account. It is shown on the landing page and can log in without a verification email.

### Production design

`infra/production` is the multi-region layout. Frankfurt runs the site: three availability zones, a NAT gateway in each zone, private subnets, CloudFront, an Application Load Balancer, two Fargate tasks, and a three-member MongoDB replica set. Ireland holds a hidden, non-voting member of that set, delayed by an hour, plus disk backups. A person starts `howly-restore-standby`. On the default path that document disables the Frankfurt streak schedules, stops streak tasks that are already running, and scales the Frankfurt API to zero before it will promote. It also refuses when Ireland is further behind than `failover_max_lag_seconds`, then checks a canary write. If the scale-down does not finish, it puts the API count and the schedules back. `allowUnfencedPromotion=true` skips the fence for a region that no longer answers, and that path can roll back committed writes. DNS stays on Frankfurt until you apply `standby_restore_confirmed=restored`, `standby_desired_count` of at least 1, and `enable_region_failover=true`. That apply leaves the Frankfurt API at zero and its streak schedules disabled.

`infra/bootstrap` creates the state bucket and lock table. Check the design without that backend:

```bash
cd infra/production
terraform init -backend=false
terraform validate
```

A plan needs `-backend-config` from the bootstrap output, `-var confirm_production_apply=apply-production`, a real `api_image_tag`, a JWT secret of at least 32 characters, and `mongo_image_digest` for the `mongo:7` image mirrored into the `howly-mongo` repository. An apply starts the bill: NAT gateways, two load balancers, Fargate, interface endpoints, and four database instances.

### Local production compose

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Open http://localhost:8080. `docker-compose.https.yml` adds Caddy and is what the EC2 host runs.

## Environment

Copy [`backend/.env.example`](backend/.env.example) to `backend/.env`. Nothing secret is committed.

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing key for access tokens. Required, 32+ characters, in production |
| `TRUST_PROXY` | Set `true` when TLS terminates in front of the API |
| `CORS_ORIGINS` | Extra browser origins, comma-separated. The site URL is already allowed |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Premium checkout |
| `CLOUDINARY_*` | Image uploads |
| `OPENROUTER_API_KEY` | AI habit suggestions |
| `MODERATION_API_KEY` | Text moderation |
| `SMTP_*` | Verification and password-reset email |
| `DISABLE_EMAIL_SENDING` | Defaults to `true` locally |

Frontend optional: `VITE_API_BASE_URL` (defaults to `http://localhost:3000/api`). The production image uses `/api`. Notification streams use that same value.

## Team

[George Trump](https://github.com/gergetrump), My Nguyen, Abinaya Sivaguru, and Maximilian Mittmann.
