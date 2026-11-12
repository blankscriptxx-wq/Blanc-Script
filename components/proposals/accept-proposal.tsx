"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { acceptProposalAction } from "@/app/(os)/proposal/[token]/actions";

/** Accept a proposal by typing your full name. */
export function AcceptProposal({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  return (
    <form
      className="accept"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await acceptProposalAction(token, name).catch(() => null);
        setBusy(false);
        if (res?.ok) router.refresh();
        else setError(res && !res.ok ? res.error : "Something went wrong. Please try again.");
      }}
    >
      <label htmlFor="accept-name">Happy with this? Accept the proposal</label>
      <input id="accept-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full name" autoComplete="name" />
      <p className="note">
        Typing your name confirms you&rsquo;d like to go ahead on this basis. We&rsquo;ll then send your agreement and
        get you set up.
      </p>
      <button type="submit" className="btn dark" disabled={busy || name.trim().length < 3}>
        {busy ? "Accepting…" : "Accept proposal"}
      </button>
      {error ? <p className="note" role="alert">{error}</p> : null}
    </form>
  );
}
