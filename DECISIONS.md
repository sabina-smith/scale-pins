# Decisions

A line per non-obvious choice, with its reason. Add to this as the app grows.

## From the brief

- **One table, `pins`, and only one table.** There is no user table, no tags table, no anything else. Every field a pin needs lives on the pin. Joins are the first thing that makes a small app feel big.
- **No auth, no sessions, no user records.** This is an internal board where everyone is trusted. The pinner types their name and the browser remembers it. Adding auth later means adding a table and a middleware, not unpicking one.
- **Metadata failures are non-fatal.** A pin is saved even when the fetch times out, 404s, or returns no og tags. The link is the thing worth keeping; the title and image are decoration. `title` and `image_url` are nullable for exactly this reason.
- **No HTML parser dependency.** `og:title`, `og:image`, and `<title>` are pulled out with regex over the first 100KB of the response. A parser would be more correct on adversarial markup, but this reads three tags out of a head, and the failure mode is a null title rather than a crash.
- **Route handlers, not server actions.** Both endpoints are callable with `curl`, which makes the app debuggable from a terminal and scriptable by anyone on the team without opening a browser.

## Made while building

- **`postgres` (postgres.js) as the driver, not `pg`.** One dependency that ships its own TypeScript types. `pg` would have meant `pg` plus `@types/pg` for the same result.
- **Tailwind v4.** This is what the current `create-next-app` scaffolds. It configures itself through `@import "tailwindcss"` in `app/globals.css`, so there is no `tailwind.config.js` — its absence is correct, not an oversight.
- **No ESLint.** Scaffolded with `--no-eslint` to hold the dependency count down. TypeScript in strict mode plus `npm run build` is the check that matters here.
- **The feed page reads the database directly instead of calling its own `GET /api/pins`.** It is a server component already running next to the database; an HTTP round trip to itself would only add latency and a failure mode. The GET endpoint exists for `curl` and for anything built against this later.
- **`export const dynamic = "force-dynamic"` on the feed page, but not on the route handler.** Pages are prerendered by default and a shared feed must never be cached. Route handlers are already uncached by default in Next 16, so the same line there would be a no-op.
- **The POST route wraps the metadata call in its own `try`/`catch`.** The fetcher already swallows every error, but "metadata never fails the request" is a promise the API makes, so the guard lives where the promise is made rather than depending on another module keeping its side of the bargain.
- **The URL is stored normalized, as `new URL(input).toString()`.** Whitespace gets trimmed and the parse is validated in the same step. It is not deduplicated — two people pinning the same link is a real thing that happens, and collapsing it would hide who pinned what.
- **`note` is stored as `NULL` when blank, never as an empty string.** One representation of "no note" means the UI has one thing to check.
- **Validation is hand-written, not Zod.** Two fields with three rules between them. A schema library would be more dependency than validation.
- **`npm audit` reports 4 moderate advisories, all from `esbuild` under `drizzle-kit`.** Not fixed: `npm audit fix --force` would pin `drizzle-kit` back to 0.18.1, a major downgrade. The advisory affects the esbuild dev server, which never runs here — `drizzle-kit` is a dev dependency used to generate and apply migrations.

## Data layer and local dev

- **`npm run db:migrate` is plain `drizzle-kit migrate`, no `--env-file`, no dotenv.** drizzle-kit 0.31 loads `.env` from the project root by itself (verified by renaming `.env` away and watching it fail). This is lightly documented behaviour that could change on upgrade; if it does, `node --env-file=.env node_modules/drizzle-kit/bin.cjs migrate` is the zero-dependency fallback. `db:generate` does not need a database at all.
- **The `globalThis` singleton in `lib/db.ts` caches the postgres.js client, not the drizzle wrapper, and only outside production.** The connection pool is the expensive thing; wrapping it in drizzle is free. This is the standard Next.js hot-reload idiom.
- **Local Postgres credentials are `pinboard`/`pinboard`/`pinboard` on the host's port 5432.** Trivial on purpose for local dev. It will collide with any other local Postgres on 5432 — change the port mapping in `docker-compose.yml` and `.env` together if that happens.
- **Only `db:generate` and `db:migrate` scripts.** No `db:push` or `db:studio`; migrations are the one workflow this app needs.

## Metadata fetcher

- **Only the markup before `</head>` is searched for tags**, falling back to the whole 100KB buffer when there is no `</head>`. This is what keeps a `<title>` inside an inline `<svg>` in the body from being mistaken for the page title.
- **A missing `Content-Type` header is treated as HTML.** Only an explicitly non-HTML type (JSON, images, PDF) is rejected. The strict choice would drop some badly configured but perfectly good pages.
- **The response charset is honoured from `Content-Type`**, falling back to UTF-8. Latin-1 pages are still common enough and it is four lines. `<meta charset>` inside the document is not read.
- **Entities are decoded in one pass, including `&nbsp;` as a plain space.** Good enough for titles and image URLs, where `&amp;` in query strings is the case that actually bites (Wikipedia and The Verge both do it).
- **Relative image URLs resolve against the final response URL after redirects**, falling back to the input URL, so a page that 301s to a new host gets images from the right host.
- **The body reader is cancelled in a `finally`, and non-2xx / non-HTML responses cancel it explicitly too.** Verified against a server that streams forever: without the cancel the socket stays open.
- **SSRF is not addressed.** Only the URL scheme is checked, so the fetcher will happily request `http://localhost:*` or a cloud metadata IP if asked. This is an internal tool behind whatever network boundary the team already has, and blocking private ranges correctly (IPv6, redirects, DNS rebinding) is a real feature with its own decisions. Flagged here so nobody assumes it exists.

## UI

- **`pin-card.tsx` is a client component.** Hiding a preview image that fails to load needs an `onError` handler, and only client components can have one. Its props are plain data so the boundary costs nothing.
- **Single-column list, `max-w-2xl`, rather than a grid.** Cards with wide preview images read better stacked; a grid is a two-file change (`page.tsx` owns the `<ul>`, `pin-card.tsx` owns the `<li>`) if that ever changes.
- **Light theme only.** The scaffold's half-finished `prefers-color-scheme` variables were removed rather than carried through every Tailwind utility. A dark mode toggle is explicitly out of scope.
- **`suppressHydrationWarning` on the `<time>` element only.** The relative string depends on the clock and the `title` tooltip on the locale, so server and client can legitimately disagree by a second or a timezone. Suppressing on that one element beats deferring the whole timestamp to an effect.
- **The name is written to `localStorage` only after a successful pin**, under the key `pin-board:name`. Typing a name and abandoning the form should not remember it.
- **The form sends a blank note as `undefined`, not `""`.** The API treats both as "no note", but an absent optional field is the more honest request body.
- **Preview images use a plain `<img loading="lazy">`, not `next/image`.** Remote hosts are arbitrary, and `next/image` would require listing every one of them in `remotePatterns`.
