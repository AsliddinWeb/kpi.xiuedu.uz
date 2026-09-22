"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme-config";

type Props = {
  theme: Theme;
  authenticated: boolean;
};

export default function ThemeToggle({ theme, authenticated }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000`;

    if (authenticated) {
      setPending(true);
      try {
        await fetch("/api/v1/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ theme_preference: next }),
        });
      } finally {
        setPending(false);
      }
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="flex items-center justify-center rounded p-1.5 text-text-2 hover:bg-surface-alt hover:text-text-1 disabled:opacity-50"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <IconSun size={18} stroke={2} /> : <IconMoon size={18} stroke={2} />}
    </button>
  );
}
