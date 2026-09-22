import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import RectorDashboard from "@/components/dashboard/RectorDashboard";
import WelcomeHero from "@/components/dashboard/WelcomeHero";
import { RECTOR_UP } from "@/components/dashboard/nav-items";
import { getMe } from "@/lib/auth";
import { getOrganizationSummary, getRectorSummary, getTeamSummary } from "@/lib/dashboard";
import { getMyKpiResults } from "@/lib/kpiResults";

export default async function DashboardPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");

  let content: React.ReactNode;
  if (RECTOR_UP(user.role)) {
    const summary = await getRectorSummary(locale);
    content = <RectorDashboard locale={locale} summary={summary} />;
  } else if (user.role === "super_admin" || user.role === "admin") {
    const summary = await getOrganizationSummary(locale);
    content = <AdminDashboard summary={summary} />;
  } else if (user.role === "manager") {
    const team = await getTeamSummary(locale);
    content = <ManagerDashboard team={team} />;
  } else {
    const results = await getMyKpiResults(locale, user.id);
    content = <EmployeeDashboard results={results} />;
  }

  return (
    <div className="space-y-6">
      <WelcomeHero fullName={user.full_name} role={user.role} />
      {content}
    </div>
  );
}
