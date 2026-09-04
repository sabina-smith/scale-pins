# Pin Board

A bare-bones internal link feed. Paste a URL and your name, it gets fetched for a title and preview image, and it shows up at the top of a shared feed everyone can see. That is the entire product.

Next.js (app router) · Postgres · Drizzle · Tailwind. No auth, no accounts — the browser remembers your name in `localStorage`.

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

See `DECISIONS.md` for why things are the way they are.
