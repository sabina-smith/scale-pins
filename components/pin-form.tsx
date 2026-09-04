"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const NAME_STORAGE_KEY = "pin-board:name";
const PASSWORD_STORAGE_KEY = "pin-board:password";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none";

export default function PinForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [pinnedBy, setPinnedBy] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read in an effect, not during render: localStorage does not exist on the
  // server, and prefilling during render would cause a hydration mismatch.
  useEffect(() => {
    const savedName = localStorage.getItem(NAME_STORAGE_KEY);
    if (savedName) setPinnedBy(savedName);
    const savedPassword = localStorage.getItem(PASSWORD_STORAGE_KEY);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/pins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-pin-board-password": password,
        },
        body: JSON.stringify({
          url,
          note: note.trim() === "" ? undefined : note,
          pinnedBy,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not save that pin. Please try again.");
        return;
      }

      localStorage.setItem(NAME_STORAGE_KEY, pinnedBy);
      localStorage.setItem(PASSWORD_STORAGE_KEY, password);
      setUrl("");
      setNote("");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      <input
        type="url"
        required
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://example.com"
        aria-label="URL"
        className={inputClass}
      />
      <textarea
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Note (optional)"
        aria-label="Note"
        className={inputClass}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          required
          value={pinnedBy}
          onChange={(event) => setPinnedBy(event.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          className={inputClass}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Board password"
          aria-label="Board password"
          autoComplete="off"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {submitting ? "Pinning…" : "Pin it"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
