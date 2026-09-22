import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import GovernanceWorkspace from "@/components/governance/GovernanceWorkspace";
import { REPORTS_VIEWERS } from "@/components/dashboard/nav-items";
import { getMe } from "@/lib/auth";
import { getEmployees } from "@/lib/employees";
import { getCorrectionPlans, getForceMajeureDeclarations, getIncentives } from "@/lib/governance";

export default async function GovernancePage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (!REPORTS_VIEWERS(user.role)) redirect("/dashboard");

  const [employees, correctionPlans, forceMajeure, incentives] = await Promise.all([
    getEmployees(locale),
    getCorrectionPlans(locale),
    getForceMajeureDeclarations(locale),
    getIncentives(locale),
  ]);
  const t = await getTranslations("governance");

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <GovernanceWorkspace
        employees={employees}
        initialCorrectionPlans={correctionPlans}
        initialForceMajeure={forceMajeure}
        initialIncentives={incentives}
        viewerRole={user.role}
      />
    </div>
  );
}
