"use client";

import { useState } from "react";
import type { Pin } from "@/lib/schema";

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function relativeTime(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Cards rise in one after another on load. The stagger is capped so a long
// feed does not keep the reader waiting on the ones below the fold.
const STAGGER_MS = 45;
const MAX_STAGGERED = 12;

export default function PinCard({ pin, index }: { pin: Pin; index: number }) {
  // A remote image can 404 or be blocked; hide the slot instead of showing a
  // broken image icon.
  const [imageFailed, setImageFailed] = useState(false);
  const host = hostnameOf(pin.url);
  const showImage = pin.imageUrl !== null && !imageFailed;
  const delay = Math.min(index, MAX_STAGGERED) * STAGGER_MS;

  return (
    <li className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <a
        href={pin.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        {showImage && (
          <div className="mb-5 overflow-hidden rounded-sm bg-brown-100">
            <img
              src={pin.imageUrl as string}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="aspect-[16/9] w-full object-cover transition duration-700 ease-out group-hover:scale-[1.025]"
            />
          </div>
        )}
        <p className="text-[11px] uppercase tracking-[0.18em] text-brown-600">
          {host}
        </p>
        <h2 className="mt-2 text-xl font-light leading-snug text-brown-900 transition duration-300 group-hover:text-brown-700">
          {pin.title ?? host}
        </h2>
        {pin.note && (
          <p className="mt-3 text-sm leading-relaxed text-brown-800">
            {pin.note}
          </p>
        )}
        <p className="mt-4 text-xs text-brown-600">
          {pin.pinnedBy} &middot;{" "}
          {/* Relative time is computed from the current clock, so the server
              and client strings can differ by a second on hydration. */}
          <time
            dateTime={pin.createdAt.toISOString()}
            title={pin.createdAt.toLocaleString()}
            suppressHydrationWarning
          >
            {relativeTime(pin.createdAt)}
          </time>
        </p>
      </a>
    </li>
  );
}
