import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Breadcrumb from "@/components/dashboard/Breadcrumb";
import DashboardShell from "@/components/dashboard/DashboardShell";
import Topbar from "@/components/dashboard/Topbar";
import { ADMIN_ONLY, EMPLOYEES_VIEWERS, MANAGER_UP } from "@/components/dashboard/nav-items";
import { getArizalar } from "@/lib/arizalar";
import { getMe } from "@/lib/auth";
import { getCompanySettings } from "@/lib/company";
import { getEmployees } from "@/lib/employees";
import { getCorrectionPlans, getForceMajeureDeclarations } from "@/lib/governance";
import { getSetupStatus } from "@/lib/setup";
import { resolveTheme } from "@/lib/theme";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");

  const setup = await getSetupStatus(locale);
  if (!setup.setup_completed && (user.role === "super_admin" || user.role === "admin")) {
    redirect("/setup");
  }

  const theme = resolveTheme(user);
  const company = await getCompanySettings(locale);

  const navBadges: Record<string, number> = {};
  if (MANAGER_UP(user.role)) {
    const arizalar = await getArizalar(locale);
    const pending = arizalar.filter((a) => a.status === "submitted" || a.status === "kafedra_endorsed").length;
    if (pending > 0) navBadges.arizalar = pending;
  }
  if (ADMIN_ONLY(user.role)) {
    const [correctionPlans, forceMajeure] = await Promise.all([
      getCorrectionPlans(locale),
      getForceMajeureDeclarations(locale),
    ]);
    const activeGovernance =
      correctionPlans.filter((p) => p.status === "active").length +
      forceMajeure.filter((f) => f.status !== "resolved").length;
    if (activeGovernance > 0) navBadges.governance = activeGovernance;
  }
  if (EMPLOYEES_VIEWERS(user.role)) {
    const employees = await getEmployees(locale);
    const activeEmployees = employees.filter((e) => e.is_active).length;
    if (activeEmployees > 0) navBadges.employees = activeEmployees;
  }

  return (
    <DashboardShell
      role={user.role}
      initialCollapsed={user.sidebar_collapsed}
      brandName={company?.name ?? null}
      brandLogoUrl={company?.logo_url ?? null}
      navBadges={navBadges}
    >
      <Topbar user={user} theme={theme} brandName={company?.name ?? null} brandLogoUrl={company?.logo_url ?? null} />
      <main className="p-4 lg:p-8">
        <Breadcrumb />
        {children}
      </main>
    </DashboardShell>
  );
}
