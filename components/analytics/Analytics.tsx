import Script from "next/script";

/**
 * Analytics placeholders — Google Analytics 4 and Meta Pixel.
 * Both are disabled unless their env vars are set, so nothing loads (and no
 * consent is needed) until you opt in.
 *
 * SETUP:
 *  - GA4:  set NEXT_PUBLIC_GA_ID (e.g. G-XXXXXXX) in .env.local / Vercel.
 *  - Meta: set NEXT_PUBLIC_META_PIXEL_ID.
 *  - Google Search Console: verify via DNS or upload the HTML file to /public,
 *    or add a verification <meta> tag in app/layout.tsx metadata.verification.
 *
 * For strict cookie compliance, gate these scripts behind the cookie-consent
 * choice (see components/analytics/CookieConsent.tsx).
 */
export function Analytics() {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
  const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      {PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
