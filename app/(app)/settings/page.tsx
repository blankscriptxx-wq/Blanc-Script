import { Check, Minus } from "lucide-react";
import { PageHeader } from "@/components/ds/page-header";
import { ThemeSwitcher } from "@/components/ds/theme-switcher";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/settings";
import {
  CAPABILITIES,
  INTERNAL_ROLES,
  ROLE_CAPABILITIES,
  type Capability,
  type InternalRole,
} from "@/lib/auth/roles";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<InternalRole, string> = {
  owner: "Owner",
  ops: "Ops",
  account_manager: "Account mgr",
  editor: "Editor",
  filmer: "Filmer",
};

const CAP_LABELS: Record<Capability, string> = {
  can_see_money: "See revenue & invoices",
  can_see_margin: "See cost & margin",
  can_invoice: "Raise invoices",
  can_edit_fees: "Edit fees",
  can_contract: "Send contracts",
  can_see_staff_pay: "See staff pay",
  can_see_actor_pay: "See talent pay",
  can_pay_team: "Prepare pay runs",
  can_approve_pay: "Approve & release pay",
  can_manage_users: "Manage users",
  can_settings: "Change settings",
  can_manage_client_logins: "Manage client logins",
  can_view_audit: "View audit log",
  can_archive: "Archive records",
  can_erase: "Erase records",
  can_act: "Create & edit records",
  can_publish: "Publish content",
  can_deliver: "Deliver to clients",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const canSettings = user?.capabilities.has("can_settings") ?? false;
  const workspace = user?.hasAccess ? await getWorkspace() : null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" eyebrow="Workspace" />

      {/* Appearance */}
      <section className="rounded-md border border-bs-border bg-bs-surface p-5">
        <h2 className="font-display text-h3">Appearance</h2>
        <p className="mt-1 text-sm text-bs-muted">
          Choose how Blanc Script OS looks. Light and Dark follow your device by
          default; Liquid Glass is a translucent, futuristic surface.
        </p>
        <div className="mt-4">
          <ThemeSwitcher showLabels />
        </div>
      </section>

      {/* Workspace */}
      <section className="mt-6 rounded-md border border-bs-border bg-bs-surface p-5">
        <h2 className="font-display text-h3">Workspace</h2>
        <p className="mt-1 text-sm text-bs-muted">
          Your agency&rsquo;s name across the OS.
          {!canSettings ? " Only owners and ops can change these." : ""}
        </p>
        {workspace && canSettings ? (
          <WorkspaceForm name={workspace.name} slug={workspace.slug} />
        ) : workspace ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-h3 text-bs-text">{workspace.name}</span>
            <code className="rounded-sm bg-bs-surface-2 px-2 py-0.5 text-sm text-bs-muted">
              {workspace.slug}
            </code>
          </div>
        ) : (
          <p className="mt-4 text-sm text-bs-subtle">No workspace loaded.</p>
        )}
      </section>

      {/* Roles & capabilities */}
      <section className="mt-6 rounded-md border border-bs-border bg-bs-surface p-5">
        <h2 className="font-display text-h3">Roles &amp; capabilities</h2>
        <p className="mt-1 text-sm text-bs-muted">
          The default access each internal role carries. Individual people can be
          granted or revoked capabilities one by one from the Team screen.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-bs-border text-xs uppercase tracking-wide text-bs-subtle">
                <th className="py-2.5 pr-4 font-medium">Capability</th>
                {INTERNAL_ROLES.map((r) => (
                  <th key={r} className="px-2 py-2.5 text-center font-medium">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap) => (
                <tr
                  key={cap}
                  className="border-b border-bs-border last:border-0"
                >
                  <td className="py-2 pr-4 text-bs-text">{CAP_LABELS[cap]}</td>
                  {INTERNAL_ROLES.map((role) => {
                    const has = ROLE_CAPABILITIES[role].includes(cap);
                    return (
                      <td key={role} className="px-2 py-2 text-center">
                        {has ? (
                          <Check className="mx-auto h-4 w-4 text-bs-success" />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-bs-subtle/50" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-bs-subtle">
          Client and talent portal users carry none of these — their access is
          scoped to their own records only.
        </p>
      </section>
    </div>
  );
}
