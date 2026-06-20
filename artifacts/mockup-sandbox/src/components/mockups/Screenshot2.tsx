export default function Screenshot2() {
  return (
    <div
      style={{
        width: 1290,
        height: 2796,
        background: "linear-gradient(160deg, #145e2a 0%, #1a8a3a 35%, #16a34a 65%, #178c40 100%)",
        fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Ambient glows */}
      <div style={{
        position: "absolute", top: 200, left: "50%", transform: "translateX(-50%)",
        width: 900, height: 900,
        background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: 100, right: -150, width: 500, height: 500,
        background: "radial-gradient(circle, rgba(34,197,94,0.20) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Headline */}
      <div style={{ marginTop: 160, textAlign: "center", padding: "0 80px" }}>
        <div style={{ fontSize: 108, fontWeight: 800, color: "white", lineHeight: 1.0, letterSpacing: -4 }}>
          Cycle,<br/>then ride
        </div>
        <div style={{ fontSize: 46, color: "rgba(255,255,255,0.70)", marginTop: 36, fontWeight: 400, lineHeight: 1.4 }}>
          The fastest routes combining<br/>bike + tube + overground
        </div>
      </div>

      {/* Time saved badge */}
      <div style={{
        marginTop: 52,
        background: "rgba(255,255,255,0.15)",
        border: "2px solid rgba(255,255,255,0.30)",
        borderRadius: 50, padding: "20px 48px",
        display: "flex", alignItems: "center", gap: 18,
        backdropFilter: "blur(10px)",
      }}>
        <span style={{ fontSize: 36 }}>⚡</span>
        <span style={{ fontSize: 34, fontWeight: 700, color: "white" }}>Up to 12 min faster than cycling alone</span>
      </div>

      {/* Phone mockup */}
      <div style={{
        marginTop: 64,
        width: 660,
        height: 1120,
        background: "#0a0a0a",
        borderRadius: 76,
        border: "3px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        boxShadow: "0 60px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)",
        position: "relative",
        flexShrink: 0,
      }}>
        {/* Status bar */}
        <div style={{
          height: 60, background: "#f5f7f5",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 36px",
        }}>
          <span style={{ fontSize: 26, fontWeight: 600, color: "#1c1c1e" }}>9:41</span>
          <div style={{ width: 160, height: 36, background: "#1c1c1e", borderRadius: 20 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 28, height: 20, background: "#1c1c1e", borderRadius: 3 }} />
            <div style={{ width: 22, height: 18, background: "#1c1c1e", borderRadius: 3 }} />
          </div>
        </div>
        {/* Results header */}
        <div style={{ background: "#f5f7f5", padding: "24px 32px 0" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#3c3c43" }}>
            Mulkern Rd → E1 0EE
          </div>

          {/* Journey card 1 — highlighted */}
          <div style={{
            background: "white", borderRadius: 20, padding: "24px 28px",
            marginTop: 20, border: "2.5px solid #22c55e",
            boxShadow: "0 4px 20px rgba(34,197,94,0.18)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 52, fontWeight: 800, color: "#1c1c1e", lineHeight: 1 }}>38<span style={{ fontSize: 30, fontWeight: 500, color: "#8e8e93" }}> min</span></div>
                <div style={{ fontSize: 22, color: "#8e8e93", marginTop: 4 }}>09:12 → 09:50</div>
              </div>
              <div style={{
                background: "#f0fdf4", borderRadius: 20, padding: "10px 18px",
                border: "1.5px solid #22c55e",
              }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#16a34a" }}>⚡ 9 min vs cycling</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
              {[
                { bg: "#22c55e", label: "🚲" },
                { bg: "#f97316", label: "🚂" },
                { bg: "#8b5cf6", label: "🚇" },
              ].map(({ bg, label }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: i > 0 ? 0 : 8 }}>
                  {i > 0 && <div style={{ width: 20, height: 2, background: "#e5e7eb" }} />}
                  <div style={{ width: 42, height: 42, background: bg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginLeft: i > 0 ? 8 : 0 }}>
                    {label}
                  </div>
                </div>
              ))}
              <span style={{ fontSize: 24, fontWeight: 600, color: "#1c1c1e", marginLeft: 8 }}>Cycle + Overground + Tube</span>
            </div>
          </div>

          {/* Journey card 2 */}
          <div style={{
            background: "white", borderRadius: 20, padding: "22px 28px",
            marginTop: 16, border: "1.5px solid rgba(0,0,0,0.07)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#1c1c1e", lineHeight: 1 }}>43<span style={{ fontSize: 28, fontWeight: 500, color: "#8e8e93" }}> min</span></div>
                <div style={{ fontSize: 20, color: "#8e8e93", marginTop: 4 }}>09:12 → 09:55</div>
              </div>
              <div style={{
                background: "#f0fdf4", borderRadius: 20, padding: "10px 16px",
                border: "1.5px solid #22c55e",
              }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>⚡ 4 min vs cycling</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
              <div style={{ width: 38, height: 38, background: "#22c55e", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚲</div>
              <div style={{ width: 16, height: 2, background: "#e5e7eb" }} />
              <div style={{ width: 38, height: 38, background: "#e11d48", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚇</div>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#1c1c1e", marginLeft: 8 }}>Cycle + Elizabeth line</span>
            </div>
          </div>

          {/* Journey card 3 */}
          <div style={{
            background: "white", borderRadius: 20, padding: "20px 28px",
            marginTop: 14, border: "1.5px solid rgba(0,0,0,0.07)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 44, fontWeight: 800, color: "#1c1c1e", lineHeight: 1 }}>47<span style={{ fontSize: 26, fontWeight: 500, color: "#8e8e93" }}> min</span></div>
                <div style={{ fontSize: 19, color: "#8e8e93", marginTop: 4 }}>09:12 → 09:59</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 36, height: 36, background: "#22c55e", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚲</div>
                <div style={{ width: 16, height: 2, background: "#e5e7eb", alignSelf: "center" }} />
                <div style={{ width: 36, height: 36, background: "#dc2626", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚌</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature rows */}
      <div style={{ marginTop: 60, padding: "0 80px", width: "100%", boxSizing: "border-box" }}>
        {[
          { icon: "🔒", title: "Lock-bike mode", desc: "Find routes when you can't take your bike on the train" },
          { icon: "🎨", title: "TfL colour coding", desc: "Every line in its official colour — Overground, Elizabeth, Tube" },
        ].map(({ icon, title, desc }, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 32,
            background: "rgba(255,255,255,0.10)",
            border: "1.5px solid rgba(255,255,255,0.16)",
            borderRadius: 24, padding: "28px 36px",
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 48, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "white", marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 26, color: "rgba(255,255,255,0.60)", lineHeight: 1.3 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Triptych connectors */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 80,
        background: "linear-gradient(to left, transparent, rgba(20,94,42,0.5))",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
        background: "linear-gradient(to right, transparent, rgba(23,140,64,0.5))",
        pointerEvents: "none",
      }} />
    </div>
  );
}
