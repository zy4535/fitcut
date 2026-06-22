import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { C, FONT_MONO, FONT_BODY, Card, Stat, Row, Macro, Empty } from "./ui.jsx";
import { round } from "../lib/calc.js";

export default function Today({ profile, targets, eaten, burned, proteinEaten, carbsEaten, fatEaten, fiberEaten, setTab }) {
  if (!profile || !targets) {
    return <Empty title="Set your goal first"
      body="Tell FitCut your stats, whether you’re cutting or bulking, your goal weight, and a target date. It’ll work out your daily calories and protein."
      cta="Set up goal" onClick={() => setTab("setup")} />;
  }
  const bulk = targets.mode === "bulk";
  const allowance = targets.budget + Math.round(burned);
  const remaining = allowance - Math.round(eaten);

  let color, subtitle;
  if (bulk) {
    if (eaten >= allowance * 0.95 && eaten <= allowance * 1.1) color = C.good;
    else if (eaten > allowance * 1.1) color = C.warn;
    else color = C.teal;
    subtitle = remaining > 0 ? `kcal to hit ${allowance}` : `kcal over your ${allowance} target`;
  } else {
    const used = eaten / allowance;
    color = remaining < 0 ? C.over : used > 0.85 ? C.warn : C.good;
    subtitle = remaining >= 0 ? `kcal left of ${allowance}` : `kcal over your ${allowance} budget`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Gauge frac={Math.min(1, eaten / allowance)} remaining={remaining} subtitle={subtitle} color={color} />
      <div style={{ display: "flex", gap: 10 }}>
        <Stat label={bulk ? "Target" : "Budget"} value={targets.budget} unit="kcal" />
        <Stat label="Eaten" value={round(eaten)} unit="kcal" />
        <Stat label="Burned" value={round(burned)} unit="kcal" accent={C.teal} />
      </div>
      <Card>
        <Row label="Protein" cur={round(proteinEaten)} target={targets.proteinTarget} unit="g" color={C.protein} />
        <Macro label="Carbs" value={round(carbsEaten)} color={C.warn} />
        <Macro label="Fiber" value={round(fiberEaten)} color={C.good} />
        <Macro label="Fat" value={round(fatEaten)} color={C.teal} last />
      </Card>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          {bulk ? <TrendingUp size={16} color={C.warn} /> : <TrendingDown size={16} color={C.good} />}
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.text }}>
            {targets.paceLbWk} lb/wk {bulk ? "gain" : "loss"} · {targets.lbsDelta} lb to {bulk ? "gain" : "go"} · {targets.days} days
          </span>
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          Maintenance ≈ {targets.tdee} kcal · daily {bulk ? "surplus" : "deficit"} {targets.adjust} kcal
        </div>
        {targets.adapted && (
          <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>
            Recalculated from your latest weigh-in ({targets.liveWeight} lb) to keep you on track for your date.
          </div>
        )}
        {targets.aggressive && (
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(232,179,57,0.12)",
            border: "1px solid rgba(232,179,57,0.3)", fontSize: 12, color: "#F0CE7E", lineHeight: 1.5 }}>
            {targets.override
              ? (bulk
                  ? "You acknowledged a fast surplus. Expect some extra fat gain; a slower bulk stays leaner."
                  : "You acknowledged a fast pace. Keep protein high, and keep a doctor or dietitian in the loop.")
              : (bulk
                  ? `Your date asks for ${targets.requestedPaceLbWk} lb/wk. FitCut is using a more standard ${targets.cappedPaceLbWk} lb/wk — acknowledge in the Goal tab to use your full pace, or push the date out.`
                  : `Your date asks for ${targets.requestedPaceLbWk} lb/wk. FitCut is using a more standard ${targets.cappedPaceLbWk} lb/wk — acknowledge the risks in the Goal tab to use your full pace, or push the date out.`)}
          </div>
        )}
      </Card>
    </div>
  );
}

function Gauge({ frac, remaining, subtitle, color }) {
  const pt = (f) => { const a = Math.PI * (1 - Math.min(1, Math.max(0, f))); return [100 + 80 * Math.cos(a), 100 - 80 * Math.sin(a)]; };
  const [bx, by] = pt(0), [ex, ey] = pt(1), [fx, fy] = pt(frac);
  return (
    <Card pad={20}>
      <svg viewBox="0 0 200 118" style={{ width: "100%", display: "block" }}>
        <path d={`M ${bx} ${by} A 80 80 0 0 1 ${ex} ${ey}`} fill="none" stroke={C.panel2} strokeWidth="14" strokeLinecap="round" />
        <path d={`M ${bx} ${by} A 80 80 0 0 1 ${fx} ${fy}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
        <text x="100" y="86" textAnchor="middle" style={{ fontFamily: FONT_MONO, fontSize: 30, fontWeight: 700, fill: color }}>{remaining}</text>
        <text x="100" y="104" textAnchor="middle" style={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.muted }}>{subtitle}</text>
      </svg>
    </Card>
  );
}
