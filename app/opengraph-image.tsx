import { ImageResponse } from "next/og";
import { site } from "@/data/site";

// Site-wide Open Graph image, generated as a real PNG at request/build time.
// Next.js auto-adds the og:image + twitter:image tags from this file convention.
export const runtime = "edge";
export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#F1E7DE",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: "100%", height: 14, backgroundColor: "#E8375B" }} />
        <div style={{ display: "flex", fontSize: 130, fontWeight: 800, letterSpacing: "-4px", color: "#343D3A" }}>
          Blanc<span style={{ color: "#E8375B" }}>Script</span>
          <span style={{ color: "#40B6BA" }}>.</span>
        </div>
        <div style={{ display: "flex", width: 130, height: 10, borderRadius: 6, backgroundColor: "#40B6BA", marginTop: 24, marginBottom: 40 }} />
        <div style={{ display: "flex", fontSize: 40, color: "#4A5450" }}>
          A strategy-led creative agency · Birmingham, UK
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#4A5450", marginTop: 14 }}>
          Cinematic content · Social media · Brand campaigns
        </div>
      </div>
    ),
    { ...size }
  );
}
