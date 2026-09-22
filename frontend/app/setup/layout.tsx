import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { getSetupStatus } from "@/lib/setup";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");

  const status = await getSetupStatus(locale);
  if (status.setup_completed) redirect("/dashboard");
  if (user.role !== "super_admin") redirect("/dashboard");

  return <>{children}</>;
}
