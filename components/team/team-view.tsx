"use client";

import * as React from "react";
import { StatusPill } from "@/components/ds/status-pill";
import { Sheet } from "@/components/ds/sheet";
import type { MemberRow, MemberStatus } from "@/lib/data/team";
import type { Role } from "@/lib/auth/roles";

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

/** Turn a snake_case role/status key into a readable label, e.g.
 * "account_manager" → "Account manager". */
function prettify(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function TeamView({ rows }: { rows: MemberRow[] }) {
  const [selected, setSelected] = React.useState<MemberRow | null>(null);

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
            <Row label="Role">
              <StatusPill tone={ROLE_TONE[selected.role]}>{prettify(selected.role)}</StatusPill>
            </Row>
            <Row label="Status">
              <StatusPill tone={STATUS_TONE[selected.status]}>
                {prettify(selected.status)}
              </StatusPill>
            </Row>
            <Row label="Email">{selected.email ?? "—"}</Row>
            <p className="pt-2 text-xs text-bs-subtle">
              Invites, role changes and capability overrides attach here as the
              Team module comes online.
            </p>
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
