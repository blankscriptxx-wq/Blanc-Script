import Link from "next/link";
import { Lock } from "lucide-react";

/** Shown when someone opens a page their role doesn't include. */
export function NoAccess({ what = "this page" }: { what?: string }) {
  return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
      <div>
        <Lock className="mx-auto h-8 w-8 text-bs-subtle" />
        <h1 className="mt-4 font-display text-h1 text-bs-text">You don&rsquo;t have access to {what}</h1>
        <p className="mt-2 text-sm text-bs-muted">
          Your role doesn&rsquo;t include it. If you need it, ask a workspace owner.
        </p>
        <Link href="/today" className="mt-5 inline-block text-sm font-medium text-bs-primary hover:underline">
          Back to Today
        </Link>
      </div>
    </div>
  );
}
