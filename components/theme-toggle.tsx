"use client";

import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "pin-board:theme";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const dark = savedTheme === "dark";
    document.documentElement.classList.toggle("theme-dark", dark);
    setIsDark(dark);
  }, []);

  function toggleTheme() {
    const dark = !isDark;
    document.documentElement.classList.toggle("theme-dark", dark);
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    setIsDark(dark);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex size-9 items-center justify-center rounded-full border border-brown-200 bg-brown-50 text-brown-800 transition hover:border-brown-400 hover:text-brown-900 focus:outline-none focus:ring-2 focus:ring-brown-500 focus:ring-offset-2 focus:ring-offset-white"
    >
      {isDark ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="size-4"
        >
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.72 5.28l-1.42 1.42M6.7 17.3l-1.42 1.42M18.72 18.72l-1.42-1.42M6.7 6.7 5.28 5.28" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="size-4"
        >
          <path d="M20.4 15.1A8.4 8.4 0 0 1 8.9 3.6 8.4 8.4 0 1 0 20.4 15.1Z" />
        </svg>
      )}
      <span className="sr-only">{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
