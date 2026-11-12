import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ds/button";

/**
 * Danger zone. Deliberately inert: closing a workspace is destructive and is
 * handled by Blanc Script directly, not self-service. The control is visually
 * present but disabled so there is no footgun.
 */
export function DangerZone() {
  return (
    <div className="mt-4 rounded-md border border-bs-danger/40 bg-bs-danger-soft/30 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-bs-danger" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-bs-text">Close this workspace</p>
          <p className="mt-0.5 text-sm text-bs-muted">
            Permanently closing a workspace removes every client, project and
            record. To protect your data this can&rsquo;t be done here — contact an
            owner, who can arrange it with Blanc Script.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Button type="button" variant="danger" disabled aria-disabled>
              Close workspace
            </Button>
            <span className="text-xs text-bs-subtle">
              Disabled — contact an owner to proceed.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
