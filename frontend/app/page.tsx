import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";

export default async function Home() {
  const locale = await getLocale();
  const user = await getMe(locale);
  redirect(user ? "/dashboard" : "/login");
}
