import { SERVICE_AGREEMENT_FULL } from "@/lib/documents/templates/service-agreement";

/**
 * Builds a Service Agreement for one client from what was agreed at
 * onboarding. The design and the Studio's standard terms (Sections 1 and
 * 5–17) are the studio's own, untouched. Sections 2–4 and the signing-page
 * summary are written from the client's actual details, so there are no blank
 * lines: anything the client doesn't have (a company number, a minimum term…)
 * is simply left out. Client-safe and pure — no database access here.
 */

export const AGREEMENT_PLATFORMS = ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube", "Website"] as const;
export const AGREEMENT_SERVICES = [
  "Content strategy",
  "Planning",
  "Creative direction",
  "Scriptwriting",
  "Filming",
  "Photography",
  "Editing",
  "Motion graphics",
  "Colour grading",
  "Publishing",
  "Community management",
  "Paid advertising",
  "Consultation",
  "Talent / models",
  "Location sourcing",
] as const;

export type AgreementData = {
  clientName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyNumber: string;
  registeredAddress: string;
  billingAddress: string;
  engagement: "retainer" | "project";
  packageName: string;
  projectName: string;
  /** Monthly retainer or total project fee, in pence. */
  feePence: number;
  addOns: { name: string; pricePence: number; cadence: "monthly" | "one_off" }[];
  deliverables: string[];
  platforms: string[];
  services: string[];
  exclusions: string;
  minimumTermMonths: number | null;
  startDate: Date;
  paymentMethod: "card" | "cash";
};

const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
const longDate = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" }).format(d);

/** Text typed by staff must never be read as markup. */
const safe = (s: string) =>
  s
    .replace(/[\r\n]+/g, ", ")
    .replace(/\|/g, "/")
    .replace(/::/g, ":")
    .replace(/^[@\-•\s]+/, "")
    .trim();

const field = (label: string, value: string, wide = false) => (value ? `@field ${label} :: ${safe(value)}${wide ? " | span=2" : ""}` : "");

function checks(title: string, options: readonly string[], chosen: string[]): string[] {
  const set = new Set(chosen.map((c) => c.toLowerCase()));
  if (!options.some((o) => set.has(o.toLowerCase()))) return [];
  return [`@checks 3 | ${title}`, ...options.map((o) => `[${set.has(o.toLowerCase()) ? "x" : " "}] ${o}`), "@endchecks"];
}

/** "8 short-form videos a month" → name "Short-form videos a month", value "8". */
function deliverableRow(line: string): string {
  const text = safe(line).replace(/[()]/g, "");
  const m = /^(\d+(?:\s?[–-]\s?\d+)?)\s*(?:x|×)?\s+(.+)$/i.exec(text);
  if (!m) return `${text} :: Included`;
  const name = m[2].charAt(0).toUpperCase() + m[2].slice(1);
  return `${name} :: ${m[1]}`;
}

export function generateAgreement(d: AgreementData): string {
  const pages = SERVICE_AGREEMENT_FULL.trim().split("\n@page\n");
  const retainer = d.engagement === "retainer";
  const fee = retainer ? `${gbp(d.feePence)} a month` : gbp(d.feePence);
  const reference = retainer ? d.packageName : d.projectName;

  // Cover
  pages[0] = pages[0].replace(
    /^@party .*$/m,
    `@party client=${safe(d.clientName)} | date=${longDate(d.startDate)} | reference=${safe(reference)}`,
  );

  // Section 2 — Client information: only what we actually hold.
  pages[3] = [
    "@section 02 | SECTION | Client information",
    "@intro The details below identify the contracting party and the engagement.",
    "@fields 2",
    field("COMPANY NAME", d.clientName),
    field("CONTACT NAME", d.contactName),
    field("COMPANY NUMBER", d.companyNumber),
    field("PROJECT NAME", retainer ? "" : d.projectName),
    field("REGISTERED ADDRESS", d.registeredAddress, true),
    field("BILLING ADDRESS", d.billingAddress, true),
    field("EMAIL", d.contactEmail),
    field("TELEPHONE", d.contactPhone),
    field("CONTRACT START DATE", longDate(d.startDate)),
    field("ENGAGEMENT TYPE", retainer ? "Retainer" : "Project"),
    field("MINIMUM TERM (MONTHS)", retainer && d.minimumTermMonths ? String(d.minimumTermMonths) : ""),
    field(retainer ? "MONTHLY RETAINER (EXCL. VAT)" : "PROJECT FEE (EXCL. VAT)", fee),
    field("PAYMENT METHOD", d.paymentMethod === "cash" ? "Cash or bank transfer" : "Card, through the client portal"),
    "@endfields",
    "@callout red | ACCURACY OF INFORMATION :: The Client warrants that the information provided in this section is accurate and complete, and will notify the Studio in writing of any material change within ten Business Days.",
  ]
    .filter(Boolean)
    .join("\n");

  // Section 3 — Scope of services
  const platforms = checks("PLATFORMS", AGREEMENT_PLATFORMS, d.platforms);
  const services = checks("SERVICES", AGREEMENT_SERVICES, d.services);
  const addOns = d.addOns
    .filter((a) => a.name.trim())
    .map((a) => `- ${safe(a.name)} — ${gbp(a.pricePence)}${retainer ? (a.cadence === "monthly" ? " a month" : " (one-off)") : ""}`);
  const scopeFields = [
    field(retainer ? "PACKAGE" : "PROJECT", retainer ? d.packageName : d.projectName, true),
    retainer && addOns.length ? `@field ADDITIONAL SERVICES AGREED IN WRITING :: ${addOns.join("\n")} | span=2` : "",
    field("EXCLUSIONS", d.exclusions, true),
  ].filter(Boolean);
  pages[4] = [
    "@section 03 | SECTION | Scope of services",
    "@intro The platforms and services included in this engagement. Anything not selected is outside scope and will be quoted separately.",
    ...platforms,
    ...(platforms.length && services.length ? ["@rule"] : []),
    ...services,
    ...((platforms.length || services.length) && scopeFields.length ? ["@rule"] : []),
    ...(scopeFields.length ? ["@fields 2", ...scopeFields, "@endfields"] : []),
    "@callout amber | SCOPE CHANGES :: Any work falling outside the selected scope constitutes a variation. The Studio will provide a written estimate before commencing, and no variation is binding until confirmed in writing by both parties.",
  ].join("\n");

  // Section 4 — Deliverables & schedule
  const rows = d.deliverables.filter((l) => l.trim()).map(deliverableRow);
  if (!retainer) rows.push(...d.addOns.filter((a) => a.name.trim()).map((a) => `${safe(a.name)} :: ${gbp(a.pricePence)}`));
  if (!rows.length) rows.push(`${retainer ? `As set out in the ${safe(d.packageName)} package` : safe(d.projectName)} :: Included`);
  pages[5] = [
    "@section 04 | SECTION | Deliverables & schedule",
    retainer
      ? "@intro The agreed monthly output. Volumes are measured across each calendar month of the engagement."
      : "@intro The agreed output for this Project.",
    "@table DELIVERABLE | AGREED VALUE",
    ...rows,
    "@endtable",
    "@callout teal | DELIVERY WINDOWS :: Unless otherwise agreed, Deliverables are supplied within ten Business Days of the relevant shoot day. Timeframes assume the Client meets its obligations under Section 6; delay by the Client extends delivery dates by an equivalent period.",
  ].join("\n");

  // Signing page summary
  const summary = [
    "@summary AGREEMENT SUMMARY",
    field("ENGAGEMENT TYPE", retainer ? "Retainer" : "Project"),
    field("MINIMUM TERM", retainer ? (d.minimumTermMonths ? `${d.minimumTermMonths} months` : "Rolling monthly") : ""),
    field(retainer ? "MONTHLY FEE (EXCL. VAT)" : "PROJECT FEE (EXCL. VAT)", fee),
    "@endsummary",
  ]
    .filter(Boolean)
    .join("\n");
  pages[16] = pages[16].replace(/@summary[\s\S]*?@endsummary/, summary);

  return pages.join("\n@page\n");
}
