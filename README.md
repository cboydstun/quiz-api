# quiz-api

Part 107 drone-license quiz app: a Next.js 16 frontend and a GraphQL API that
ship as a single Vercel deployment.

```
apps/web          UI + the GraphQL route handler at POST /v1/graphql
packages/db       Drizzle schema, migrations, Neon Postgres client
packages/graphql  schema, resolvers, auth
scripts/          one-off MongoDB -> Postgres import
```

The API is a Next.js route handler rather than a separate service, so there is
one origin, one deployment, and no CORS. `packages/graphql` has no dependency
on Next and can be mounted somewhere else if that ever changes.

**Stack:** Next.js 16 (App Router, Turbopack) · Apollo Client 4 · Tailwind v4 ·
GraphQL Yoga · Drizzle ORM · Neon Postgres · pnpm workspaces · Turborepo

## Getting started

Node 24 (see `.nvmrc`) and pnpm via corepack — the repo pins
`packageManager`, so corepack resolves the exact version.

```bash
nvm install                    # reads .nvmrc
corepack enable

pnpm install
cp .env.example .env.local     # then fill it in — see below
pnpm dev                       # http://localhost:3000
```

You need at minimum `DATABASE_URL` and `JWT_SECRET`. Provision Postgres with
`vercel integration add neon`, then `vercel env pull .env.local`. Google
sign-in additionally needs `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a
`GOOGLE_REDIRECT_URI` registered in Google Cloud Console for the origin you are
running on.

> **`.env.local` is production.** There is no separate development database —
> `vercel env pull` hands you the live Neon credentials, and every machine set
> up this way shares them. So `pnpm db:migrate`, `pnpm seed:questions` and any
> ad-hoc script you point at `DATABASE_URL` write to live data. The schema is
> already applied; you do not need to run `db:migrate` to get started.

### On a second machine

`.env.local` and `.vercel/` are both gitignored, so neither comes down with the
clone — the project has to be linked again:

```bash
git clone https://github.com/cboydstun/quiz-api.git && cd quiz-api
nvm install && corepack enable && pnpm install
vercel login && vercel link     # team chris-boydstuns-projects, project quiz-api
vercel env pull .env.local
```

Nothing here builds native code — `bcryptjs` is pure JavaScript and PGlite is
WASM — so there are no platform-specific build tools to install. `.env` is not
needed; its only consumer is the retired Mongo import.

## Commands

| Command                               | What it does                                            |
| ------------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                            | Next dev server on :3000, API included                  |
| `pnpm build`                          | Production build                                        |
| `pnpm test`                           | Every package (backend tests run on in-memory Postgres) |
| `pnpm lint` / `pnpm typecheck`        | Across the workspace                                    |
| `pnpm db:generate`                    | Generate a migration after editing the Drizzle schema   |
| `pnpm db:migrate`                     | Apply migrations to `DATABASE_URL` — see the note above |
| `pnpm seed:questions <email>`         | Seed the question bank, owned by an existing user       |
| `pnpm migrate:mongo`                  | **Retired** — the source cluster no longer resolves     |
| `pnpm --filter @quiz/graphql codegen` | Regenerate resolver types after an SDL change           |

Migrations are applied explicitly, never from the Vercel build, so a failed
migration cannot take down a deploy.

## Tests

`pnpm test` runs the backend suite against [PGlite](https://pglite.dev) — a
real Postgres compiled to WASM — with the actual migrations applied. Tests go
through `yoga.fetch()`, so HTTP status, content negotiation, and the auth
context are all exercised rather than mocked. No Docker, no network.

`packages/graphql/src/__tests__/auth-contract.test.ts` deserves special
mention: the frontend's Apollo error link decides whether to log a user out by
**string-matching error messages**, so those messages are an API contract and
that file is what keeps them honest.

## Deploying

One Vercel project, root directory `apps/web`, with "Include files outside
Root Directory" enabled so the workspace packages are visible. Set the
environment variables from `.env.example`, run `pnpm db:migrate` against the
target database, and deploy.

## History

This repository previously held an Apollo Server 3 + Express + Mongoose
backend, and the frontend lived in a separate `quiz-frontend` repo. Both were
replaced by this monorepo. The old backend is preserved on the
[`legacy-apollo3`](../../tree/legacy-apollo3) branch, which remains the
reference for the business rules ported here.
