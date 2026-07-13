import type { Metadata } from "next";
import { buildMetadata, pageSeo } from "@/data/seo";
import { site } from "@/data/site";
import { LegalLayout } from "@/components/ui/LegalLayout";

export const metadata: Metadata = buildMetadata(pageSeo.privacy);

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="Placeholder date"
      breadcrumbLabel="Privacy Policy"
      breadcrumbPath="/privacy-policy"
      intro={`How ${site.legalName} collects, uses and protects your information when you use this website or enquire about our services.`}
      sections={[
        {
          heading: "1. Who we are",
          body: (
            <p>
              {site.legalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a creative agency based in{" "}
              {site.location.city}, {site.location.country}. For any privacy queries, contact us at{" "}
              <a className="text-coral underline" href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
            </p>
          ),
        },
        {
          heading: "2. Information we collect",
          body: (
            <p>
              When you submit an enquiry we collect the details you provide — such as your
              name, business, email, phone number, website, social links and project details.
              We also collect standard analytics data (if enabled) about how the site is used.
            </p>
          ),
        },
        {
          heading: "3. How we use your information",
          body: (
            <p>
              We use your information to respond to enquiries, prepare proposals, deliver our
              services and improve the website. We do not sell your personal data.
            </p>
          ),
        },
        {
          heading: "4. Legal basis",
          body: (
            <p>
              We process enquiry data on the basis of taking steps at your request prior to
              entering a contract, and our legitimate interest in operating and improving our
              business. Analytics cookies (if enabled) are processed with your consent.
            </p>
          ),
        },
        {
          heading: "5. Cookies & analytics",
          body: (
            <p>
              This site can use cookies for analytics (e.g. Google Analytics) and marketing
              (e.g. Meta Pixel) once configured. You can manage your choice via the cookie
              banner. See your browser settings to block or delete cookies.
            </p>
          ),
        },
        {
          heading: "6. Data retention",
          body: <p>We keep enquiry data only as long as necessary for the purposes described, then delete it. [Specify your retention period.]</p>,
        },
        {
          heading: "7. Your rights",
          body: (
            <p>
              Under UK GDPR you have rights to access, correct, delete and restrict the
              processing of your personal data, and to object or request portability. To
              exercise these, contact us at{" "}
              <a className="text-coral underline" href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
            </p>
          ),
        },
        {
          heading: "8. Third parties",
          body: <p>We may share data with service providers who help us operate (e.g. CRM, email, analytics and hosting providers), under appropriate agreements. [List your processors.]</p>,
        },
        {
          heading: "9. Changes to this policy",
          body: <p>We may update this policy from time to time. The latest version will always be posted on this page.</p>,
        },
      ]}
    />
  );
}
