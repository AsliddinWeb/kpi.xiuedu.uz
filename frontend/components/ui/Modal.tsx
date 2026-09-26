"use client";

import { IconX } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const firstField = panelRef.current?.querySelector<HTMLElement>("input, textarea, select");
    firstField?.focus();
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-up"
        style={{ animationDuration: "150ms" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-fade-up relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg"
        style={{ animationDuration: "200ms" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-1">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-alt hover:text-text-1"
          >
            <IconX size={18} stroke={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
