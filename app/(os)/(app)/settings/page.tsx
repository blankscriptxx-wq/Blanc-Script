import { Check, Minus } from "lucide-react";
import { PageHeader } from "@/components/ds/page-header";
import { ThemeSwitcher } from "@/components/ds/theme-switcher";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import { WorkspaceDetailsForm } from "@/components/settings/workspace-details-form";
import { PackagesEditor } from "@/components/settings/packages-editor";
import { AddonsEditor } from "@/components/settings/addons-editor";
import { AuditLog } from "@/components/settings/audit-log";
import { Integrations } from "@/components/settings/integrations";
import { Connections } from "@/components/settings/connections";
import { DocumentTemplates } from "@/components/settings/document-templates";
import { listTemplates } from "@/lib/data/documents";
import { stripeConnectionState } from "@/lib/data/billing";
import { stripeConfigured, stripeMode } from "@/lib/payments/stripe";
import { emailConfigured, emailFrom } from "@/lib/email/send";
import { DangerZone } from "@/components/settings/danger-zone";
import { StatusPill } from "@/components/ds/status-pill";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/settings";
import { listServicePlans, type ServicePlanRow } from "@/lib/data/service-plans";
import {
  listAddOns,
  ADDON_CADENCE_LABELS,
  type AddOnRow,
} from "@/lib/data/addons";
import { listRecentActivity, type ActivityRow } from "@/lib/data/audit";
import {
  CAPABILITIES,
  INTERNAL_ROLES,
  ROLE_CAPABILITIES,
  type Capability,
  type InternalRole,
} from "@/lib/auth/roles";
import { NoAccess } from "@/components/ds/no-access";
import { followUpsEnabled } from "@/lib/data/followups";

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
  if (!(await getCurrentUser())?.capabilities.has("can_settings")) {
    return <NoAccess what="Settings" />;
  }
  const user = await getCurrentUser();
  const canSettings = user?.capabilities.has("can_settings") ?? false;
  const canViewAudit = user?.capabilities.has("can_view_audit") ?? false;
  const hasAccess = user?.hasAccess ?? false;
  const workspace = hasAccess ? await getWorkspace() : null;
  const plans: ServicePlanRow[] = hasAccess ? await listServicePlans() : [];
  const addons: AddOnRow[] = hasAccess ? await listAddOns() : [];
  const templates = hasAccess ? await listTemplates().catch(() => []) : [];
  const stripeState =
    hasAccess && user?.orgId ? await stripeConnectionState(user.orgId).catch(() => ({ connected: false })) : { connected: false };
  const followUps = hasAccess && user?.orgId ? await followUpsEnabled(user.orgId).catch(() => true) : true;
  const activity: ActivityRow[] =
    hasAccess && canViewAudit ? await listRecentActivity(50) : [];

  const gbp = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const planPrice = (p: ServicePlanRow) =>
    p.bespoke || p.pricePence == null ? "Bespoke" : gbp.format(p.pricePence / 100);

  const addonPrice = (a: AddOnRow) =>
    a.cadence === "bespoke" || a.pricePence == null
      ? "Bespoke"
      : gbp.format(a.pricePence / 100);

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

      {/* Workspace details */}
      <section className="mt-6 rounded-md border border-bs-border bg-bs-surface p-5">
        <h2 className="font-display text-h3">Workspace details</h2>
        <p className="mt-1 text-sm text-bs-muted">
          Branding and billing details used on invoices and client-facing
          documents.
          {!canSettings ? " Only owners and ops can change these." : ""}
        </p>
        {workspace && canSettings ? (
          <WorkspaceDetailsForm
            details={{
              logoUrl: workspace.logoUrl,
              vatNumber: workspace.vatNumber,
              addressText: workspace.addressText,
              billingEmail: workspace.billingEmail,
              defaultCurrency: workspace.defaultCurrency,
            }}
          />
        ) : workspace ? (
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-bs-subtle">VAT number</dt>
              <dd className="text-bs-text">{workspace.vatNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-bs-subtle">Default currency</dt>
              <dd className="text-bs-text">{workspace.defaultCurrency}</dd>
            </div>
            <div>
              <dt className="text-bs-subtle">Billing email</dt>
              <dd className="text-bs-text">{workspace.billingEmail ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-bs-subtle">Billing address</dt>
              <dd className="whitespace-pre-line text-bs-text">
                {workspace.addressText ?? "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-bs-subtle">No workspace loaded.</p>
        )}
      </section>

      {/* Service packages */}
      <section className="mt-6 rounded-md border border-bs-border bg-bs-surface p-5">
        <h2 className="font-display text-h3">Service packages</h2>
        <p className="mt-1 text-sm text-bs-muted">
          Your retainer tiers — the packages shown on Today and offered to clients.
          {!canSettings ? " Only owners and ops can change these." : ""}
        </p>
        {canSettings ? (
          <PackagesEditor plans={plans} />
        ) : plans.length > 0 ? (
          <ul className="mt-4 divide-y divide-bs-border rounded-md border border-bs-border">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-bs-text">{p.name}</span>
                  {p.mostPopular ? <StatusPill tone="gold">★ Popular</StatusPill> : null}
                  {p.bespoke ? <StatusPill tone="gold">Premium</StatusPill> : null}
                </span>
                <span className="text-sm text-bs-muted">{planPrice(p)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-bs-subtle">No packages yet.</p>
        )}
      </section>

      {/* Add-ons */}
      <section className="mt-6 rounded-md border border-bs-border bg-bs-surface p-5">
        <h2 className="font-display text-h3">Add-ons</h2>
        <p className="mt-1 text-sm text-bs-muted">
          Extra services billed on top of a retainer.
          {!canSettings ? " Only owners and ops can change these." : ""}
        </p>
        {canSettings ? (
          <AddonsEditor addons={addons} />
        ) : addons.length > 0 ? (
          <ul className="mt-4 divide-y divide-bs-border rounded-md border border-bs-border">
            {addons.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-bs-text">{a.name}</span>
                  {a.freeWithPlanCode ? (
                    <StatusPill tone="success">Free with {a.freeWithPlanCode}</StatusPill>
                  ) : null}
                </span>
                <span className="text-sm text-bs-muted">
                  {addonPrice(a)} · {ADDON_CADENCE_LABELS[a.cadence]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-bs-subtle">No add-ons yet.</p>
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

      {/* Integrations */}
      {canSettings ? (
        <section className="mt-6 rounded-md border border-bs-border bg-bs-surface p-5">
          <h2 className="font-display text-h3">Integrations</h2>
          <p className="mt-1 text-sm text-bs-muted">
            External services wired into Blanc Script OS. Connection status is
            read from the environment — no keys or secrets are shown here.
          </p>
          <Integrations />
          <Connections
            stripe={{ configured: stripeConfigured(), mode: stripeMode(), connected: stripeState.connected }}
            email={{ configured: emailConfigured(), from: emailFrom() }}
            followUps={followUps}
          />
        </section>
      ) : null}

      {/* Document templates */}
      {canSettings ? (
        <section className="mt-6 rounded-md border border-bs-border bg-bs-surface p-5">
          <h2 className="font-display text-h3">Document templates</h2>
          <p className="mt-1 text-sm text-bs-muted">
            Your service agreement and contract schedules. Create a filled-in copy for a
            client from their page; they read and accept it in their portal.
          </p>
          <DocumentTemplates templates={templates.map((t) => ({ id: t.id, name: t.name, body: t.body }))} />
        </section>
      ) : null}

      {/* Audit log */}
      {canViewAudit ? (
        <section className="mt-6 rounded-md border border-bs-border bg-bs-surface p-5">
          <h2 className="font-display text-h3">Audit log</h2>
          <p className="mt-1 text-sm text-bs-muted">
            The most recent changes across your workspace.
          </p>
          <AuditLog rows={activity} />
        </section>
      ) : null}

      {/* Danger zone */}
      {canSettings ? (
        <section className="mt-6 rounded-md border border-bs-danger/40 bg-bs-surface p-5">
          <h2 className="font-display text-h3 text-bs-danger">Danger zone</h2>
          <p className="mt-1 text-sm text-bs-muted">
            Irreversible, workspace-wide actions.
          </p>
          <DangerZone />
        </section>
      ) : null}
    </div>
  );
}
