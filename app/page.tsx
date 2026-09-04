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
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pin Board</h1>
        <p className="text-sm text-gray-500">
          Paste a link to share it with everyone.
        </p>
      </header>

      <PinForm />

      {rows.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
          No pins yet. Paste a link above to start the board.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((pin) => (
            <PinCard key={pin.id} pin={pin} />
          ))}
        </ul>
      )}
    </main>
  );
}
