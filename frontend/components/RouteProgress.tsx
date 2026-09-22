"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const key = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(key);

  function start() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setVisible(true);
    setProgress(15);
    intervalRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.1));
    }, 200);
  }

  function complete() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(100);
    setTimeout(() => setVisible(false), 200);
    setTimeout(() => setProgress(0), 400);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || anchor.target === "_blank") return;
      const currentPath = window.location.pathname + window.location.search;
      if (href === currentPath) return;
      start();
    }

    document.addEventListener("click", handleClick);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", start);
    };
  }, []);

  useEffect(() => {
    if (prevKey.current !== key) {
      complete();
      prevKey.current = key;
    }
  }, [key]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-[3px] bg-accent transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none"
      style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
    />
  );
}
