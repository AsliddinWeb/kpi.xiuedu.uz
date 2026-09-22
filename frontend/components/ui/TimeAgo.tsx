"use client";

import { useEffect, useState } from "react";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

function computeTimeAgo(iso: string, locale: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, secondsInUnit] of UNITS) {
    const value = Math.floor(seconds / secondsInUnit);
    if (Math.abs(value) >= 1) return rtf.format(-value, unit);
  }
  return rtf.format(0, "second");
}

/**
 * Intl.RelativeTimeFormat can resolve differently between the server's Node
 * runtime and the browser for some locales, which throws a hydration
 * mismatch if rendered directly during SSR. This renders a locale-independent
 * placeholder (identical on server and first client paint) and swaps in the
 * localized relative time only after mount.
 */
export default function TimeAgo({ iso, locale, className }: { iso: string; locale: string; className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={className}>{new Date(iso).toISOString().slice(0, 10)}</span>;
  }

  return (
    <span className={className} title={new Date(iso).toLocaleString(locale)}>
      {computeTimeAgo(iso, locale)}
    </span>
  );
}
