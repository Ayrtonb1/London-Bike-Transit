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
      {/* Ambient glows */}
      <div style={{
        position: "absolute", top: 400, left: -200, width: 700, height: 700,
        background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)",
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

      {/* Phone mockup */}
      <div style={{
        marginTop: 80,
        width: 660,
        height: 1180,
        background: "#0a0a0a",
        borderRadius: 76,
        border: "3px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        boxShadow: "0 60px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)",
        flexShrink: 0,
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Status bar */}
        <div style={{
          height: 60, background: "#f0f0f0", flexShrink: 0,
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

        {/* Map — realistic London street map SVG */}
        <div style={{ position: "relative", height: 680, flexShrink: 0, overflow: "hidden" }}>
          <svg
            width="660" height="680" viewBox="0 0 660 680"
            style={{ display: "block" }}
          >
            {/* Map background */}
            <rect width="660" height="680" fill="#f2efe9" />

            {/* --- Parks / green areas --- */}
            {/* Finsbury Park (top-left area) */}
            <ellipse cx="80" cy="80" rx="70" ry="55" fill="#c8dfc0" opacity="0.8" />
            <ellipse cx="80" cy="80" rx="55" ry="40" fill="#b8d4b0" opacity="0.6" />
            {/* Highbury Fields */}
            <ellipse cx="200" cy="155" rx="32" ry="22" fill="#c8dfc0" opacity="0.7" />
            {/* Victoria Park (right side) */}
            <ellipse cx="550" cy="260" rx="55" ry="45" fill="#c8dfc0" opacity="0.8" />
            <ellipse cx="550" cy="260" rx="42" ry="33" fill="#b8d4b0" opacity="0.5" />
            {/* Islington Green */}
            <rect x="268" y="278" width="18" height="14" rx="4" fill="#c8dfc0" opacity="0.8" />
            {/* Bethnal Green gardens */}
            <ellipse cx="530" cy="390" rx="22" ry="15" fill="#c8dfc0" opacity="0.7" />
            {/* Mile End Park */}
            <ellipse cx="590" cy="470" rx="28" ry="40" fill="#c8dfc0" opacity="0.8" />

            {/* --- Water --- */}
            {/* Regents Canal */}
            <path d="M 0 320 Q 80 318 160 315 Q 220 312 280 316 Q 340 320 400 325 Q 460 328 520 326 Q 580 322 660 318" stroke="#a8d4e8" strokeWidth="8" fill="none" strokeLinecap="round"/>

            {/* --- Building blocks (simplified urban texture) --- */}
            {[
              [20,180,60,30],[90,175,50,28],[155,170,45,25],[20,220,55,25],[85,215,52,22],
              [148,212,48,20],[210,168,40,28],[260,165,38,26],[308,162,42,25],[360,158,40,28],
              [20,260,58,22],[88,255,50,20],[148,252,46,18],[204,250,42,20],[258,248,40,18],
              [20,295,55,18],[85,292,48,16],[143,290,44,16],[197,288,40,16],[247,285,38,16],
              [350,270,42,20],[402,265,38,18],[450,262,40,20],[500,258,35,16],
              [350,300,40,18],[400,296,38,16],[448,293,40,17],[498,290,34,15],
              [350,330,42,18],[402,326,40,16],[452,323,38,17],[500,320,36,15],
              [350,360,40,16],[400,357,38,15],[448,354,40,16],[498,351,36,14],
              [20,340,52,18],[82,337,48,17],[140,334,44,16],[194,331,40,15],[244,329,38,15],
              [20,372,50,16],[80,369,46,15],[136,366,42,15],[188,363,38,14],[236,361,36,13],
              [20,402,50,16],[80,399,46,15],[136,396,42,14],[188,393,36,14],
              [350,400,40,15],[400,397,38,14],[448,394,40,15],[498,391,36,13],
              [430,430,38,14],[478,428,36,13],[524,425,34,12],[568,422,30,12],
              [430,455,36,13],[476,453,34,12],[520,451,32,12],[562,448,30,11],
              [20,430,48,14],[78,428,44,13],[132,426,40,13],[182,424,36,12],[228,422,34,12],
              [20,458,46,13],[76,456,42,13],[128,454,38,12],[176,452,34,12],
              [20,484,44,12],[74,482,40,12],[124,480,36,11],[170,478,32,11],
              [350,490,38,13],[398,488,36,12],[444,486,34,12],[488,484,32,11],
              [350,516,36,12],[396,514,34,12],[440,512,32,11],[482,510,30,11],
              [20,510,42,12],[72,508,38,11],[120,506,34,11],[164,504,30,11],
              [20,535,40,12],[70,533,36,11],[116,531,32,11],[158,529,28,10],
              [20,560,38,11],[68,558,34,11],[112,556,30,10],[152,554,26,10],
              [350,545,34,11],[394,543,32,10],[436,541,30,10],[476,539,28,9],
              [430,570,32,10],[472,568,30,10],[512,566,28,9],[550,564,26,9],
              [20,585,36,11],[66,583,32,10],[108,581,28,10],[146,579,24,9],
              [20,610,34,10],[64,608,30,10],[104,606,26,9],[140,604,22,9],
              [350,580,32,10],[392,578,30,9],[432,576,28,9],[470,574,26,8],
              [350,602,30,9],[390,600,28,9],[428,598,26,8],[464,596,24,8],
              [20,634,32,10],[62,632,28,9],[100,630,24,9],[134,628,22,8],
              [350,624,28,9],[388,622,26,8],[424,620,24,8],[458,618,22,8],
            ].map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#ddd9d0" opacity="0.7" />
            ))}

            {/* --- Road network --- */}
            {/* Minor streets (lightest, thinnest) */}
            {[
              "M 0 190 L 660 185", "M 0 230 L 660 226", "M 0 265 L 660 262",
              "M 0 350 L 660 347", "M 0 385 L 660 382", "M 0 420 L 660 417",
              "M 0 450 L 660 447", "M 0 480 L 660 478", "M 0 510 L 660 508",
              "M 0 540 L 660 538", "M 0 570 L 660 568", "M 0 598 L 660 597",
              "M 0 626 L 660 625", "M 0 655 L 660 654",
              "M 60 0 L 58 680", "M 115 0 L 112 680", "M 165 0 L 162 680",
              "M 215 0 L 212 680", "M 265 0 L 262 680", "M 318 0 L 315 680",
              "M 370 0 L 367 680", "M 418 0 L 415 680", "M 468 0 L 465 680",
              "M 520 0 L 517 680", "M 568 0 L 565 680", "M 616 0 L 613 680",
            ].map((d, i) => (
              <path key={i} d={d} stroke="white" strokeWidth="2.5" fill="none" opacity="0.85" />
            ))}

            {/* Secondary roads */}
            {[
              "M 0 140 Q 165 138 330 145 Q 495 152 660 148",
              "M 0 300 Q 165 297 330 303 Q 495 309 660 305",
              "M 0 465 Q 165 462 330 467 Q 495 472 660 468",
              "M 0 620 Q 165 618 330 622 Q 495 626 660 622",
              "M 140 0 Q 143 170 138 340 Q 133 510 136 680",
              "M 340 0 Q 342 170 338 340 Q 334 510 337 680",
              "M 540 0 Q 543 170 539 340 Q 535 510 538 680",
            ].map((d, i) => (
              <path key={i} d={d} stroke="white" strokeWidth="5" fill="none" opacity="0.9" />
            ))}

            {/* Major roads (A-roads) — cream/yellow */}
            {/* Holloway Road / Highbury — runs roughly N→S left-centre */}
            <path d="M 195 0 Q 198 100 202 200 Q 206 300 204 400 Q 202 500 200 680" stroke="#f5e9b0" strokeWidth="9" fill="none" />
            <path d="M 195 0 Q 198 100 202 200 Q 206 300 204 400 Q 202 500 200 680" stroke="#eedda0" strokeWidth="7" fill="none" />
            {/* Essex Road / Balls Pond Road — diagonal NW→SE */}
            <path d="M 140 120 Q 200 180 255 240 Q 310 295 358 355 Q 410 415 460 470" stroke="#f5e9b0" strokeWidth="9" fill="none" />
            <path d="M 140 120 Q 200 180 255 240 Q 310 295 358 355 Q 410 415 460 470" stroke="#eedda0" strokeWidth="7" fill="none" />
            {/* Old Street / City Road */}
            <path d="M 0 400 Q 110 398 220 395 Q 330 392 440 397 Q 550 402 660 400" stroke="#f5e9b0" strokeWidth="9" fill="none" />
            <path d="M 0 400 Q 110 398 220 395 Q 330 392 440 397 Q 550 402 660 400" stroke="#eedda0" strokeWidth="7" fill="none" />
            {/* Bethnal Green Road */}
            <path d="M 440 397 Q 500 405 560 418 Q 610 428 660 435" stroke="#f5e9b0" strokeWidth="9" fill="none" />
            <path d="M 440 397 Q 500 405 560 418 Q 610 428 660 435" stroke="#eedda0" strokeWidth="7" fill="none" />
            {/* Pentonville Road / Angel */}
            <path d="M 0 330 Q 110 328 220 330 Q 290 332 340 330" stroke="#f5e9b0" strokeWidth="8" fill="none" />
            <path d="M 0 330 Q 110 328 220 330 Q 290 332 340 330" stroke="#eedda0" strokeWidth="6" fill="none" />
            {/* Caledonian Road */}
            <path d="M 118 0 Q 120 150 122 300 Q 124 450 122 600 Q 120 640 120 680" stroke="#f5e9b0" strokeWidth="8" fill="none" />
            <path d="M 118 0 Q 120 150 122 300 Q 124 450 122 600 Q 120 640 120 680" stroke="#eedda0" strokeWidth="6" fill="none" />
            {/* Roman Road */}
            <path d="M 440 480 Q 500 482 560 486 Q 610 490 660 492" stroke="#f5e9b0" strokeWidth="7" fill="none" />
            <path d="M 440 480 Q 500 482 560 486 Q 610 490 660 492" stroke="#eedda0" strokeWidth="5.5" fill="none" />

            {/* --- Journey route overlay --- */}
            {/* Cycling leg: N19/Mulkern Rd → Highbury & Islington (green dashed) */}
            <path
              d="M 95 595 Q 110 560 130 520 Q 155 475 170 430 Q 185 385 196 340 Q 204 295 204 250"
              stroke="rgba(0,0,0,0.25)" strokeWidth="11" fill="none" strokeLinecap="round" strokeDasharray="20 12"
            />
            <path
              d="M 95 595 Q 110 560 130 520 Q 155 475 170 430 Q 185 385 196 340 Q 204 295 204 250"
              stroke="#22c55e" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="20 12"
            />

            {/* Overground leg: Highbury & Islington → Shoreditch/Whitechapel (orange solid) */}
            <path
              d="M 204 250 Q 220 240 240 230 Q 275 215 310 210 Q 348 205 385 210 Q 420 216 450 230 Q 480 245 505 265 Q 525 282 540 305"
              stroke="rgba(0,0,0,0.25)" strokeWidth="11" fill="none" strokeLinecap="round"
            />
            <path
              d="M 204 250 Q 220 240 240 230 Q 275 215 310 210 Q 348 205 385 210 Q 420 216 450 230 Q 480 245 505 265 Q 525 282 540 305"
              stroke="#f97316" strokeWidth="8" fill="none" strokeLinecap="round"
            />

            {/* Walking final leg: Whitechapel area → destination (grey dashed) */}
            <path
              d="M 540 305 Q 555 320 568 345 Q 576 362 580 382"
              stroke="rgba(0,0,0,0.20)" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray="10 8"
            />
            <path
              d="M 540 305 Q 555 320 568 345 Q 576 362 580 382"
              stroke="#9ca3af" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="10 8"
            />

            {/* Station markers */}
            {/* Highbury & Islington */}
            <circle cx="204" cy="250" r="14" fill="white" stroke="#f97316" strokeWidth="4.5" />
            <circle cx="204" cy="250" r="7" fill="#f97316" />
            {/* Shoreditch High St */}
            <circle cx="540" cy="305" r="13" fill="white" stroke="#f97316" strokeWidth="4" />
            <circle cx="540" cy="305" r="6.5" fill="#f97316" />

            {/* Start marker — Mulkern Road */}
            <circle cx="95" cy="595" r="18" fill="white" stroke="#22c55e" strokeWidth="5" />
            <circle cx="95" cy="595" r="10" fill="#22c55e" />

            {/* Destination marker — E1 */}
            <circle cx="580" cy="382" r="20" fill="#ef4444" />
            <circle cx="580" cy="382" r="11" fill="white" />
            <circle cx="580" cy="382" r="6" fill="#ef4444" />

            {/* Station labels */}
            <rect x="118" y="234" width="160" height="30" rx="6" fill="white" opacity="0.92" />
            <text x="198" y="254" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1c1c1e" fontFamily="-apple-system, sans-serif">Highbury & Islington</text>

            <rect x="450" y="289" width="146" height="28" rx="6" fill="white" opacity="0.92" />
            <text x="523" y="308" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1c1c1e" fontFamily="-apple-system, sans-serif">Shoreditch H St</text>

            {/* Start label */}
            <rect x="30" y="573" width="110" height="26" rx="6" fill="white" opacity="0.90" />
            <text x="85" y="590" textAnchor="middle" fontSize="15" fontWeight="700" fill="#16a34a" fontFamily="-apple-system, sans-serif">Mulkern Rd</text>

            {/* Destination label */}
            <rect x="540" y="390" width="88" height="26" rx="6" fill="white" opacity="0.90" />
            <text x="584" y="407" textAnchor="middle" fontSize="15" fontWeight="700" fill="#ef4444" fontFamily="-apple-system, sans-serif">E1 0EE</text>
          </svg>

          {/* Map top pill */}
          <div style={{
            position: "absolute", top: 14, left: 14, right: 14,
            background: "white", borderRadius: 16, padding: "14px 20px",
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
            <span style={{ fontSize: 22, fontWeight: 600, color: "#1c1c1e", flex: 1 }}>Mulkern Rd → Whitechapel</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>38 min</span>
          </div>

          {/* Compass */}
          <div style={{
            position: "absolute", bottom: 16, right: 16,
            width: 50, height: 50, background: "white", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.18)", fontSize: 24,
          }}>
            🧭
          </div>
        </div>

        {/* Journey detail panel */}
        <div style={{ background: "#f5f7f5", padding: "22px 28px", flex: 1, overflow: "hidden", position: "relative" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#1c1c1e", marginBottom: 16 }}>Your journey</div>
          {[
            { borderColor: "#22c55e", icon: "🚲", label: "Cycle to Highbury & Islington", time: "10 min" },
            { borderColor: "#f97316", icon: "🚂", label: "Overground · 3 stops", time: "12 min" },
            { borderColor: "#9ca3af", icon: "🚶", label: "Walk to destination", time: "6 min" },
          ].map(({ borderColor, icon, label, time }, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16,
              background: "white", borderRadius: 14, padding: "16px 18px",
              marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              borderLeft: `4px solid ${borderColor}`,
            }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
              <span style={{ flex: 1, fontSize: 23, fontWeight: 500, color: "#1c1c1e" }}>{label}</span>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#8e8e93" }}>{time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 56, padding: "0 80px", width: "100%", boxSizing: "border-box" }}>
        <div style={{
          background: "rgba(255,255,255,0.10)",
          border: "1.5px solid rgba(255,255,255,0.16)",
          borderRadius: 28, padding: "36px 40px",
        }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "white", marginBottom: 28 }}>Route colour coding</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 22 }}>
            {[
              { color: "#22c55e", label: "Cycling", dashed: true },
              { color: "#f97316", label: "Overground" },
              { color: "#7c3aed", label: "Elizabeth line" },
              { color: "#dc2626", label: "Tube" },
              { color: "#3b82f6", label: "National Rail" },
              { color: "#9ca3af", label: "Walking", dashed: true },
            ].map(({ color, label, dashed }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <svg width="36" height="10">
                  {dashed
                    ? <line x1="0" y1="5" x2="36" y2="5" stroke={color} strokeWidth="4" strokeDasharray="8 5" strokeLinecap="round" />
                    : <line x1="0" y1="5" x2="36" y2="5" stroke={color} strokeWidth="4" strokeLinecap="round" />
                  }
                </svg>
                <span style={{ fontSize: 26, color: "rgba(255,255,255,0.80)", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom tagline */}
      <div style={{ marginTop: 56, textAlign: "center", padding: "0 80px" }}>
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
