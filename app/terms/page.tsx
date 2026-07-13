import type { Metadata } from "next";
import { buildMetadata, pageSeo } from "@/data/seo";
import { site } from "@/data/site";
import { LegalLayout } from "@/components/ui/LegalLayout";

export const metadata: Metadata = buildMetadata(pageSeo.terms);

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      updated="Placeholder date"
      breadcrumbLabel="Terms & Conditions"
      breadcrumbPath="/terms"
      intro={`The terms governing your use of the ${site.name} website. Terms for specific engagements are set out in individual proposals and contracts.`}
      sections={[
        {
          heading: "1. These terms",
          body: <p>By using this website you agree to these terms. If you do not agree, please do not use the site.</p>,
        },
        {
          heading: "2. Use of the website",
          body: <p>You may use this site for lawful purposes only. You must not misuse it, attempt to gain unauthorised access, or disrupt its operation.</p>,
        },
        {
          heading: "3. Intellectual property",
          body: (
            <p>
              All content on this site — including copy, design, logos, imagery and video —
              is owned by {site.legalName} or its licensors and may not be reproduced without
              permission. Portfolio media may include client work displayed with permission.
            </p>
          ),
        },
        {
          heading: "4. Services & proposals",
          body: <p>Any services we provide are governed by a separate written proposal or contract, which will set out scope, deliverables, timelines and fees. Website content is for information only and does not constitute an offer.</p>,
        },
        {
          heading: "5. Enquiries",
          body: <p>Submitting an enquiry does not create a contract. A project begins only once a proposal is agreed in writing by both parties.</p>,
        },
        {
          heading: "6. Limitation of liability",
          body: <p>To the extent permitted by law, we are not liable for any indirect or consequential loss arising from your use of this website. Nothing in these terms limits liability that cannot be limited by law. [Review with your advisor.]</p>,
        },
        {
          heading: "7. Third-party links",
          body: <p>This site may link to third-party websites (such as our social profiles). We are not responsible for their content or practices.</p>,
        },
        {
          heading: "8. Governing law",
          body: <p>These terms are governed by the laws of England and Wales, and disputes are subject to the exclusive jurisdiction of its courts.</p>,
        },
        {
          heading: "9. Contact",
          body: (
            <p>
              Questions about these terms? Email{" "}
              <a className="text-coral underline" href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
