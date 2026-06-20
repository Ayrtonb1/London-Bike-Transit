export default function Screenshot3() {
  return (
    <div
      style={{
        width: 1290,
        height: 2796,
        background: "linear-gradient(160deg, #178c40 0%, #0f6b35 40%, #0a4726 70%, #071a0e 100%)",
        fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: 400, left: -200, width: 700, height: 700,
        background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -100, right: -100, width: 600, height: 600,
        background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Headline */}
      <div style={{ marginTop: 160, textAlign: "center", padding: "0 80px" }}>
        <div style={{ fontSize: 108, fontWeight: 800, color: "white", lineHeight: 1.0, letterSpacing: -4 }}>
          See your<br/>whole<br/>route
        </div>
        <div style={{ fontSize: 46, color: "rgba(255,255,255,0.65)", marginTop: 36, fontWeight: 400, lineHeight: 1.4 }}>
          Colour-coded map from<br/>door to destination
        </div>
      </div>

      {/* Phone mockup — map view */}
      <div style={{
        marginTop: 80,
        width: 660,
        height: 1120,
        background: "#0a0a0a",
        borderRadius: 76,
        border: "3px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        boxShadow: "0 60px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)",
        flexShrink: 0,
        position: "relative",
      }}>
        {/* Status bar */}
        <div style={{
          height: 60, background: "#f0f0f0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 36px", zIndex: 10, position: "relative",
        }}>
          <span style={{ fontSize: 26, fontWeight: 600, color: "#1c1c1e" }}>9:41</span>
          <div style={{ width: 160, height: 36, background: "#1c1c1e", borderRadius: 20 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 28, height: 20, background: "#1c1c1e", borderRadius: 3 }} />
            <div style={{ width: 22, height: 18, background: "#1c1c1e", borderRadius: 3 }} />
          </div>
        </div>

        {/* Map background */}
        <div style={{ position: "relative", height: 620, overflow: "hidden", background: "#e8ede6" }}>
          {/* Simulated map grid */}
          <svg width="660" height="620" style={{ position: "absolute", top: 0, left: 0 }}>
            {/* Road grid */}
            {[60, 120, 180, 240, 300, 360, 420, 480, 540].map(y => (
              <line key={`h${y}`} x1="0" y1={y} x2="660" y2={y} stroke="#d4dace" strokeWidth="1.5" />
            ))}
            {[80, 160, 240, 320, 400, 480, 560].map(x => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2="620" stroke="#d4dace" strokeWidth="1.5" />
            ))}
            {/* Major roads */}
            <line x1="0" y1="200" x2="660" y2="200" stroke="#c8cfc2" strokeWidth="5" />
            <line x1="0" y1="420" x2="660" y2="420" stroke="#c8cfc2" strokeWidth="5" />
            <line x1="220" y1="0" x2="220" y2="620" stroke="#c8cfc2" strokeWidth="5" />
            <line x1="480" y1="0" x2="480" y2="620" stroke="#c8cfc2" strokeWidth="5" />
            {/* Green areas */}
            <rect x="20" y="20" width="140" height="100" rx="8" fill="#c8dfc2" opacity="0.6" />
            <rect x="360" y="280" width="120" height="80" rx="6" fill="#c8dfc2" opacity="0.6" />
            {/* Route — cycling (green dashed) */}
            <path d="M 100 520 C 100 480 140 450 160 400 C 180 360 190 320 200 280" stroke="#22c55e" strokeWidth="7" strokeDasharray="16 10" strokeLinecap="round" fill="none" />
            {/* Route — overground (orange solid) */}
            <path d="M 200 280 C 210 260 230 240 260 220 C 290 200 320 195 360 195" stroke="#f97316" strokeWidth="7" strokeLinecap="round" fill="none" />
            {/* Route — tube (purple) */}
            <path d="M 360 195 C 380 195 400 200 430 220 C 460 240 490 260 530 280 C 560 300 580 340 590 380" stroke="#7c3aed" strokeWidth="7" strokeLinecap="round" fill="none" />
            {/* Start marker */}
            <circle cx="100" cy="520" r="14" fill="#22c55e" />
            <circle cx="100" cy="520" r="8" fill="white" />
            {/* Station dots */}
            <circle cx="200" cy="280" r="12" fill="white" stroke="#f97316" strokeWidth="4" />
            <circle cx="360" cy="196" r="12" fill="white" stroke="#f97316" strokeWidth="4" />
            <circle cx="362" cy="196" r="6" fill="#f97316" />
            {/* End marker */}
            <circle cx="590" cy="380" r="16" fill="#ef4444" />
            <circle cx="590" cy="380" r="9" fill="white" />
          </svg>

          {/* Map overlay top pill */}
          <div style={{
            position: "absolute", top: 16, left: 16, right: 16,
            background: "white", borderRadius: 16, padding: "14px 20px",
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
            <span style={{ fontSize: 22, fontWeight: 600, color: "#1c1c1e", flex: 1 }}>Mulkern Rd → Whitechapel</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>38 min</span>
          </div>
        </div>

        {/* Journey detail panel */}
        <div style={{ background: "#f5f7f5", padding: "22px 28px", height: "calc(100% - 680px)", overflow: "hidden" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#1c1c1e", marginBottom: 16 }}>Your journey</div>
          {[
            { color: "#22c55e", icon: "🚲", label: "Cycle to Archway", time: "7 min", dotColor: "#22c55e" },
            { color: "#f97316", icon: "🚂", label: "Overground · 4 stops", time: "12 min", dotColor: "#f97316" },
            { color: "#7c3aed", icon: "🚇", label: "Tube · 6 stops", time: "14 min", dotColor: "#7c3aed" },
            { color: "#22c55e", icon: "🚶", label: "Walk to destination", time: "5 min", dotColor: "#6b7280" },
          ].map(({ color, icon, label, time, dotColor }, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16,
              background: "white", borderRadius: 14, padding: "14px 18px",
              marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              borderLeft: `4px solid ${dotColor}`,
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
              <span style={{ flex: 1, fontSize: 22, fontWeight: 500, color: "#1c1c1e" }}>{label}</span>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#8e8e93" }}>{time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Line legend */}
      <div style={{ marginTop: 60, padding: "0 80px", width: "100%", boxSizing: "border-box" }}>
        <div style={{
          background: "rgba(255,255,255,0.10)",
          border: "1.5px solid rgba(255,255,255,0.16)",
          borderRadius: 28, padding: "36px 40px",
        }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "white", marginBottom: 28 }}>Route colour coding</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            {[
              { color: "#22c55e", label: "Cycling" },
              { color: "#f97316", label: "Overground" },
              { color: "#7c3aed", label: "Elizabeth line" },
              { color: "#dc2626", label: "Tube" },
              { color: "#3b82f6", label: "National Rail" },
              { color: "#6b7280", label: "Walking" },
            ].map(({ color, label }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 32, height: 10, background: color, borderRadius: 5 }} />
                <span style={{ fontSize: 26, color: "rgba(255,255,255,0.80)", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom tagline */}
      <div style={{ marginTop: 60, textAlign: "center", padding: "0 80px" }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: "white", letterSpacing: -1 }}>
          Free to use · No account needed
        </div>
        <div style={{ fontSize: 34, color: "rgba(255,255,255,0.55)", marginTop: 16 }}>
          Powered by TfL & OpenStreetMap
        </div>
      </div>

      {/* Triptych left connector */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 80,
        background: "linear-gradient(to left, transparent, rgba(23,140,64,0.5))",
        pointerEvents: "none",
      }} />
    </div>
  );
}
