/**
 * Merge fields for document templates. Write them in a template as
 * {{field_name}}; they are filled in when a document is created for a client.
 * Client-safe (no server imports) so the editor can list them.
 */
export const MERGE_FIELDS = [
  { key: "client_name", label: "Client's business name" },
  { key: "contact_name", label: "Primary contact's name" },
  { key: "contact_email", label: "Primary contact's email" },
  { key: "package_name", label: "Their package" },
  { key: "monthly_fee", label: "Monthly fee (ex VAT)" },
  { key: "start_date", label: "Date the document is created" },
  { key: "agency_name", label: "Your business name" },
  { key: "agency_address", label: "Your address (Settings)" },
  { key: "agency_email", label: "Your billing email (Settings)" },
] as const;

export type MergeKey = (typeof MERGE_FIELDS)[number]["key"];
export type MergeValues = Record<MergeKey, string>;

/** Fill {{fields}}; unknown or empty fields are left visible as [field name]. */
export function mergeTemplate(body: string, values: Partial<MergeValues>): string {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, raw: string) => {
    const key = raw.toLowerCase() as MergeKey;
    const value = values[key];
    return value && value.trim() ? value : `[${key.replace(/_/g, " ")}]`;
  });
}
