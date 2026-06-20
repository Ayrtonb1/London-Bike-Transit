export default function Screenshot1() {
  return (
    <div
      style={{
        width: 1284,
        height: 2778,
        background: "linear-gradient(160deg, #071a0e 0%, #0d3d1e 40%, #145e2a 100%)",
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
        position: "absolute", top: -200, right: -300, width: 800, height: 800,
        background: "radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: 300, left: -200, width: 600, height: 600,
        background: "radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* App icon + name */}
      <div style={{ marginTop: 140, display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div style={{
          width: 148, height: 148,
          background: "linear-gradient(145deg, #22c55e, #16a34a)",
          borderRadius: 34,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 20px 60px rgba(34,197,94,0.35)",
        }}>
          <svg width="84" height="84" viewBox="0 0 84 84" fill="none">
            <path d="M14 56 C14 56 28 42 42 42 C56 42 70 28 70 28" stroke="white" strokeWidth="6" strokeLinecap="round"/>
            <circle cx="16" cy="58" r="7" fill="white"/>
            <circle cx="68" cy="26" r="7" fill="white"/>
            <path d="M34 22 L42 14 L50 22" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M42 14 L42 36" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 38, fontWeight: 500, letterSpacing: 8, textTransform: "uppercase" }}>
          NAVELO
        </div>
      </div>

      {/* Headline */}
      <div style={{ marginTop: 90, textAlign: "center", padding: "0 80px" }}>
        <div style={{ fontSize: 112, fontWeight: 800, color: "white", lineHeight: 1.0, letterSpacing: -4 }}>
          Plan<br/>smarter<br/>journeys
        </div>
        <div style={{ fontSize: 46, color: "rgba(255,255,255,0.65)", marginTop: 36, fontWeight: 400, lineHeight: 1.4 }}>
          Mix cycling with London's<br/>transit network
        </div>
      </div>

      {/* Phone mockup */}
      <div style={{
        marginTop: 90,
        width: 660,
        height: 1020,
        background: "#0a0a0a",
        borderRadius: 76,
        border: "3px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        boxShadow: "0 60px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
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
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 28, height: 20, background: "#1c1c1e", borderRadius: 3 }} />
            <div style={{ width: 22, height: 18, background: "#1c1c1e", borderRadius: 3 }} />
          </div>
        </div>
        {/* App content */}
        <div style={{ background: "#f5f7f5", height: "100%", padding: "32px 36px 0" }}>
          {/* Header */}
          <div style={{ fontSize: 38, fontWeight: 700, color: "#1c1c1e", marginBottom: 28 }}>
            Plan Journey
          </div>
          {/* From */}
          <div style={{
            background: "white", borderRadius: 20, padding: "24px 28px",
            marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            border: "2px solid rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 22, color: "#8e8e93", marginBottom: 8, fontWeight: 500 }}>FROM</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <span style={{ fontSize: 28, fontWeight: 600, color: "#1c1c1e" }}>Mulkern Road, N19</span>
            </div>
          </div>
          {/* To */}
          <div style={{
            background: "white", borderRadius: 20, padding: "24px 28px",
            marginBottom: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            border: "2px solid #22c55e",
          }}>
            <div style={{ fontSize: 22, color: "#8e8e93", marginBottom: 8, fontWeight: 500 }}>TO</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
              <span style={{ fontSize: 28, fontWeight: 600, color: "#1c1c1e" }}>E1 0EE, Whitechapel</span>
            </div>
          </div>
          {/* Now / Leave at */}
          <div style={{ display: "flex", gap: 14, marginBottom: 32 }}>
            {["Leave now", "Depart at", "Arrive by"].map((label, i) => (
              <div key={i} style={{
                flex: 1, background: i === 0 ? "#22c55e" : "white",
                borderRadius: 16, padding: "16px 0", textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              }}>
                <span style={{ fontSize: 22, fontWeight: 600, color: i === 0 ? "white" : "#1c1c1e" }}>{label}</span>
              </div>
            ))}
          </div>
          {/* Plan button */}
          <div style={{
            background: "#22c55e", borderRadius: 20, padding: "28px 0",
            textAlign: "center", boxShadow: "0 8px 24px rgba(34,197,94,0.4)",
          }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "white" }}>Find Routes</span>
          </div>
          {/* Recent */}
          <div style={{ marginTop: 36 }}>
            <div style={{ fontSize: 26, fontWeight: 600, color: "#8e8e93", marginBottom: 18 }}>RECENT</div>
            {["Liverpool Street, EC2", "King's Cross, N1C", "Canary Wharf, E14"].map((loc, i) => (
              <div key={i} style={{
                background: "white", borderRadius: 16, padding: "20px 24px",
                marginBottom: 12, display: "flex", alignItems: "center", gap: 16,
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              }}>
                <div style={{ width: 36, height: 36, background: "#f0fdf4", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#22c55e" }} />
                </div>
                <span style={{ fontSize: 26, fontWeight: 500, color: "#1c1c1e" }}>{loc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom feature pills */}
      <div style={{ marginTop: 70, display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", padding: "0 60px" }}>
        {[
          { icon: "📍", label: "Use my location" },
          { icon: "🚲", label: "Bike-friendly" },
          { icon: "🚇", label: "All TfL lines" },
        ].map(({ icon, label }, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.10)",
            border: "1.5px solid rgba(255,255,255,0.18)",
            borderRadius: 50, padding: "20px 36px",
            display: "flex", alignItems: "center", gap: 16,
            backdropFilter: "blur(10px)",
          }}>
            <span style={{ fontSize: 34 }}>{icon}</span>
            <span style={{ fontSize: 32, fontWeight: 600, color: "white" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Triptych connector — right edge gradient */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
        background: "linear-gradient(to right, transparent, rgba(20,80,40,0.6))",
        pointerEvents: "none",
      }} />
    </div>
  );
}
