import React, { useState } from "react";
import { X } from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO, Card, Field, Label, input, btnPrimary, iconBtn } from "./ui.jsx";
import { acsmTreadmill, metCardio, CARDIO_METS, round, todayStr } from "../lib/calc.js";

export default function Cardio({ weightLb, todayCardio, addCardio, del }) {
  const [act, setAct] = useState("Treadmill");
  const [speed, setSpeed] = useState("3.5");
  const [incline, setIncline] = useState("4");
  const [mins, setMins] = useState("30");
  const [manual, setManual] = useState(false);
  const [manualKcal, setManualKcal] = useState("");

  const auto = act === "Treadmill"
    ? acsmTreadmill(+speed || 0, +incline || 0, +mins || 0, weightLb)
    : metCardio(CARDIO_METS[act] ?? 6, +mins || 0, weightLb);
  const kcal = manual ? (+manualKcal || 0) : auto;

  const log = () => {
    if (kcal <= 0) return;
    const detail = act === "Treadmill" ? `${speed} mph · ${incline}% · ${mins} min` : `${mins} min`;
    addCardio({ date: todayStr(), activity: act, kcal: round(kcal), detail });
    setManualKcal("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <Label>Activity</Label>
        <select value={act} onChange={(e) => setAct(e.target.value)} style={{ ...input, marginBottom: 12 }}>
          {["Treadmill", ...Object.keys(CARDIO_METS)].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        {act === "Treadmill" ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Field label="Speed (mph)" value={speed} onChange={setSpeed} />
            <Field label="Incline (%)" value={incline} onChange={setIncline} />
            <Field label="Minutes" value={mins} onChange={setMins} />
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}><Field label="Minutes" value={mins} onChange={setMins} /></div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: C.panel2, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: C.muted }}>{manual ? "Manual entry" : "Estimated burn"}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, color: C.teal }}>{round(kcal)} <span style={{ fontSize: 12, color: C.muted }}>kcal</span></span>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.muted, marginBottom: manual ? 10 : 14, cursor: "pointer" }}>
          <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
          Enter calories manually (use the machine’s readout)
        </label>
        {manual && <input type="number" placeholder="kcal" value={manualKcal} onChange={(e) => setManualKcal(e.target.value)} style={{ ...input, marginBottom: 14 }} />}

        <button onClick={log} style={btnPrimary}>Log cardio</button>
        {act === "Treadmill" && !manual && (
          <div style={{ fontSize: 11, color: C.faint, marginTop: 10, lineHeight: 1.5 }}>
            Estimated with the ACSM {(+speed || 0) < 4 ? "walking" : "running"} equation from your speed, incline, and current weight ({round(weightLb)} lb).
          </div>
        )}
      </Card>

      {todayCardio.length > 0 && (
        <Card>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 13, color: C.muted, marginBottom: 8 }}>Today</div>
          {todayCardio.map((x) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderTop: `1px solid ${C.panel2}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text }}>{x.activity}</div>
                <div style={{ fontSize: 11, color: C.faint, fontFamily: FONT_MONO }}>{x.detail}</div>
              </div>
              <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.teal, marginRight: 10 }}>{x.kcal}</span>
              <button onClick={() => del(x.id)} style={iconBtn}><X size={14} /></button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
