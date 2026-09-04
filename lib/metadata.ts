/**
 * Link metadata extraction.
 *
 * This is the only module in the app that talks to the outside world. It fetches
 * a URL, reads at most the first 100KB of the response, and pulls a title and a
 * preview image out of the markup with regexes. Zero dependencies.
 *
 * It never throws: every failure mode (timeout, DNS, non-2xx, non-HTML, garbage
 * markup) comes back as `{ title: null, imageUrl: null }`, because a missing
 * preview is not a fatal error for the caller.
 */

export interface UrlMetadata {
  title: string | null;
  imageUrl: string | null;
}

const EMPTY: UrlMetadata = { title: null, imageUrl: null };

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_BYTES = 100 * 1024;
const USER_AGENT =
  "PinBoardBot/1.0 (+https://example.invalid/pin-board; link preview fetcher)";

/**
 * Fetch a page and extract its Open Graph title/image, with fallbacks.
 * Resolves to `{ title: null, imageUrl: null }` on any failure.
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  try {
    const target = new URL(url);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return EMPTY;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), readTimeoutMs());

    try {
      const response = await fetch(target, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          // Many sites reject the default runtime UA outright.
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        },
      });

      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        return EMPTY;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!isHtmlContentType(contentType)) {
        await response.body?.cancel().catch(() => {});
        return EMPTY;
      }

      const html = await readCapped(response, MAX_BYTES, contentType);
      // Prefer the post-redirect URL as the base for relative image paths.
      const baseUrl = response.url || target.href;
      return extractMetadata(html, baseUrl);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return EMPTY;
  }
}

/** Read `FETCH_TIMEOUT_MS` fresh on every call; fall back to 5000. */
function readTimeoutMs(): number {
  const raw = process.env.FETCH_TIMEOUT_MS;
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function isHtmlContentType(contentType: string): boolean {
  const type = contentType.toLowerCase();
  return type.includes("text/html") || type.includes("application/xhtml+xml");
}

/**
 * Stream the body and stop once we have `limit` bytes. We never buffer a whole
 * page: big pages are truncated mid-document, which is fine because everything
 * we want lives in <head>. The reader is always cancelled so an early stop
 * releases the socket instead of leaking it.
 */
async function readCapped(
  response: Response,
  limit: number,
  contentType: string,
): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = makeDecoder(contentType);
  let received = 0;
  let text = "";

  try {
    while (received < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      const remaining = limit - received;
      const chunk =
        value.byteLength > remaining ? value.subarray(0, remaining) : value;
      received += chunk.byteLength;
      text += decoder.decode(chunk, { stream: true });
    }
    text += decoder.decode(); // flush any trailing partial code point
  } finally {
    // cancel() also releases the lock, and is a harmless no-op if we read to
    // the end. Swallow errors: we already have the bytes we care about.
    await reader.cancel().catch(() => {});
  }

  return text;
}

/** Honour `charset=` from the content-type when we can; default to UTF-8. */
function makeDecoder(contentType: string): TextDecoder {
  const match = /charset\s*=\s*"?([\w-]+)"?/i.exec(contentType);
  if (match) {
    try {
      return new TextDecoder(match[1]);
    } catch {
      // Unknown label -> fall through to UTF-8.
    }
  }
  return new TextDecoder("utf-8");
}

function extractMetadata(html: string, baseUrl: string): UrlMetadata {
  // Everything we want is in the head. Slicing there also stops a <title>
  // inside an inline <svg> in the body from winning the title fallback.
  const headEnd = html.search(/<\/head\s*>/i);
  const head = headEnd === -1 ? html : html.slice(0, headEnd);

  const title =
    cleanText(findMetaContent(head, "og:title")) ?? cleanText(findTitleTag(head));

  const imageUrl = resolveImageUrl(findMetaContent(head, "og:image"), baseUrl);

  return { title, imageUrl };
}

// One <meta ...> tag. `[^>]*` is deliberately loose: attribute order, quote
// style, and newlines inside the tag are all fine, and unclosed tags at the
// 100KB truncation point simply don't match.
const META_TAG_RE = /<meta\b[^>]*>/gi;

/**
 * Find the `content` of the first <meta> whose `property` (or `name`, which
 * plenty of sites use for og: tags) equals `key`. Attributes are pulled out
 * one at a time so their order in the tag never matters.
 */
function findMetaContent(html: string, key: string): string | null {
  META_TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = META_TAG_RE.exec(html)) !== null) {
    const tag = match[0];
    const property = getAttribute(tag, "property") ?? getAttribute(tag, "name");
    if (property !== null && property.trim().toLowerCase() === key) {
      const content = getAttribute(tag, "content");
      if (content !== null && content.trim() !== "") return content;
    }
  }
  return null;
}

/** Read one attribute value: double-quoted, single-quoted, or unquoted. */
function getAttribute(tag: string, name: string): string | null {
  const re = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'\`=<>]+))`,
    "i",
  );
  const match = re.exec(tag);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

function findTitleTag(html: string): string | null {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  return match ? match[1] : null;
}

/** Decode entities, collapse whitespace, and treat "" as absent. */
function cleanText(raw: string | null): string | null {
  if (raw === null) return null;
  const text = decodeEntities(raw).replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Single-pass entity decode for the handful that show up in titles. Single pass
 * on purpose: `&amp;lt;` must decode to `&lt;`, not to `<`.
 */
function decodeEntities(text: string): string {
  return text.replace(
    /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (whole, entity: string) => {
      if (entity.startsWith("#")) {
        const isHex = entity[1] === "x" || entity[1] === "X";
        const code = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
        if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return whole;
        try {
          return String.fromCodePoint(code);
        } catch {
          return whole; // lone surrogate, etc.
        }
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? whole;
    },
  );
}

/** Resolve against the page URL and keep only http(s). */
function resolveImageUrl(raw: string | null, baseUrl: string): string | null {
  if (raw === null) return null;
  const candidate = decodeEntities(raw).trim();
  if (candidate === "") return null;

  try {
    const resolved = new URL(candidate, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}
