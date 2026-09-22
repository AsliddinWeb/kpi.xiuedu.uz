import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/profile/ProfileForm";
import { getMe } from "@/lib/auth";

export default async function ProfilePage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");

  const t = await getTranslations("profile");

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <ProfileForm user={user} />
    </div>
  );
}
