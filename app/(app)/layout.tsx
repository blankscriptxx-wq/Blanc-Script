import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { NAV, SETTINGS_ITEM } from "@/lib/nav";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const allowedHrefs = [...NAV, SETTINGS_ITEM]
    .filter((i) => !i.requires || user.capabilities.has(i.requires))
    .map((i) => i.href);

  return (
    <AppShell
      user={{
        name: user.name,
        orgName: user.orgName,
        role: user.role,
        placeholder: user.placeholder,
      }}
      allowedHrefs={allowedHrefs}
    >
      {children}
    </AppShell>
  );
}
