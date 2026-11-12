"use client";
import * as React from "react";
import { Camera, FolderKanban, CalendarRange } from "lucide-react";
import type {
  ContentCasting,
  ProjectCasting,
  ShootCasting,
} from "@/lib/data/castings";

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/London",
});

export function TalentAppearances({
  shoots,
  projects,
  content,
}: {
  shoots: ShootCasting[];
  projects: ProjectCasting[];
  content: ContentCasting[];
}) {
  const total = shoots.length + projects.length + content.length;

  return (
    <div className="border-t border-bs-border pt-4">
      <h3 className="mb-2 text-sm font-medium text-bs-text">Appears in</h3>
      {total === 0 ? (
        <p className="text-xs text-bs-subtle">
          Not attached to any shoots, projects or content yet. Assign them from a
          shoot, project or content card.
        </p>
      ) : (
        <div className="space-y-3">
          <Group icon={<Camera className="h-3.5 w-3.5" />} label="Shoots" empty={shoots.length === 0}>
            {shoots.map((c) => (
              <AppearanceRow
                key={c.id}
                title={c.shootTitle}
                sub={[
                  c.roleName,
                  c.callTime ? timeFmt.format(new Date(c.callTime)) : null,
                ]}
              />
            ))}
          </Group>
          <Group icon={<FolderKanban className="h-3.5 w-3.5" />} label="Projects" empty={projects.length === 0}>
            {projects.map((c) => (
              <AppearanceRow key={c.id} title={c.projectName} sub={[c.roleName]} />
            ))}
          </Group>
          <Group icon={<CalendarRange className="h-3.5 w-3.5" />} label="Content" empty={content.length === 0}>
            {content.map((c) => (
              <AppearanceRow key={c.id} title={c.contentTitle} sub={[c.roleName]} />
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}

function Group({
  icon,
  label,
  empty,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (empty) return null;
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-bs-subtle">
        {icon}
        {label}
      </div>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function AppearanceRow({ title, sub }: { title: string; sub: (string | null)[] }) {
  const bits = sub.filter(Boolean) as string[];
  return (
    <li className="rounded-sm bg-bs-surface-2 px-3 py-2">
      <div className="text-sm text-bs-text">{title}</div>
      {bits.length ? (
        <div className="mt-0.5 text-xs text-bs-subtle">{bits.join(" · ")}</div>
      ) : null}
    </li>
  );
}
