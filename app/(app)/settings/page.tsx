import { PageHeader } from "@/components/ds/page-header";
import { ThemeSwitcher } from "@/components/ds/theme-switcher";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" eyebrow="Workspace" />

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

      <div className="mt-6 rounded-md border border-dashed border-bs-border bg-bs-surface px-6 py-12 text-center">
        <p className="font-serif text-h3 italic text-bs-text">More settings arrive in Milestone 2.</p>
        <p className="mt-2 text-sm text-bs-muted">
          Company details, team, roles & capabilities, integrations and billing.
        </p>
      </div>
    </div>
  );
}
