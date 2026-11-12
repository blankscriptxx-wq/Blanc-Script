import { PageHeader } from "@/components/ds/page-header";
import { EmptyState } from "@/components/ds/empty-state";
import { TeamView } from "@/components/team/team-view";
import { listMembers } from "@/lib/data/team";
import { getMemberDetails, listAwaitingUsers } from "@/lib/data/team-admin";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const rows = await listMembers();
  const user = await getCurrentUser();
  const canManage = user?.capabilities.has("can_manage_users") ?? false;
  // Only load the editable detail (membership ids, overrides) for managers.
  const details = canManage ? await getMemberDetails() : [];
  const awaiting = canManage ? await listAwaitingUsers().catch(() => []) : [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Team" eyebrow="People" />
      {rows.length === 0 ? (
        <EmptyState
          title="No members yet."
          description="Workspace members appear here once they've been invited and granted a role."
        />
      ) : (
        <TeamView rows={rows} canManage={canManage} details={details} awaiting={awaiting} />
      )}
    </div>
  );
}
