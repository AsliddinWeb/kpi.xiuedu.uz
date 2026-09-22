import { cookies } from "next/headers";
import type { Me } from "@/lib/auth";
import { THEME_COOKIE, type Theme } from "@/lib/theme-config";

export type { Theme };
export { THEME_COOKIE };

export function resolveTheme(user: Me | null): Theme {
  if (user?.theme_preference === "dark" || user?.theme_preference === "light") {
    return user.theme_preference;
  }
  return cookies().get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
}
