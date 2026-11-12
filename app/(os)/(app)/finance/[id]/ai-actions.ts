"use server";

import { revalidatePath } from "next/cache";
import { aiConfigured, runAssist, runJson } from "@/lib/ai/claude";
import { requireUser } from "@/lib/data/clients";
import { addLineItem, syncInvoiceAmountToLines } from "@/lib/data/invoice-detail";

/**
 * AI-assisted invoice drafting for the Finance module. Each action is wrapped in
 * try/catch and always resolves to {ok:true,text} | {ok:false,error}, so the
 * AiGenerate control can render the outcome without throwing. Writes are
 * org-scoped (requireUser) and gated on the can_see_money capability; all money
 * is handled as GBP integer pence.
 */

export type AiActionResult = { ok: true; text: string } | { ok: false; error: string };

const LINE_ITEMS_SYSTEM =
  "You draft invoice line items for a creative video agency. Given a short brief, " +
  "return JSON {items:[{description, quantity, unitPounds}]} with sensible UK market " +
  "rates in POUNDS. 1-6 items.";

const TERMS_SYSTEM =
  "You draft payment terms for a UK creative video agency's invoices. Write in British " +
  "English: short, professional, plain wording (for example \"Payment due within 14 days " +
  "of the invoice date.\"). Return the terms text only — no preamble, no headings, no bullet points.";

type DraftedItem = { description: string; quantity: number; unitPounds: number };

/**
 * Draft 1–6 line items from a short brief and append them to the invoice, then
 * sync the invoice total to its lines. Returns a short confirmation.
 */
export async function draftLineItemsAction(
  invoiceId: string,
  brief: string,
): Promise<AiActionResult> {
  try {
    const user = await requireUser();
    if (!user.capabilities.has("can_see_money")) {
      return { ok: false, error: "You do not have permission to change finance records." };
    }
    if (!aiConfigured()) {
      return {
        ok: false,
        error:
          "The AI assistant isn't connected yet. Add an Anthropic API key in Settings → Integrations.",
      };
    }

    const id = invoiceId.trim();
    if (!id) return { ok: false, error: "Missing invoice." };
    const cleanBrief = brief.trim().slice(0, 2000);
    if (!cleanBrief) return { ok: false, error: "Describe the work first." };

    const drafted = await runJson<{ items: DraftedItem[] }>({
      system: LINE_ITEMS_SYSTEM,
      prompt: `Brief: ${cleanBrief}`,
    });

    const raw = Array.isArray(drafted?.items) ? drafted.items.slice(0, 6) : [];
    const items = raw
      .map((it) => ({
        description: String(it?.description ?? "").trim().slice(0, 500),
        quantity: Math.round(Number(it?.quantity)),
        unitPence: Math.round(Number(it?.unitPounds) * 100),
      }))
      .filter(
        (it) =>
          it.description.length > 0 &&
          Number.isInteger(it.quantity) &&
          it.quantity >= 1 &&
          Number.isInteger(it.unitPence) &&
          it.unitPence >= 0,
      );

    if (items.length === 0) {
      return { ok: false, error: "The assistant didn't return any usable line items. Try a clearer brief." };
    }

    for (const it of items) {
      await addLineItem({
        invoiceId: id,
        description: it.description,
        quantity: it.quantity,
        unitPence: it.unitPence,
      });
    }
    await syncInvoiceAmountToLines(id);

    revalidatePath(`/finance/${id}`);
    revalidatePath("/finance");

    const n = items.length;
    return { ok: true, text: `Added ${n} line item${n === 1 ? "" : "s"}.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not draft line items." };
  }
}

/**
 * Draft short, professional payment terms. Read-only: returns the drafted text
 * for the user to copy into the invoice's terms field via the Edit dialog.
 */
export async function draftTermsAction(invoiceId: string): Promise<AiActionResult> {
  try {
    await requireUser();
    if (!aiConfigured()) {
      return {
        ok: false,
        error:
          "The AI assistant isn't connected yet. Add an Anthropic API key in Settings → Integrations.",
      };
    }
    if (!invoiceId.trim()) return { ok: false, error: "Missing invoice." };

    const text = await runAssist({
      system: TERMS_SYSTEM,
      prompt: "Draft standard payment terms for this invoice.",
      maxTokens: 300,
    });
    if (!text) return { ok: false, error: "The assistant didn't return any terms. Try again." };
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not draft terms." };
  }
}
