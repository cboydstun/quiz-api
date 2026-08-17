# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Project

pnpm monorepo for a Part 107 drone-license quiz app. One deployable: the
Next.js 16 app in `apps/web`, which serves both the UI **and** the GraphQL API
from the same origin.

```
apps/web          Next.js 16 App Router UI + the GraphQL route handler
packages/db       Drizzle schema, migrations, database client
packages/graphql  SDL, resolvers, auth — everything the API does
scripts/          one-off MongoDB -> Postgres import
```

This replaces two older repos: the standalone `quiz-frontend`, and the
Apollo Server 3 + Express + Mongoose backend that lived on this repo's `main`
before the rewrite. That backend is preserved on the **`legacy-apollo3`**
branch and is the reference for any business rule that looks unexplained here.

## Commands

Package manager is **pnpm**; task runner is **Turborepo**.

```bash
pnpm install
pnpm dev            # turbo run dev -> next dev on :3000
pnpm build          # turbo run build
pnpm lint           # all packages
pnpm test           # all packages
pnpm typecheck      # all packages

pnpm db:generate    # drizzle-kit generate after a schema change
pnpm db:migrate     # apply migrations to whatever DATABASE_URL points at
pnpm migrate:mongo  # one-off Mongo import

pnpm --filter @quiz/graphql codegen   # regenerate resolver types after an SDL change
pnpm --filter @quiz/graphql test      # backend tests only
```

Next.js 16 removed `next lint`, and `next build` no longer lints. Turbopack is
the default bundler for `dev` and `build`.

## The frontend/backend contract

The frontend's 23 GraphQL operations were written first and are treated as
fixed. `packages/graphql/src/typeDefs.ts` mirrors them field-for-field. When
changing an operation, update the SDL, the resolver, and the hand-written
TypeScript interface next to the `gql` tag in `apps/web` in the same commit —
there is no client-side codegen.

**Error messages are part of that contract**, which is unusual enough to spell
out. `apps/web/src/components/ApolloWrapper.tsx` clears the stored token and
hard-redirects to `/login` whenever an error message contains "unauthorized" or
"unauthenticated"; `apps/web/src/app/quiz/page.tsx` matches the literal string
"Authorization header must be provided". So:

- Authentication failures **must** carry one of those markers, or a user with a
  dead token gets stuck.
- Authorization (permission) failures **must not** — they say "Forbidden".
  An EDITOR denied an ADMIN action is still logged in; saying "Unauthorized"
  would log them out.

`packages/graphql/src/errors.ts` is the only place that constructs these, and
`src/__tests__/auth-contract.test.ts` is the executable version of the rules
above, including the negative assertion. Do not weaken it.

Two more client-imposed constraints:

- Errors come back as **HTTP 200 with a GraphQL `errors` array**. Never set
  `extensions.http.status` — Apollo runs `errorPolicy: "all"` and expects to
  parse `data` and `errors` together.
- The client sends `authorization: ""` (an empty header, not an absent one)
  when logged out, so empty must be treated as missing.

## Backend

### Where the API lives

`apps/web/src/app/v1/graphql/route.ts` is three lines: it re-exports the Yoga
handler for GET, POST, and OPTIONS. Everything else is in `packages/graphql`,
which never imports Next. OPTIONS must stay exported or Next answers preflights
itself and the request never reaches Yoga.

Deliberately **no `runtime` or `dynamic` export**: nodejs is the default and
`edge` is deprecated in Next 16, POST route handlers are never cached, and
`dynamic` is removed once Cache Components is enabled.

### Database

Drizzle over Neon Postgres via `@neondatabase/serverless`. `getDb()` in
`packages/db/src/client.ts` is a lazy singleton — lazy because Next evaluates
module top-level code at build time and `neon()` throws without `DATABASE_URL`.
It is a plain function, **not** a `Proxy`; Proxy wrappers break libraries that
introspect the db object.

`neon-http` has **no transactions**. Anything that must be atomic has to be a
single SQL statement — see `submitAnswer` in `packages/graphql/src/resolvers/responses.ts`,
which is one CTE precisely because the quiz page fires every answer at once
through `Promise.all` and read-modify-write counters would lose writes.

`questions.domain` is nullable and nothing backfilled it — the bank predates
the column and no value is guessed for the rows that came over from MongoDB.
An unclassified question is left out of `User.domainAccuracy` entirely rather
than bucketed as "Uncategorized"; editors assign domains through /management.
Two things about that breakdown are deliberate and easy to misread as bugs:
`answered` counts submissions rather than distinct questions (there is no
unique constraint on `(user_id, question_id)` and `submitAnswer` always
inserts), and every pre-cutover user starts empty because the Mongo import
skipped `user_responses`.

Migrations are `drizzle-kit generate` (never `push` — the test suite replays
the generated SQL, and `push` produces no files, so the two would silently
diverge). They are applied by an explicit `pnpm db:migrate`, never from the
Vercel build, so a bad migration cannot take a deploy down. Note that
drizzle-kit does not read `.env.local`; the scripts go through `dotenv-cli`.

### Resolvers and authorization

One module per domain under `packages/graphql/src/resolvers/`. Authorization
goes through `packages/graphql/src/auth/guards.ts` (`requireAuth`,
`requireRole`, `requireSelfOrAdmin`) — no resolver hand-rolls a role check.

`getLeaderboard` is intentionally public: `/leaderboard` has no route guard on
the client, so requiring a token there would bounce every anonymous visitor to
`/login` through the error link.

`questions { createdBy { … } }` is resolved with a join in the list and single
queries rather than per row. Over `neon-http` every query is its own HTTPS
round trip, so an N+1 there is measured in seconds. The `Question.createdBy`
fallback exists only for callers that did not join.

### Auth

JWT (HS256, 1 day) in `Authorization: Bearer`, verified with an explicit
algorithm allow-list. The claim is `_id`, not `sub`, inherited from the old
backend — keep it, and keep `JWT_SECRET`, so tokens issued before the cutover
stay valid. Passwords are bcrypt at cost 10, matching the hashes imported from
MongoDB.

`register` honours an explicit `role` only when an existing ADMIN/SUPER_ADMIN
is the caller. The old backend trusted `input.role` from anonymous callers,
which let anyone self-register as an admin.

### Tests

vitest against **PGlite** — a real in-memory Postgres with the real migrations
applied, so constraints and defaults are genuinely exercised. Tests drive
`yoga.fetch()` rather than calling resolvers, so status codes, content
negotiation, and the auth context are all covered.

`packages/graphql/vitest.config.ts` inlines and dedupes the Yoga stack. This is
load-bearing: Yoga decides whether to mask an error with
`instanceof GraphQLError`, and with two copies of `graphql` in the module graph
that check fails and every deliberate message becomes "Unexpected error." The
root `pnpm.overrides` pin on `graphql@^16` exists for the same reason (Yoga 5
also rejects graphql 17, which is now npm `latest`).

## Frontend

### Everything is a client component

`apps/web/src/app/layout.tsx` is the only server component. Every page and
component under `src/app` and `src/components` is `"use client"` because they
use Apollo hooks and `AuthContext`. The one exception is the GraphQL route
handler, which is server-only by definition.

### Provider chain

`layout.tsx` → `ApolloWrapper` → `ApolloProvider` → `AuthProvider` →
`Navbar` / `main` / `Footer`.

`ApolloWrapper.tsx` holds the client. Link chain is `[errorLink, authLink, httpLink]`:

- `authLink` reads `localStorage.getItem("token")` per request.
- `errorLink` does the message matching described above.
- The endpoint is **relative** (`/v1/graphql`), same-origin. `NEXT_PUBLIC_API_URL`
  only exists to point at some other backend.
- Defaults are `network-only` for queries with `errorPolicy: "all"`, so `data`
  and `error` can both be populated — check both.

### Apollo Client 4 conventions

The root `@apollo/client` export is core only. Hooks and `ApolloProvider` come
from `@apollo/client/react`; `MockedProvider` from `@apollo/client/testing/react`.

- There is no `ApolloError`. Narrow with `CombinedGraphQLErrors.is(err)` and
  read `.errors`.
- Do not pass generics to the hooks. Type the document instead:
  `const OP: TypedDocumentNode<Result, Vars> = gql\`...\``.
- `useQuery` has no `onError` / `onCompleted`. React to `error` in an effect.
- `defaultOptions` is only accepted because `src/types/apollo.d.ts` declares it.
  Any new `ApolloClient` must pass matching `defaultOptions`.

### Auth, routes, roles

`src/contexts/AuthContext.tsx` is the single source of user state; the JWT lives
only in `localStorage`, so there is no cookie and no server-side auth. The `me`
query is skipped until the token is read in a mount effect, so `loading` is
briefly false with `user === null` — always gate on `loading`.

There is no middleware and no guard component: **each protected page guards
itself** with an effect that pushes to `/login` when `!loading && !user`.
Replicate that on new protected pages.

Roles are `USER | EDITOR | ADMIN | SUPER_ADMIN`. Client-side role checks are
cosmetic; the backend is the authority.

## Styling

Tailwind v4, no CSS modules. No `tailwind.config.ts` — everything lives in
`apps/web/src/app/styles/global.css`. Note the v4 spellings: `shadow-sm`/`shadow-xs`,
`outline-hidden`, `bg-linear-to-*`, and slash opacity (`bg-white/20`).

### The design system

The visual language is the **Drone Pilot Quiz design system**, imported from
<https://claude.ai/design/p/2c9a5234-4f17-46fb-ab75-691f0017c175>. Read its
`readme.md` before designing anything new. The short version: near-black
housing, hairline structure, `border-radius: 0` everywhere, mono uppercase
micro-labels, one orange signal accent, **no gradients, no drop shadows, and
nothing that scales or lifts on hover**. Copy is flat and technical — a quiz is
a _run_, a user an _operator_, the admin area _Control_.

`global.css` holds three things: an `@theme` block with the tokens (colours,
type ramp, tracking, containers, the two `glow` shadows), a plain `:root` block
for values Tailwind has no namespace for (`--scrim`, `--grid-overlay`, the
durations), and five `@utility` definitions — `label-mono`, `transition-fast`,
`grid-overlay`, `panel-bracket`, `focus-signal`. The design's `--black` and
`--gray-*` are renamed `ink-950` and `mute-*` so they do not clobber Tailwind's
own `black` and `gray-*`. The type
ramp deliberately overrides Tailwind's defaults (`text-base` is 15px).

The **18 components live in `apps/web/src/components/ds/`** and are re-exported
from `@/components/ds`. Reach for them before writing new markup. They are
Tailwind rewrites of the design's JSX: hover is a `hover:` variant, never
`useState`, so most of them are server-safe — only `Modal`, `FlipCard`, `Navbar`
and `AdminSidebar` carry `"use client"`. `ds/Navbar`, `ds/Footer` and
`ds/AdminSidebar` are presentational; the app-coupled wrappers that feed them
context stay at `src/components/Navbar.tsx`, `src/components/Footer.tsx` and
`src/app/management/Sidebar.tsx`. Never nest a `Button` inside a `next/link` —
use the exported `buttonClass()` on the link itself.

Fonts are Archivo + JetBrains Mono via `next/font/google` in `layout.tsx`, both
variable so no `weight` is passed. Nothing in the system is heavier than 600.

### Layout

`<main>` in `layout.tsx` is `grow` and nothing else — **each page supplies its
own `max-w-*` container and padding**, because the nav is a full-bleed sticky
64px bar and the landing hero runs edge to edge on the survey grid. (This is the
opposite of the pre-redesign rule.) Container widths are `max-w-shell` 1400,
`max-w-wide` 1120, `max-w-mid` 880, `max-w-narrow` 680, `max-w-form` 400.

The theme is **dark only** — there is no `prefers-color-scheme` branch and no
toggle. Panels butt together on a 1px hairline (`gap-px` over a
`bg-line-hairline` grid); the seam is the gutter, not whitespace.

Every route is on the design system. Nothing in `apps/web/src` should match
`rounded-*`, `shadow-{sm,md,lg,xl}`, `bg-linear-to-*`, or `scale-*` outside a
test — that grep is the standing regression check for the old language.

Two pieces are **extrapolations, not in the source design**, and are marked as
such in their own files:

- `ds/Select` — the design ships no Select on the grounds the product has none,
  but it does (role dropdowns, the role filter). It is a native `<select>`
  styled in the language; keep it native so `option` roles survive.
- `DataTable` sorting — optional `sortKey` / `sortDir` / `onSort`, header cells
  become buttons carrying `aria-sort`. The direction arrow must stay its own
  element: Testing Library matches an element's _direct_ text children, so
  nesting it keeps `getByText("Points")` working on the header.

One more trap worth knowing: `TextField` and `Select` render the required
asterisk **outside** the `<label>`. Putting it inside makes the label's text
`"Username *"`, which breaks every `getByLabelText("Username")` and makes a
screen reader announce the asterisk. The input's own `required` carries the
meaning.

## Environment

See `.env.example`. `DATABASE_URL`, `JWT_SECRET`, and the three `GOOGLE_*`
variables are required at runtime; `MONGO_URI` is only for the one-off import.
`NEXT_PUBLIC_*` variables are inlined at build time and readable client-side.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` (resolved from `apps/web`, not the repo root)
before writing any code. Heed deprecation notices.
