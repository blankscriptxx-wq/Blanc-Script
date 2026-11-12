import { SERVICE_AGREEMENT_FULL } from "@/lib/documents/templates/service-agreement";
import { SERVICE_AGREEMENT_SHORT } from "@/lib/documents/templates/service-agreement-short";

/**
 * Blanc Script's own agreements, transcribed from the studio's designed PDFs
 * and rendered to match them (see lib/documents/MARKUP.md). Added to a
 * workspace from Settings → Document templates; merge fields in
 * {{double braces}} are filled in for each client.
 */
export const STARTER_TEMPLATES: { name: string; body: string }[] = [
  { name: "Service Agreement (Full)", body: SERVICE_AGREEMENT_FULL.trim() },
  { name: "Service Agreement (Short Form)", body: SERVICE_AGREEMENT_SHORT.trim() },
];
