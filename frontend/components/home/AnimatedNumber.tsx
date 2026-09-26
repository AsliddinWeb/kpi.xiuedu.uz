"use client";

import { useEffect, useRef, useState } from "react";

export default function AnimatedNumber({ value, durationMs = 1000 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDone(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let raf: number;
    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setDone(true);
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          raf = requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs]);

  const decimals = value % 1 !== 0 ? 1 : 0;
  return <span ref={ref}>{(done ? value : display).toFixed(decimals)}</span>;
}
