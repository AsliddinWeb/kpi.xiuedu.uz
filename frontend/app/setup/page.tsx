import { getLocale } from "next-intl/server";
import AuthShell from "@/components/auth/AuthShell";
import { getMe } from "@/lib/auth";
import { resolveTheme } from "@/lib/theme";
import SetupWizard from "./SetupWizard";

export default async function SetupPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  const theme = resolveTheme(user);

  return (
    <AuthShell theme={theme} authenticated>
      <SetupWizard />
    </AuthShell>
  );
}
