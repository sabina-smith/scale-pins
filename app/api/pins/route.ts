import { timingSafeEqual } from "node:crypto";

import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { fetchUrlMetadata } from "@/lib/metadata";
import { pins } from "@/lib/schema";

const FEED_LIMIT = 100;

export async function GET() {
  const rows = await db
    .select()
    .from(pins)
    .orderBy(desc(pins.createdAt))
    .limit(FEED_LIMIT);

  return Response.json({ pins: rows });
}

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}

// One shared password for the whole board, sent as a header. When the env var
// is not set (local dev) the board is open. Constant-time compare so the
// password cannot be guessed a character at a time from response timing.
function passwordMatches(request: Request): boolean {
  const expected = process.env.PIN_BOARD_PASSWORD;
  if (!expected) return true;

  const given = Buffer.from(request.headers.get("x-pin-board-password") ?? "");
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export async function POST(request: Request) {
  if (!passwordMatches(request)) {
    return Response.json({ error: "Wrong board password." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Body must be valid JSON.");
  }

  if (typeof body !== "object" || body === null) {
    return badRequest("Body must be a JSON object.");
  }

  const { url, note, pinnedBy } = body as Record<string, unknown>;

  if (typeof url !== "string" || url.trim() === "") {
    return badRequest("A url is required.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return badRequest("That url could not be parsed.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return badRequest("Only http and https urls can be pinned.");
  }

  if (typeof pinnedBy !== "string" || pinnedBy.trim() === "") {
    return badRequest("A name is required.");
  }

  if (note !== undefined && note !== null && typeof note !== "string") {
    return badRequest("A note must be text.");
  }

  const trimmedNote = typeof note === "string" ? note.trim() : "";

  // Metadata is a nice-to-have. A site that is slow, down, or hostile to bots
  // must never stop someone from pinning a link, so failures here are dropped
  // and the pin is saved with nulls. fetchUrlMetadata already swallows its own
  // errors; this guard keeps that promise local to the route.
  let title: string | null = null;
  let imageUrl: string | null = null;
  try {
    ({ title, imageUrl } = await fetchUrlMetadata(parsedUrl.toString()));
  } catch {
    // ignored on purpose
  }

  const [pin] = await db
    .insert(pins)
    .values({
      url: parsedUrl.toString(),
      title,
      imageUrl,
      note: trimmedNote === "" ? null : trimmedNote,
      pinnedBy: pinnedBy.trim(),
    })
    .returning();

  return Response.json(pin, { status: 201 });
}
