import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Share-preview card for studio.blancscript.com links (WhatsApp, iMessage,
// Slack, LinkedIn…). The OS itself stays private and unindexed; this is only
// the picture shown when someone is sent a link.
export const alt = "Blanc Script Studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1B201F";
const CREAM = "#F1E7DE";
const CORAL = "#E8375B";
const TEAL = "#40B6BA";

const asset = (name: string) => join(process.cwd(), "site/assets/og", name);

export default async function OGImage() {
  const [logo, sora, inter] = await Promise.all([
    readFile(asset("logo-light.png"), "base64"),
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
          backgroundColor: INK,
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -240,
            right: -200,
            width: 660,
            height: 660,
            borderRadius: 660,
            background: `radial-gradient(circle, ${TEAL}44 0%, ${TEAL}00 70%)`,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: -280,
            left: -220,
            width: 640,
            height: 640,
            borderRadius: 640,
            background: `radial-gradient(circle, ${CORAL}3D 0%, ${CORAL}00 70%)`,
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
          <img src={`data:image/png;base64,${logo}`} alt="" width={460} height={255} />
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "center",
            width: 2,
            height: 300,
            backgroundColor: `${CREAM}26`,
          }}
        />

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
            Studio
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontFamily: "Sora",
              fontSize: 50,
              lineHeight: 1.12,
              letterSpacing: -1.5,
              color: CREAM,
            }}
          >
            Where the work gets made.
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
          <div style={{ display: "flex", marginTop: 30, fontSize: 24, color: `${CREAM}B3` }}>
            studio.blancscript.com
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
