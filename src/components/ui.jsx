import React from "react";

export const C = {
  bg: "#10151B", panel: "#181F27", panel2: "#1F2832", border: "#2A3540",
  text: "#EAF0F6", muted: "#8FA0B0", faint: "#5C6B79",
  teal: "#3DD6C4", good: "#58C97A", warn: "#E8B339", over: "#E5604D", protein: "#7AA2F7",
};
export const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
export const FONT_MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace";
export const FONT_BODY = "system-ui, -apple-system, sans-serif";

export const page = { minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center", fontFamily: FONT_BODY, color: C.text };
export const shell = { width: "100%", maxWidth: 440, minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg, position: "relative" };
export const topbar = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}` };
export const scroll = { flex: 1, overflowY: "auto", padding: "16px 16px 90px" };
export const navbar = { position: "sticky", bottom: 0, display: "flex", borderTop: `1px solid ${C.border}`, background: "rgba(16,21,27,0.92)", backdropFilter: "blur(8px)" };
export const navBtn = (active) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 0 12px", border: "none", background: "transparent", cursor: "pointer", color: active ? C.teal : C.faint });
export const input = { flex: 1, width: "100%", boxSizing: "border-box", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 12px", color: C.text, fontSize: 14, fontFamily: FONT_BODY, outline: "none" };
export const btnPrimary = { background: C.teal, color: "#06231F", border: "none", borderRadius: 10, padding: "11px 16px", fontSize: 14, fontWeight: 700, fontFamily: FONT_BODY, cursor: "pointer", width: "100%" };
export const btnGhost = { background: "transparent", color: C.teal, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, cursor: "pointer" };
export const foodRow = { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "transparent", border: "none", borderRadius: 8, padding: "10px", cursor: "pointer", textAlign: "left" };
export const iconBtn = { background: "transparent", border: "none", color: C.faint, cursor: "pointer", padding: 4, display: "flex" };

export function Card({ children, pad = 14 }) {
  return <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: pad }}>{children}</div>;
}
export function Stat({ label, value, unit, accent }) {
  return (
    <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 19, fontWeight: 700, color: accent ?? C.text, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.faint }}>{unit}</div>
    </div>
  );
}
export function Mini({ label, value, target, color }) {
  return (
    <div style={{ flex: 1, background: C.panel2, borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: C.muted }}><span style={{ color, marginRight: 5 }}>●</span>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: C.text, marginTop: 2 }}>
        {value}{target ? <span style={{ color: C.faint }}>/{target}</span> : ""}<span style={{ fontSize: 10, color: C.faint }}> g</span>
      </div>
    </div>
  );
}
export function Row({ label, cur, target, unit, color }) {
  const pct = Math.min(1, cur / (target || 1));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.text }}>{cur} / {target} {unit}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: C.panel2, overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}
export function Macro({ label, value, color, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: last ? 0 : 8 }}>
      <span style={{ fontSize: 12, color: C.muted }}><span style={{ color, marginRight: 6 }}>●</span>{label}</span>
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.text }}>{value} g</span>
    </div>
  );
}
export function Label({ children }) {
  return <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>{children}</div>;
}
export function Field({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <Label>{label}</Label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} style={input} />
    </div>
  );
}
export function Toggle({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", background: C.panel2, borderRadius: 10, padding: 3 }}>
      {options.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer",
          fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
          background: value === k ? C.teal : "transparent", color: value === k ? "#06231F" : C.muted,
        }}>{label}</button>
      ))}
    </div>
  );
}
export function Empty({ title, body, cta, onClick }) {
  return (
    <Card pad={22}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, color: C.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, marginBottom: cta ? 16 : 0 }}>{body}</div>
      {cta && <button onClick={onClick} style={btnPrimary}>{cta}</button>}
    </Card>
  );
}
export function Splash() {
  return <div style={{ ...page, alignItems: "center", justifyContent: "center" }}>
    <div style={{ color: C.muted, fontFamily: FONT_MONO, fontSize: 13 }}>loading…</div>
  </div>;
}
export function ConfigNotice() {
  return (
    <div style={{ ...page, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 360 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, marginBottom: 10 }}>FitCut isn’t configured yet</div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
          Add your Supabase URL and anon key to a <code style={{ color: C.teal }}>.env</code> file
          (see <code style={{ color: C.teal }}>.env.example</code>), then restart the dev server.
        </div>
      </div>
    </div>
  );
}
