import "server-only";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  clients,
  deliverables,
  projects,
  projectTalent,
  shoots,
  talent,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { listTasksForProject, type TaskRow } from "@/lib/data/tasks";

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "complete"
  | "cancelled";
export type ShootStatus = "booked" | "on_site" | "wrapped" | "cancelled";
export type DeliverableStatus =
  | "to_film"
  | "editing"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published";

export type ProjectProfileShoot = {
  id: string;
  title: string;
  status: ShootStatus;
  scheduledAt: Date | null;
};
export type ProjectProfileTalent = {
  id: string;
  name: string;
  roleName: string | null;
};
export type ProjectProfileDeliverable = {
  id: string;
  title: string;
  status: DeliverableStatus;
};

export type ProjectProfile = {
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
    brief: string | null;
    clientId: string | null;
    clientName: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  summary: {
    tasksOpen: number;
    tasksDone: number;
    shootsCount: number;
    talentCount: number;
  };
  tasks: TaskRow[];
  shoots: ProjectProfileShoot[];
  talent: ProjectProfileTalent[];
  deliverables: ProjectProfileDeliverable[];
};

export async function getProjectProfile(
  id: string,
): Promise<ProjectProfile | null> {
  const user = await requireUser();
  const org = user.orgId;
  const db = getDb();

  const [p] = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      brief: projects.brief,
      clientId: projects.clientId,
      clientName: clients.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, id), eq(projects.orgId, org)))
    .limit(1);
  if (!p) return null;

  // Shoots booked against this project, plus the client's shoots that haven't
  // been linked to any project yet (older bookings carry only a client).
  const shootRows = await db
    .select({
      id: shoots.id,
      title: shoots.title,
      status: shoots.status,
      scheduledAt: shoots.scheduledAt,
    })
    .from(shoots)
    .where(
      and(
        eq(shoots.orgId, org),
        isNull(shoots.archivedAt),
        p.clientId
          ? or(
              eq(shoots.projectId, p.id),
              and(isNull(shoots.projectId), eq(shoots.clientId, p.clientId)),
            )
          : eq(shoots.projectId, p.id),
      ),
    )
    .orderBy(desc(shoots.scheduledAt));

  const [tasks, talentRows, deliverableRows] = await Promise.all([
    listTasksForProject(id),
    db
      .select({
        id: talent.id,
        name: talent.name,
        roleName: projectTalent.roleName,
      })
      .from(projectTalent)
      .innerJoin(talent, eq(projectTalent.talentId, talent.id))
      .where(and(eq(projectTalent.orgId, org), eq(projectTalent.projectId, id)))
      .orderBy(asc(talent.name)),
    db
      .select({
        id: deliverables.id,
        title: deliverables.title,
        status: deliverables.status,
      })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.orgId, org),
          eq(deliverables.projectId, id),
          isNull(deliverables.archivedAt),
        ),
      )
      .orderBy(desc(deliverables.createdAt)),
  ]);

  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const tasksOpen = tasks.length - tasksDone;

  return {
    project: {
      id: p.id,
      name: p.name,
      status: p.status as ProjectStatus,
      brief: p.brief,
      clientId: p.clientId,
      clientName: p.clientName,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    },
    summary: {
      tasksOpen,
      tasksDone,
      shootsCount: shootRows.length,
      talentCount: talentRows.length,
    },
    tasks,
    shoots: shootRows as ProjectProfileShoot[],
    talent: talentRows as ProjectProfileTalent[],
    deliverables: deliverableRows as ProjectProfileDeliverable[],
  };
}
