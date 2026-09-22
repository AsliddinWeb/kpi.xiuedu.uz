import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { getMe } from "@/lib/auth";
import { resolveTheme } from "@/lib/theme";
import AdminLoginForm from "./AdminLoginForm";

export default async function AdminLoginPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (user) redirect("/dashboard");
  const theme = resolveTheme(user);

  return (
    <AuthShell theme={theme} authenticated={false}>
      <AdminLoginForm />
    </AuthShell>
  );
}
