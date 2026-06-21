import React, { useState } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { C, FONT_DISPLAY, Card, Stat, Field, Label, Toggle, input, btnPrimary, btnGhost } from "./ui.jsx";
import { ACTIVITY, deriveTargets } from "../lib/calc.js";

export default function Setup({ profile, save }) {
  const [f, setF] = useState(profile ?? {
    mode: "cut", sex: "male", age: "", heightIn: "", currentWeight: "", activity: "light",
    goalWeight: "", goalDate: "", startWeight: "", override: false,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF({ ...f, [k]: v });
  const ready = f.age && f.heightIn && f.currentWeight && f.goalWeight && f.goalDate;
  const bulk = f.mode === "bulk";

  const commit = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await save({ mode: f.mode, sex: f.sex, age: +f.age, heightIn: +f.heightIn, currentWeight: +f.currentWeight,
        activity: f.activity, goalWeight: +f.goalWeight, goalDate: f.goalDate, override: !!f.override,
        startWeight: f.startWeight ? +f.startWeight : +f.currentWeight });
    } finally { setBusy(false); }
  };

  const preview = ready ? deriveTargets({ mode: f.mode, sex: f.sex, age: +f.age, heightIn: +f.heightIn,
    currentWeight: +f.currentWeight, activity: f.activity, goalWeight: +f.goalWeight, goalDate: f.goalDate,
    override: f.override }) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <Label>Goal type</Label>
        <Toggle value={f.mode} onChange={(v) => set("mode", v)} options={[["cut", "Cut (lose fat)"], ["bulk", "Bulk (gain)"]]} />
        <div style={{ fontSize: 11, color: C.faint, marginTop: 8, lineHeight: 1.5 }}>
          {bulk ? "Eats above maintenance for a lean gain — set a goal weight above your current."
                : "Eats below maintenance to lose fat — set a goal weight below your current."}
        </div>
      </Card>

      <Card>
        <Label>Biological sex</Label>
        <Toggle value={f.sex} onChange={(v) => set("sex", v)} options={[["male", "Male"], ["female", "Female"]]} />
        <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
          <Field label="Age" value={f.age} onChange={(v) => set("age", v)} />
          <Field label="Height (in)" value={f.heightIn} onChange={(v) => set("heightIn", v)} />
        </div>
        <Label>Activity (excluding logged cardio)</Label>
        <select value={f.activity} onChange={(e) => set("activity", e.target.value)} style={input}>
          {ACTIVITY.map((a) => <option key={a.k} value={a.k}>{a.label}</option>)}
        </select>
      </Card>

      <Card>
        <div style={{ display: "flex", gap: 8 }}>
          <Field label="Current (lb)" value={f.currentWeight} onChange={(v) => set("currentWeight", v)} />
          <Field label="Goal (lb)" value={f.goalWeight} onChange={(v) => set("goalWeight", v)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Label>Target date</Label>
          <input type="date" value={f.goalDate} onChange={(e) => set("goalDate", e.target.value)} style={input} />
        </div>
      </Card>

      {preview && (
        <Card>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 13, color: C.muted, marginBottom: 10 }}>This gives you</div>
          <div style={{ display: "flex", gap: 10 }}>
            <Stat label={bulk ? "Daily target" : "Daily budget"} value={preview.budget} unit="kcal" accent={C.teal} />
            <Stat label="Protein" value={preview.proteinTarget} unit="g" accent={C.protein} />
            <Stat label="Pace" value={preview.paceLbWk} unit={bulk ? "lb/wk gain" : "lb/wk loss"} />
          </div>
          {preview.aggressive && !f.override && (
            <div style={{ marginTop: 10, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              Your date asks for <b style={{ color: C.text }}>{preview.requestedPaceLbWk} lb/wk</b>. Until you acknowledge the
              risks below, FitCut uses a more standard <b style={{ color: C.text }}>{preview.cappedPaceLbWk} lb/wk</b>.
            </div>
          )}
        </Card>
      )}

      {preview && preview.aggressive && (
        bulk ? <BulkWarning pace={preview.requestedPaceLbWk} checked={!!f.override} onToggle={(v) => set("override", v)} />
             : <CutWarning pace={preview.requestedPaceLbWk} checked={!!f.override} onToggle={(v) => set("override", v)} />
      )}

      <button onClick={commit} style={{ ...btnPrimary, opacity: ready && !busy ? 1 : 0.5 }}>{busy ? "Saving…" : "Save goal"}</button>
      <button onClick={() => supabase.auth.signOut()} style={btnGhost}>Sign out</button>
    </div>
  );
}

function WarnShell({ children }) {
  return (
    <div style={{ background: "rgba(229,96,77,0.08)", border: "1px solid rgba(229,96,77,0.35)", borderRadius: 14, padding: 14 }}>
      {children}
    </div>
  );
}
function Source({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.teal, fontSize: 12, textDecoration: "none" }}>
      {children} <ExternalLink size={11} />
    </a>
  );
}
function Ack({ checked, onToggle, text }) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", marginTop: 14,
      fontSize: 12, color: C.text, lineHeight: 1.5 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} style={{ marginTop: 2 }} />
      <span>{text}</span>
    </label>
  );
}

function CutWarning({ pace, checked, onToggle }) {
  return (
    <WarnShell>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={16} color={C.over} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, color: C.text }}>This is a fast pace — read this first</span>
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
        Major health bodies like the CDC recommend losing about <b style={{ color: C.text }}>1–2 lb per week</b>. Losing
        faster than that tends to strip water and <b style={{ color: C.text }}>muscle</b> alongside fat — which works directly
        against your goal of holding onto muscle — and the body adapts by slowing your metabolism. Rapid loss and very-low-calorie
        intakes also raise the risk of <b style={{ color: C.text }}>gallstones, nutrient deficiencies, fatigue, and hormonal
        disruption</b>. None of this means you can't do it — it means you should do it with a professional in the loop.
        Please talk to a doctor or registered dietitian before pushing this hard.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
        <Source href="https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html">CDC: losing weight</Source>
        <Source href="https://www.niddk.nih.gov/health-information/digestive-diseases/gallstones/dieting">NIDDK: dieting &amp; gallstones</Source>
      </div>
      <Ack checked={checked} onToggle={onToggle}
        text={`I understand the risks above, have consulted a doctor or dietitian, and want to use my full requested pace (${pace} lb/wk).`} />
    </WarnShell>
  );
}

function BulkWarning({ pace, checked, onToggle }) {
  return (
    <WarnShell>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={16} color={C.warn} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, color: C.text }}>This is a fast surplus</span>
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
        Gaining faster than roughly <b style={{ color: C.text }}>0.25–0.5 lb per week</b> generally adds more fat than muscle,
        since muscle can only be built so quickly. A leaner, slower bulk usually means less fat to cut later. Proceed if that
        tradeoff is what you want.
      </div>
      <Ack checked={checked} onToggle={onToggle}
        text={`I understand this will likely add more fat, and want to use my full requested pace (${pace} lb/wk).`} />
    </WarnShell>
  );
}
