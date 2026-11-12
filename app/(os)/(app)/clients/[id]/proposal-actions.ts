"use server";

import { revalidatePath } from "next/cache";
import type { ProposalContent } from "@/lib/db/schema";
import { createProposal, deleteProposal, draftProposalWithAI, saveProposal, sendProposal } from "@/lib/data/proposals";

export type ProposalResult =
  | { ok: true; message: string; id?: string; url?: string; content?: ProposalContent }
  | { ok: false; error: string };

const fail = (e: unknown, fallback: string): ProposalResult => {
  if (e && typeof e === "object" && "issues" in e) {
    const issue = (e as { issues: { message: string; path: (string | number)[] }[] }).issues[0];
    return { ok: false, error: issue ? `${issue.message}${issue.path.length ? ` (${issue.path.join(" › ")})` : ""}` : fallback };
  }
  return { ok: false, error: e instanceof Error ? e.message : fallback };
};

export async function createProposalAction(clientId: string): Promise<ProposalResult> {
  try {
    const { id } = await createProposal(clientId);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, message: "Proposal created.", id };
  } catch (e) {
    return fail(e, "Could not create the proposal.");
  }
}

export async function saveProposalAction(clientId: string, id: string, title: string, content: ProposalContent): Promise<ProposalResult> {
  try {
    await saveProposal(id, title, content);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/clients/${clientId}/proposals/${id}`);
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e, "Could not save the proposal.");
  }
}

const EMAIL_NOTE: Record<string, string> = {
  sent: "Proposal sent by email.",
  failed: "Published, but the email failed to send — copy the link and send it yourself.",
  not_configured: "Published. Email isn't connected yet, so copy the link and send it yourself.",
  no_recipients: "Published. This client has no contact email yet, so copy the link and send it yourself.",
};

export async function sendProposalAction(clientId: string, id: string): Promise<ProposalResult> {
  try {
    const res = await sendProposal(id);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/clients/${clientId}/proposals/${id}`);
    return { ok: true, message: EMAIL_NOTE[res.emailStatus] ?? "Published.", url: res.url };
  } catch (e) {
    return fail(e, "Could not send the proposal.");
  }
}

export async function deleteProposalAction(clientId: string, id: string): Promise<ProposalResult> {
  try {
    await deleteProposal(id);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, message: "Proposal deleted." };
  } catch (e) {
    return fail(e, "Could not delete the proposal.");
  }
}

export async function draftProposalAction(clientId: string, id: string, brief: string): Promise<ProposalResult> {
  try {
    const content = await draftProposalWithAI(id, brief);
    revalidatePath(`/clients/${clientId}/proposals/${id}`);
    return { ok: true, message: "Drafted. Read it through and edit anything before you send it.", content };
  } catch (e) {
    return fail(e, "The AI couldn't draft this. Please try again.");
  }
}
