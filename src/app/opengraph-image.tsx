import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tanmay Singh — Senior Software Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pixel-terminal OG card. Uses system monospace so it needs no font asset.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#0a0a0f",
          fontFamily: "monospace",
        }}
      >
        {/* terminal frame */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "4px solid #2a2a3a",
            background: "#16161f",
            padding: "0",
            width: "1000px",
          }}
        >
          {/* title bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "16px 24px",
              background: "#12121a",
              borderBottom: "3px solid #2a2a3a",
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#ef4444" }} />
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#f59e0b" }} />
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#00ff88" }} />
            <div style={{ color: "#7d7d98", fontSize: 22, marginLeft: 12 }}>
              tanmay@dev:~$ whoami
            </div>
          </div>
          {/* body */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "48px 56px",
            }}
          >
            <div
              style={{
                color: "#e8e8f0",
                fontSize: 72,
                fontWeight: 700,
                letterSpacing: "-1px",
                display: "flex",
              }}
            >
              TANMAY&nbsp;<span style={{ color: "#00ff88" }}>SINGH</span>
            </div>
            <div style={{ color: "#9a9ab2", fontSize: 30, marginTop: 28, display: "flex" }}>
              <span style={{ color: "#00ff88" }}>&gt;</span>&nbsp;Senior software
              engineer — SDK generators &amp; agent tooling
            </div>
            <div style={{ color: "#7d7d98", fontSize: 26, marginTop: 14 }}>
              Fern (acq. Postman) · ex-Amazon Identity · NYC
            </div>
            <div style={{ color: "#7d7d98", fontSize: 24, marginTop: 40, display: "flex" }}>
              tanmay-singh.com
              <span style={{ color: "#00ff88", marginLeft: 10 }}>█</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
