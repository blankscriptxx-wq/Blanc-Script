"use client";
import * as React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ds/button";
import {
  updateWorkspaceDetailsAction,
  type SettingsActionState,
} from "@/app/(app)/settings/actions";

const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";
const labelCls = "block text-sm font-medium text-bs-text";

export type WorkspaceDetails = {
  logoUrl: string | null;
  vatNumber: string | null;
  addressText: string | null;
  billingEmail: string | null;
  defaultCurrency: string;
};

const CURRENCIES = ["GBP", "USD", "EUR"] as const;

export function WorkspaceDetailsForm({ details }: { details: WorkspaceDetails }) {
  const [state, action, pending] = useActionState<SettingsActionState, FormData>(
    updateWorkspaceDetailsAction,
    {},
  );

  return (
    <form action={action} className="mt-4 space-y-4">
      <label className="block space-y-1.5">
        <span className={labelCls}>Logo URL</span>
        <input
          name="logoUrl"
          type="url"
          defaultValue={details.logoUrl ?? ""}
          maxLength={500}
          placeholder="https://…/logo.png"
          className={inputCls}
        />
        <span className="block text-xs text-bs-subtle">
          Shown on invoices and client-facing documents.
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={labelCls}>VAT number</span>
          <input
            name="vatNumber"
            defaultValue={details.vatNumber ?? ""}
            maxLength={40}
            placeholder="GB123456789"
            className={inputCls}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Default currency</span>
          <select
            name="defaultCurrency"
            defaultValue={details.defaultCurrency}
            className={inputCls}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className={labelCls}>Billing email</span>
        <input
          name="billingEmail"
          type="email"
          defaultValue={details.billingEmail ?? ""}
          maxLength={160}
          placeholder="accounts@your-agency.co.uk"
          className={inputCls}
        />
      </label>

      <label className="block space-y-1.5">
        <span className={labelCls}>Billing address</span>
        <textarea
          name="addressText"
          defaultValue={details.addressText ?? ""}
          maxLength={500}
          rows={3}
          placeholder={"1 Example Street\nLondon\nEC1A 1AA"}
          className="w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-body text-bs-text outline-none placeholder:text-bs-subtle"
        />
      </label>

      {state?.error ? <p className="text-sm text-bs-danger">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-bs-success">Saved.</p> : null}
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </Button>
      </div>
    </form>
  );
}
