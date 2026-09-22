"use client";

import { IconChevronRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export default function Breadcrumb() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  let path = "";
  const crumbs = segments.map((segment) => {
    path += `/${segment}`;
    const navItem = NAV_ITEMS.find((item) => item.href === path);
    const label = navItem ? t(navItem.key) : decodeURIComponent(segment).replace(/-/g, " ");
    return { label, href: path };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-text-3">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <IconChevronRight size={14} stroke={2} className="shrink-0 text-text-3" />}
            {isLast ? (
              <span className="font-medium capitalize text-text-1">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="capitalize hover:text-text-1 hover:underline">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
