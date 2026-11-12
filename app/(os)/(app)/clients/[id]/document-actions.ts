"use server";

import { revalidatePath } from "next/cache";
import {
  createClientDocument,
  createGeneratedAgreement,
  sendClientDocument,
  updateClientDocument,
  voidClientDocument,
} from "@/lib/data/documents";
import { assignClientUpload } from "@/lib/data/client-uploads";

export type DocResult = { ok: true; message?: string } | { ok: false; error: string };

const fail = (e: unknown, fallback: string): DocResult => ({
  ok: false,
  error: e instanceof Error ? e.message : fallback,
});

export async function createDocumentAction(clientId: string, templateId: string): Promise<DocResult> {
  try {
    await createClientDocument(clientId, templateId);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, message: "Draft created — check it, then send." };
  } catch (e) {
    return fail(e, "Could not create the document.");
  }
}

export async function saveDocumentAction(
  clientId: string,
  id: string,
  title: string,
  body: string,
): Promise<DocResult> {
  try {
    await updateClientDocument(id, { title, body });
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e, "Could not save the document.");
  }
}

export async function sendDocumentAction(clientId: string, id: string): Promise<DocResult> {
  try {
    const { emailed, emailStatus } = await sendClientDocument(id);
    revalidatePath(`/clients/${clientId}`);
    const note =
      emailed > 0
        ? `Sent — now in the portal, and emailed to ${emailed} ${emailed === 1 ? "person" : "people"}.`
        : emailStatus === "not_configured"
          ? "Sent — now in the portal. Email isn't connected yet, so let the client know."
          : emailStatus === "no_recipients"
            ? "Sent — now in the portal. Nobody has an emailed portal login yet, so let the client know."
            : "Sent — now in the portal, but the email could not be delivered.";
    return { ok: true, message: note };
  } catch (e) {
    return fail(e, "Could not send the document.");
  }
}

export async function voidDocumentAction(clientId: string, id: string): Promise<DocResult> {
  try {
    await voidClientDocument(id);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not void the document.");
  }
}

/** File a client's upload under one of their shoots or scripts ("shoot:<id>" / "script:<id>" / ""). */
export async function assignUploadAction(clientId: string, assetId: string, target: string): Promise<DocResult> {
  try {
    const [kind, id] = target.split(":");
    await assignClientUpload(assetId, {
      shootId: kind === "shoot" ? id : null,
      scriptId: kind === "script" ? id : null,
    });
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/shoots");
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not file the upload.");
  }
}

/** Write a Service Agreement for this client from their onboarding (starts as a draft). */
export async function generateAgreementAction(clientId: string): Promise<DocResult> {
  try {
    await createGeneratedAgreement(clientId);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, message: "Updated agreement sent. The previous unsigned one has been withdrawn." };
  } catch (e) {
    return fail(e, "Could not generate the agreement.");
  }
}
