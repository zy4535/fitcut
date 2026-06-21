import React, { useState } from "react";
import { C, FONT_MONO, Card, Stat, Label, input, btnPrimary, Empty } from "./ui.jsx";
import { r1, todayStr } from "../lib/calc.js";

export default function Weight({ weighIns, profile, addWeigh }) {
  const [w, setW] = useState("");
  const [date, setDate] = useState(todayStr());
  const bulk = profile?.mode === "bulk";

  const submit = () => { if (!w) return; addWeigh({ date, weight: +w }); setW(""); };

  const start = weighIns[0]?.weight ?? profile?.startWeight;
  const cur = weighIns[weighIns.length - 1]?.weight ?? profile?.currentWeight;
  const goal = profile?.goalWeight;
  const delta = start != null && cur != null ? cur - start : null;
  const onTrack = delta == null ? true : bulk ? delta >= 0 : delta <= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <Label>Log today’s weight</Label>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" step="0.1" placeholder="lb" value={w} onChange={(e) => setW(e.target.value)} style={input} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
          <button onClick={submit} style={btnPrimary}>Log</button>
        </div>
      </Card>

      {weighIns.length > 0 && (
        <Card>
          <Sparkline data={weighIns} goal={goal} />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Stat label="Start" value={start != null ? r1(start) : "—"} unit="lb" />
            <Stat label="Current" value={cur != null ? r1(cur) : "—"} unit="lb" />
            <Stat label="Goal" value={goal != null ? r1(goal) : "—"} unit="lb" accent={C.good} />
          </div>
          {delta != null && (
            <div style={{ marginTop: 12, fontFamily: FONT_MONO, fontSize: 13, color: onTrack ? C.good : C.warn }}>
              {delta >= 0 ? "▲" : "▼"} {r1(Math.abs(delta))} lb since start
              {goal != null && (bulk ? (goal > cur ? ` · ${r1(goal - cur)} lb to goal` : " · goal reached 🎉")
                                     : (cur > goal ? ` · ${r1(cur - goal)} lb to goal` : " · goal reached 🎉"))}
            </div>
          )}
        </Card>
      )}

      {weighIns.length === 0 && <Empty title="No weigh-ins yet"
        body="Step on the scale each morning and log it here. FitCut plots the trend so day-to-day water-weight noise doesn’t spook you." />}
    </div>
  );
}

function Sparkline({ data, goal }) {
  const W = 320, H = 90, pad = 6;
  const ws = data.map((d) => d.weight);
  const all = goal != null ? [...ws, goal] : ws;
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  const x = (i) => pad + (i / Math.max(1, data.length - 1)) * (W - 2 * pad);
  const y = (v) => pad + (1 - (v - min) / span) * (H - 2 * pad);
  const path = data.map((d, i) => `${i ? "L" : "M"} ${x(i)} ${y(d.weight)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {goal != null && <line x1={pad} x2={W - pad} y1={y(goal)} y2={y(goal)} stroke={C.good} strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />}
      <path d={path} fill="none" stroke={C.teal} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.weight)} r="3" fill={C.teal} />)}
    </svg>
  );
}
