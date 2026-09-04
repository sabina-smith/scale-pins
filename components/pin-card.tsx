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

export default function PinCard({ pin }: { pin: Pin }) {
  // A remote image can 404 or be blocked; hide the slot instead of showing a
  // broken image icon.
  const [imageFailed, setImageFailed] = useState(false);
  const host = hostnameOf(pin.url);
  const showImage = pin.imageUrl !== null && !imageFailed;

  return (
    <li>
      <a
        href={pin.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:border-gray-400 hover:shadow-sm"
      >
        {showImage && (
          <img
            src={pin.imageUrl as string}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-44 w-full bg-gray-100 object-cover"
          />
        )}
        <div className="space-y-1 p-4">
          <h2 className="font-medium text-gray-900">{pin.title ?? host}</h2>
          <p className="text-sm text-gray-500">{host}</p>
          {pin.note && (
            <p className="pt-1 text-sm text-gray-700">{pin.note}</p>
          )}
          <p className="pt-2 text-xs text-gray-500">
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
        </div>
      </a>
    </li>
  );
}
