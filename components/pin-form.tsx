"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const NAME_STORAGE_KEY = "pin-board:name";
const PASSWORD_STORAGE_KEY = "pin-board:password";

// Underline-only fields: no boxes, the rule darkens on focus.
const fieldClass =
  "w-full border-0 border-b border-brown-500 bg-transparent px-0 py-2.5 text-sm text-brown-900 placeholder:text-brown-600 transition-colors duration-300 focus:border-brown-900 focus:outline-none";

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <input
        type="url"
        required
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://"
        aria-label="URL"
        className={fieldClass}
      />
      <textarea
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="A note, if you like"
        aria-label="Note"
        className={`${fieldClass} resize-none`}
      />
      <input
        type="text"
        required
        value={pinnedBy}
        onChange={(event) => setPinnedBy(event.target.value)}
        placeholder="Your name"
        aria-label="Your name"
        className={fieldClass}
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Board password"
        aria-label="Board password"
        autoComplete="off"
        className={fieldClass}
      />
      <div className="flex items-center gap-5 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="group inline-flex items-center gap-2 text-sm text-brown-900 transition disabled:text-brown-600"
        >
          <span>{submitting ? "Pinning" : "Pin it"}</span>
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-1 group-disabled:translate-x-0"
          >
            →
          </span>
        </button>
        {error && (
          <p className="animate-fade text-xs text-red-900">{error}</p>
        )}
      </div>
    </form>
  );
}
