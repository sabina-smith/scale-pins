import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pins } from "@/lib/schema";
import PinCard from "@/components/pin-card";
import PinForm from "@/components/pin-form";
import ThemeToggle from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ poster?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const poster = typeof params.poster === "string" ? params.poster.trim() : "";

  const [posters, rows] = await Promise.all([
    db
      .selectDistinct({ pinnedBy: pins.pinnedBy })
      .from(pins)
      .orderBy(asc(pins.pinnedBy)),
    db
    .select()
    .from(pins)
    .where(poster ? eq(pins.pinnedBy, poster) : undefined)
    .orderBy(desc(pins.createdAt))
    .limit(100),
  ]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-14 px-6 py-14 lg:grid-cols-3 lg:gap-20 lg:px-12">
      {/* Left third: identity and the paste form, pinned while the feed scrolls. */}
      <aside className="animate-fade lg:sticky lg:top-14 lg:self-start">
        <div className="flex items-center justify-between gap-6">
          <h1 className="text-[2.75rem] font-light leading-none tracking-tight text-brown-900">
            Pin Board
          </h1>
          <ThemeToggle />
        </div>
        <p className="mt-3 text-sm text-brown-700">
          Paste a link. Everyone sees it.
        </p>
        <div className="mt-12">
          <PinForm />
        </div>
        {posters.length > 0 && (
          <form action="/" className="mt-10 border-t border-brown-200 pt-8">
            <label
              htmlFor="poster"
              className="text-[11px] uppercase tracking-[0.18em] text-brown-600"
            >
              Filter by poster
            </label>
            <div className="mt-3 flex gap-2">
              <select
                id="poster"
                name="poster"
                defaultValue={poster}
                className="min-w-0 flex-1 rounded-sm border border-brown-200 bg-brown-50 px-3 py-2 text-sm text-brown-900 outline-none transition focus:border-brown-500"
              >
                <option value="">Everyone</option>
                {posters.map(({ pinnedBy }) => (
                  <option key={pinnedBy} value={pinnedBy}>
                    {pinnedBy}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-sm bg-brown-800 px-4 py-2 text-sm text-brown-50 transition hover:bg-brown-700 focus:outline-none focus:ring-2 focus:ring-brown-500 focus:ring-offset-2 focus:ring-offset-brown-50"
              >
                Show
              </button>
            </div>
          </form>
        )}
      </aside>

      {/* Remaining two thirds, with the feed centred inside them. */}
      <section className="flex justify-center lg:col-span-2">
        <div className="w-full max-w-xl">
          {rows.length === 0 ? (
            <p className="animate-rise pt-2 text-sm text-brown-600">
              {poster
                ? `No pins from ${poster} yet.`
                : "Nothing here yet. The first pin goes to the top."}
            </p>
          ) : (
            <ul className="space-y-14">
              {rows.map((pin, index) => (
                <PinCard key={pin.id} pin={pin} index={index} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
