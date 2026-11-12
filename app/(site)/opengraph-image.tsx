import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/site/data/site";

// Site-wide social share image (Open Graph / X / WhatsApp / LinkedIn previews),
// generated as a real PNG. Next.js adds the og:image tags from this file
// convention. Built from the real logo and brand fonts in site/assets/og.
export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#F1E7DE";
const CORAL = "#E8375B";
const TEAL = "#40B6BA";
const CHARCOAL = "#343D3A";
const CHARCOAL_SOFT = "#4A5450";

const asset = (name: string) => join(process.cwd(), "site/assets/og", name);

export default async function OGImage() {
  const [logo, sora, inter] = await Promise.all([
    readFile(asset("logo.png"), "base64"),
    readFile(asset("Sora-600.woff")),
    readFile(asset("Inter-500.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: CREAM,
          fontFamily: "Inter",
        }}
      >
        {/* Soft brand glows, as on the site hero */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -220,
            right: -180,
            width: 620,
            height: 620,
            borderRadius: 620,
            background: `radial-gradient(circle, ${TEAL}55 0%, ${TEAL}00 70%)`,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: -260,
            left: -200,
            width: 600,
            height: 600,
            borderRadius: 600,
            background: `radial-gradient(circle, ${CORAL}33 0%, ${CORAL}00 70%)`,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 14,
            backgroundColor: CORAL,
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 580,
            height: "100%",
            paddingLeft: 40,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${logo}`}
            alt=""
            width={460}
            height={255}
          />
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignSelf: "center",
            width: 2,
            height: 300,
            backgroundColor: `${CHARCOAL}22`,
          }}
        />

        {/* Message */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "0 70px 0 60px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 19,
              letterSpacing: 5,
              color: CORAL,
              textTransform: "uppercase",
            }}
          >
            Strategy-led creative agency
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontFamily: "Sora",
              fontSize: 50,
              lineHeight: 1.12,
              letterSpacing: -1.5,
              color: CHARCOAL,
            }}
          >
            We turn brands into stories people remember.
          </div>
          <div
            style={{
              display: "flex",
              width: 96,
              height: 8,
              borderRadius: 8,
              backgroundColor: TEAL,
              marginTop: 30,
            }}
          />
          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 24,
              color: CHARCOAL_SOFT,
            }}
          >
            blancscript.com · Birmingham, UK
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Sora", data: sora, weight: 600, style: "normal" },
        { name: "Inter", data: inter, weight: 500, style: "normal" },
      ],
    },
  );
}
