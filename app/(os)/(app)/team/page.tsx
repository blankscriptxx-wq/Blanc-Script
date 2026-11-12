import { PageHeader } from "@/components/ds/page-header";
import { EmptyState } from "@/components/ds/empty-state";
import { TeamView } from "@/components/team/team-view";
import { listMembers } from "@/lib/data/team";
import { getMemberDetails, listAwaitingUsers, listPendingInvites, listMemberSecurity } from "@/lib/data/team-admin";
import { TeamSecurity } from "@/components/team/team-security";
import { InviteMember } from "@/components/team/invite-member";
import { getCurrentUser } from "@/lib/auth/session";
import { NoAccess } from "@/components/ds/no-access";

export const metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  if (!(await getCurrentUser())?.capabilities.has("can_manage_users")) {
    return <NoAccess what="Team" />;
  }
  const rows = await listMembers();
  const user = await getCurrentUser();
  const canManage = user?.capabilities.has("can_manage_users") ?? false;
  // Only load the editable detail (membership ids, overrides) for managers.
  const details = canManage ? await getMemberDetails() : [];
  const awaiting = canManage ? await listAwaitingUsers().catch(() => []) : [];
  const pending = canManage ? await listPendingInvites().catch(() => []) : [];
  const security = canManage ? await listMemberSecurity().catch(() => []) : [];

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
      {canManage ? <TeamSecurity members={security} canReset={user?.role === "owner"} /> : null}
      {canManage ? <InviteMember pending={pending} canInviteOwner={user?.role === "owner"} /> : null}
    </div>
  );
}
