# Pin Board

A bare-bones internal link feed. Paste a URL and your name, it gets fetched for a title and preview image, and it shows up at the top of a shared feed everyone can see. That is the entire product.

Next.js (app router) · Postgres · Drizzle · Tailwind. No accounts — the browser remembers your name in `localStorage`. Optionally one shared password for the whole board (`PIN_BOARD_PASSWORD`), which the browser also remembers.

## Setup

1. `docker compose up -d` — starts Postgres on `localhost:5432` with a persistent volume.
2. `cp .env.example .env` — the defaults match the compose file.
3. `npm install`
4. `npm run db:migrate` — applies the SQL in `drizzle/` to the running database.
5. `npm run dev` — open <http://localhost:3000>.

`npm run build` type-checks and builds for production. If you change `lib/schema.ts`, run `npm run db:generate` to produce a new migration and commit it.

## API

Both routes live in `app/api/pins/route.ts` and are plain route handlers, so they work from `curl`.

### `POST /api/pins`

Request body:

```json
{ "url": "https://example.com/thing", "note": "optional one-liner", "pinnedBy": "Name" }
```

- `url` must parse as a URL with an `http` or `https` protocol.
- `pinnedBy` must be a non-empty string.
- `note` is optional; blank notes are stored as `null`.
- If `PIN_BOARD_PASSWORD` is set on the server, the request must carry it in an `x-pin-board-password` header or the response is `401` with `{ "error": "Wrong board password." }`. When the variable is unset the board is open.

On a validation failure the response is `400` with `{ "error": "..." }`. Otherwise the URL is fetched for `og:title` / `og:image` (a slow, dead, or bot-hostile site never fails the request — the pin is saved with `title` and `imageUrl` set to `null`), the row is inserted, and the response is `201` with the created pin:

```json
{
  "id": "5d1e7f4a-8f0b-4a1c-9e4b-2d1f3c9b7a10",
  "url": "https://example.com/thing",
  "title": "The Thing",
  "imageUrl": "https://example.com/thing.png",
  "note": "optional one-liner",
  "pinnedBy": "Name",
  "createdAt": "2026-09-03T18:20:11.483Z"
}
```

### `GET /api/pins`

Returns the 100 newest pins, newest first. No pagination, no filtering.

```json
{ "pins": [ { "id": "...", "url": "...", "title": "...", "imageUrl": "...", "note": "...", "pinnedBy": "...", "createdAt": "..." } ] }
```

### Example

```sh
curl -s -X POST http://localhost:3000/api/pins \
  -H 'Content-Type: application/json' \
  -H 'x-pin-board-password: your-board-password' \
  -d '{"url":"https://nextjs.org/blog","note":"release notes","pinnedBy":"Sabina"}'
```

## Layout

```
app/page.tsx              the feed, a server component that reads the database directly
app/api/pins/route.ts     GET and POST
components/pin-form.tsx   the paste form (client component)
components/pin-card.tsx   one pin
lib/db.ts                 drizzle client
lib/schema.ts             the pins table
lib/metadata.ts           the only code that talks to the outside world
drizzle/                  generated migrations
```

## Deploying

Live at **https://scale-pins.vercel.app**. The production instance runs on Vercel with a Neon Postgres provisioned through Vercel's marketplace, which injects `DATABASE_URL` into the project.

> **Company policy: the database is Neon, and only Neon.** ScaleVP does not permit any other database provider. Do not swap it out. Pushes to `main` deploy automatically. To change the schema:

1. Edit `lib/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`.
2. `vercel env pull .env.production.local` to get the production `DATABASE_URL`, then `DATABASE_URL=<that url> npm run db:migrate`.
3. Push.

`PIN_BOARD_PASSWORD` and `FETCH_TIMEOUT_MS` are set in the Vercel project's environment variables.

See `DECISIONS.md` for why things are the way they are.
