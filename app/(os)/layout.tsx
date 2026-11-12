import type { Metadata, Viewport } from "next";
import { Sora, Inter, Fraunces, Geist_Mono } from "next/font/google";
import "./globals.css";

// Same fonts as the marketing site, self-hosted via next/font (no FOUT, exact weights).
const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["italic", "normal"],
  variable: "--font-serif",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Blanc Script OS",
    template: "%s · Blanc Script OS",
  },
  description: "The Blanc Script agency operating system.",
  metadataBase: new URL("https://studio.blancscript.com"),
  // The OS is private (noindex below), but links shared in messages still get
  // a branded preview card from app/(os)/opengraph-image.tsx.
  openGraph: {
    type: "website",
    siteName: "Blanc Script Studio",
    title: "Blanc Script Studio",
    description: "Sign in to the Blanc Script studio workspace.",
    url: "https://studio.blancscript.com",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blanc Script Studio",
    description: "Sign in to the Blanc Script studio workspace.",
  },
  manifest: "/os.webmanifest",
  applicationName: "Blanc Script OS",
  appleWebApp: { capable: true, title: "Blanc Script", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1b201f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-GB"
      suppressHydrationWarning
      className={`${sora.variable} ${inter.variable} ${fraunces.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bs-theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
