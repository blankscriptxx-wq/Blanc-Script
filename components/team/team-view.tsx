"use client";

import * as React from "react";
import { useActionState } from "react";
import { StatusPill } from "@/components/ds/status-pill";
import { Sheet } from "@/components/ds/sheet";
import { cn } from "@/lib/cn";
import type { MemberRow, MemberStatus } from "@/lib/data/team";
import type { MemberDetail } from "@/lib/data/team-admin";
import { INTERNAL_ROLES, CAPABILITIES } from "@/lib/auth/roles";
import type { Role, Capability } from "@/lib/auth/roles";
import {
  changeRoleAction,
  toggleCapabilityAction,
  type TeamActionState,
} from "@/app/(os)/(app)/team/actions";

const ROLE_TONE: Record<Role, React.ComponentProps<typeof StatusPill>["tone"]> = {
  owner: "accent",
  ops: "info",
  account_manager: "info",
  editor: "neutral",
  filmer: "neutral",
  client_user: "neutral",
  talent_user: "neutral",
};

const STATUS_TONE: Record<MemberStatus, React.ComponentProps<typeof StatusPill>["tone"]> = {
  active: "success",
  invited: "warning",
  suspended: "danger",
};

/** Human labels for each capability (mirrors the Settings reference matrix). */
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

/** Turn a snake_case role/status key into a readable label, e.g.
 * "account_manager" → "Account manager". */
function prettify(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function TeamView({
  rows,
  canManage = false,
  details = [],
}: {
  rows: MemberRow[];
  canManage?: boolean;
  details?: MemberDetail[];
}) {
  const [selected, setSelected] = React.useState<MemberRow | null>(null);

  const detailByUser = React.useMemo(
    () => new Map(details.map((d) => [d.userId, d])),
    [details],
  );
  const detail = selected ? detailByUser.get(selected.userId) ?? null : null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-bs-muted">
          {rows.length} {rows.length === 1 ? "member" : "members"}
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-bs-border bg-bs-surface">
        <table className="w-full text-left text-body">
          <thead className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
            <tr>
              <th className="px-4 py-2.5 font-medium">Member</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.userId}
                onClick={() => setSelected(r)}
                className="cursor-pointer border-b border-bs-border last:border-0 transition-colors hover:bg-bs-surface-2"
              >
                <td className="px-4 py-3 font-medium text-bs-text">{r.name ?? "—"}</td>
                <td className="px-4 py-3 text-bs-muted">{r.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={ROLE_TONE[r.role]}>{prettify(r.role)}</StatusPill>
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={STATUS_TONE[r.status]}>{prettify(r.status)}</StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        eyebrow="Member"
        title={selected?.name ?? selected?.email ?? ""}
      >
        {selected ? (
          <div className="space-y-4">
            {canManage && detail ? (
              <RoleEditor detail={detail} />
            ) : (
              <Row label="Role">
                <StatusPill tone={ROLE_TONE[selected.role]}>
                  {prettify(selected.role)}
                </StatusPill>
              </Row>
            )}

            <Row label="Status">
              <StatusPill tone={STATUS_TONE[selected.status]}>
                {prettify(selected.status)}
              </StatusPill>
            </Row>
            <Row label="Email">{selected.email ?? "—"}</Row>

            {canManage && detail ? (
              <CapabilityEditor detail={detail} />
            ) : (
              <p className="pt-2 text-xs text-bs-subtle">
                Invites, role changes and capability overrides attach here as the
                Team module comes online.
              </p>
            )}
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-bs-border pb-3 last:border-0">
      <span className="text-sm text-bs-subtle">{label}</span>
      <span className="text-sm text-bs-text">{children}</span>
    </div>
  );
}

/** Editable role <select> wired to changeRoleAction. */
function RoleEditor({ detail }: { detail: MemberDetail }) {
  const [state, formAction, pending] = useActionState<TeamActionState, FormData>(
    changeRoleAction,
    {},
  );

  return (
    <div className="border-b border-bs-border pb-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-bs-subtle">Role</span>
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="membershipId" value={detail.membershipId} />
          <select
            name="role"
            defaultValue={detail.role}
            disabled={pending}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="h-8 rounded-sm border border-bs-border-strong bg-bs-surface px-2 pr-7 text-sm text-bs-text outline-none disabled:opacity-50"
          >
            {INTERNAL_ROLES.map((role) => (
              <option key={role} value={role}>
                {prettify(role)}
              </option>
            ))}
          </select>
        </form>
      </div>
      {state?.error ? (
        <p className="mt-1.5 text-right text-xs text-bs-danger">{state.error}</p>
      ) : null}
    </div>
  );
}

/** Per-capability override controls (on / off / use role default). */
function CapabilityEditor({ detail }: { detail: MemberDetail }) {
  const capByKey = React.useMemo(
    () => new Map(detail.capabilities.map((c) => [c.capability, c])),
    [detail],
  );

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-bs-text">Capabilities</span>
        <span className="text-xs text-bs-subtle">On · Off · Role default</span>
      </div>
      <div className="divide-y divide-bs-border rounded-md border border-bs-border">
        {CAPABILITIES.map((capability) => {
          const cap = capByKey.get(capability);
          if (!cap) return null;
          return (
            <CapabilityRow
              key={capability}
              membershipId={detail.membershipId}
              capability={capability}
              label={CAP_LABELS[capability]}
              effective={cap.effective}
              overridden={cap.overridden}
              overrideValue={cap.overrideValue}
            />
          );
        })}
      </div>
    </div>
  );
}

function CapabilityRow({
  membershipId,
  capability,
  label,
  effective,
  overridden,
  overrideValue,
}: {
  membershipId: string;
  capability: Capability;
  label: string;
  effective: boolean;
  overridden: boolean;
  overrideValue: boolean | null;
}) {
  // Which segment is currently active.
  const active: "on" | "off" | "default" = !overridden
    ? "default"
    : overrideValue
      ? "on"
      : "off";

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm text-bs-text">{label}</div>
        <div className="text-xs text-bs-subtle">
          {overridden ? "Overridden" : "Role default"} ·{" "}
          {effective ? "Granted" : "Not granted"}
        </div>
      </div>
      <form action={toggleCapabilityAction} className="flex shrink-0 overflow-hidden rounded-sm border border-bs-border-strong">
        <input type="hidden" name="membershipId" value={membershipId} />
        <input type="hidden" name="capability" value={capability} />
        <Segment name="on" label="On" active={active === "on"} />
        <Segment name="off" label="Off" active={active === "off"} />
        <Segment name="default" label="Default" active={active === "default"} />
      </form>
    </div>
  );
}

function Segment({
  name,
  label,
  active,
}: {
  name: "on" | "off" | "default";
  label: string;
  active: boolean;
}) {
  return (
    <button
      type="submit"
      name="value"
      value={name}
      aria-pressed={active}
      className={cn(
        "border-r border-bs-border-strong px-2 py-1 text-xs transition-colors last:border-r-0",
        active
          ? "bg-bs-primary text-bs-on-accent"
          : "bg-bs-surface text-bs-muted hover:bg-bs-surface-2",
      )}
    >
      {label}
    </button>
  );
}
