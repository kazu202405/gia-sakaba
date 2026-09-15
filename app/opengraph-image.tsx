import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GIA - 現場で回る仕組みを、アプリで実装する";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "linear-gradient(135deg, #0f1f33 0%, #1a3350 50%, #0f1f33 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -60,
            left: -60,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(45,138,128,0.3), transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -40,
            right: -40,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,165,90,0.2), transparent 70%)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
            padding: "8px 24px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <span style={{ color: "#4ecdc4", fontSize: 18, fontWeight: 700, letterSpacing: 4 }}>
            AI HOTLINE
          </span>
        </div>

        {/* Main title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "white", fontSize: 56, fontWeight: 700 }}>
            <span style={{ color: "#4ecdc4" }}>現場で回る仕組み</span>
            を、
          </span>
          <span style={{ color: "white", fontSize: 56, fontWeight: 700 }}>
            アプリで実装する。
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 22,
            marginTop: 24,
            textAlign: "center",
          }}
        >
          顧客管理・営業支援アプリを、設計から現場運用まで一気通貫で
        </p>

        {/* Footer bar */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, fontWeight: 600 }}>
            GIA - Global Information Academy
          </span>
          <div
            style={{
              width: 1,
              height: 20,
              background: "rgba(255,255,255,0.2)",
            }}
          />
          <span style={{ color: "#2d8a80", fontSize: 16, fontWeight: 600 }}>
            無料相談受付中
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
