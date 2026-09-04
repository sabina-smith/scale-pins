import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pins } from "@/lib/schema";
import PinCard from "@/components/pin-card";
import PinForm from "@/components/pin-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await db
    .select()
    .from(pins)
    .orderBy(desc(pins.createdAt))
    .limit(100);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-14 px-6 py-14 lg:grid-cols-3 lg:gap-20 lg:px-12">
      {/* Left third: identity and the paste form, pinned while the feed scrolls. */}
      <aside className="animate-fade lg:sticky lg:top-14 lg:self-start">
        <h1 className="text-[2.75rem] font-light leading-none tracking-tight text-stone-900">
          Pin Board
        </h1>
        <p className="mt-3 text-sm text-stone-500">
          Paste a link. Everyone sees it.
        </p>
        <div className="mt-12">
          <PinForm />
        </div>
      </aside>

      {/* Remaining two thirds, with the feed centred inside them. */}
      <section className="flex justify-center lg:col-span-2">
        <div className="w-full max-w-xl">
          {rows.length === 0 ? (
            <p className="animate-rise pt-2 text-sm text-stone-400">
              Nothing here yet. The first pin goes to the top.
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
