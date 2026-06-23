import React, { useEffect, useRef, useState } from "react";
import { X, Plus, Search, Camera, Zap, Image as ImageIcon, RotateCcw, Star } from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO, Card, Stat, Mini, Toggle, input, btnPrimary, btnGhost, foodRow, iconBtn } from "./ui.jsx";
import { round, r1, todayStr } from "../lib/calc.js";
import { searchFoods, lookupBarcode, usdaPortions, gramsToServing } from "../lib/foods.js";
import Scanner from "./Scanner.jsx";
import PhotoEstimate from "./PhotoEstimate.jsx";

export default function Food({ todayFood, recentFoods = [], targets, burned, addFood, del }) {
  const [meal, setMeal] = useState("meal");
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sel, setSel] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState("g");
  const [amount, setAmount] = useState("100");
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [scanMsg, setScanMsg] = useState(null);
  const [quick, setQuick] = useState(false);
  const [qa, setQa] = useState({ name: "", kcal: "", p: "" });
  const [lastAdded, setLastAdded] = useState(null);
  const undoTimer = useRef(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true); setSel(null);
    const t = setTimeout(async () => { const r = await searchFoods(q); setResults(r.slice(0, 8)); setSearching(false); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const eaten = todayFood.reduce((s, x) => s + x.kcal * x.qty, 0);
  const protein = todayFood.reduce((s, x) => s + x.p * x.qty, 0);
  const carbs = todayFood.reduce((s, x) => s + x.c * x.qty, 0);
  const fiber = todayFood.reduce((s, x) => s + (x.fib || 0) * x.qty, 0);
  const left = targets ? targets.budget + round(burned) - round(eaten) : null;
  const bulk = targets?.mode === "bulk";

  // central add: stamps date + meal, tracks last add for one-tap undo
  const log = async (entry) => {
    const saved = await addFood({ date: todayStr(), meal, ...entry });
    setSel(null); setQ(""); setResults([]); setScanMsg(null);
    setLastAdded(saved);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setLastAdded(null), 6000);
  };
  const undo = async () => { if (lastAdded) { await del(lastAdded.id); setLastAdded(null); } };

  const buildUnits = (item) => [
    { id: "g", label: "Grams", kind: "grams" },
    ...(item.servings || []).map((s, i) => ({ id: "s" + i, label: s.unit, kind: "serving", s })),
  ];
  const pick = async (item) => {
    if (sel === item) { setSel(null); return; }
    setSel(item);
    const base = buildUnits(item);
    setUnits(base);
    const fs = base.find((u) => u.kind === "serving");
    setUnitId(fs ? fs.id : "g"); setAmount(fs ? "1" : "100");
    if (item.per100.fdcId) {
      setLoadingUnits(true);
      const ports = await usdaPortions(item.per100.fdcId);
      setLoadingUnits(false);
      if (ports.length) {
        const extra = ports.map((p, i) => ({ id: "p" + i, label: p.label, kind: "serving", s: gramsToServing(item.per100, p.grams, p.label) }));
        setUnits([base[0], ...extra, ...base.slice(1)]);
        setUnitId(extra[0].id); setAmount("1");
      }
    }
  };
  const unit = units.find((u) => u.id === unitId) || units[0];
  const previewKcal = (item) => {
    const a = +amount || 0;
    return unit && unit.kind === "grams" ? round(item.per100.kcal * a / 100) : round(((unit && unit.s && unit.s.kcal) || 0) * a);
  };
  const addFromEditor = (item) => {
    const a = +amount || 0; if (a <= 0) return;
    if (unit && unit.kind === "grams") {
      const k = a / 100;
      log({ name: item.per100.name, unit: `${a} g`, qty: 1, kcal: round(item.per100.kcal * k), p: r1(item.per100.p * k), c: r1(item.per100.c * k), f: r1(item.per100.f * k), fib: r1(item.per100.fib * k) });
    } else {
      const s = unit.s;
      log({ name: item.per100.name, unit: s.unit, qty: a, kcal: s.kcal, p: s.p, c: s.c, f: s.f, fib: s.fib });
    }
  };

  const onBarcode = async (code) => {
    setScanning(false); setScanMsg("Looking up barcode…");
    const item = await lookupBarcode(code);
    if (item) { setQ(item.per100.name); setResults([item]); pick(item); setScanMsg(null); }
    else setScanMsg(`No product found for barcode ${code}. Try typing its name, or add it as a custom food.`);
  };

  const meals = todayFood.filter((x) => x.meal === "meal");
  const snacks = todayFood.filter((x) => x.meal === "snack");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {scanning && <Scanner onResult={onBarcode} onClose={() => setScanning(false)} />}
      {photo && <PhotoEstimate meal={meal} onAdd={log} onClose={() => setPhoto(false)} />}

      <Card>
        <div style={{ display: "flex", gap: 10 }}>
          <Stat label="Eaten" value={round(eaten)} unit="kcal" />
          <Stat label={bulk ? "To go" : "Left"} value={left != null ? round(left) : "—"} unit="kcal" accent={left == null ? C.text : left < 0 ? (bulk ? C.warn : C.over) : C.good} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Mini label="Protein" value={round(protein)} target={targets?.proteinTarget} color={C.protein} />
          <Mini label="Carbs" value={round(carbs)} color={C.warn} />
          <Mini label="Fiber" value={round(fiber)} color={C.good} />
        </div>
      </Card>

      <Toggle value={meal} onChange={setMeal} options={[["meal", "Full meal"], ["snack", "Snack"]]} />

      {/* quick actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setPhoto(true)} style={actionBtn}><Camera size={16} /> Photo estimate</button>
        <button onClick={() => setQuick((v) => !v)} style={actionBtn}><Zap size={16} /> Quick add</button>
      </div>

      {quick && (
        <Card>
          <input placeholder="Name (optional)" value={qa.name} onChange={(e) => setQa({ ...qa, name: e.target.value })} style={{ ...input, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input type="number" inputMode="numeric" placeholder="Calories" value={qa.kcal} onChange={(e) => setQa({ ...qa, kcal: e.target.value })} style={input} />
            <input type="number" inputMode="numeric" placeholder="Protein (g)" value={qa.p} onChange={(e) => setQa({ ...qa, p: e.target.value })} style={input} />
          </div>
          <button onClick={() => { if (!qa.kcal) return; log({ name: qa.name || "Quick add", unit: "entry", qty: 1, kcal: +qa.kcal, p: +qa.p || 0, c: 0, f: 0, fib: 0 }); setQa({ name: "", kcal: "", p: "" }); setQuick(false); }} style={btnPrimary}>Add</button>
        </Card>
      )}

      {/* search */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={15} color={C.faint} style={{ position: "absolute", left: 12, top: 13 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any food or brand…" style={{ ...input, paddingLeft: 34 }} />
        </div>
        <button onClick={() => { setScanMsg(null); setScanning(true); }} aria-label="Scan barcode"
          style={{ width: 46, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.teal, cursor: "pointer" }}>
          <ImageIcon size={18} />
        </button>
      </div>
      {scanMsg && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{scanMsg}</div>}

      {lastAdded && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: "rgba(88,201,122,0.12)", border: "1px solid rgba(88,201,122,0.3)" }}>
          <span style={{ fontSize: 12, color: C.good }}>Added {lastAdded.name}</span>
          <button onClick={undo} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: C.teal, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><RotateCcw size={13} /> Undo</button>
        </div>
      )}

      {/* recents — one tap to re-log */}
      {q.trim() === "" && recentFoods.length > 0 && (
        <Card pad={6}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px 8px", color: C.muted }}>
            <Star size={13} /><span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 13 }}>Recent</span>
          </div>
          {recentFoods.map((rf, i) => (
            <button key={i} onClick={() => log({ name: rf.name, unit: rf.unit, qty: rf.qty, kcal: rf.kcal, p: rf.p, c: rf.c, f: rf.f, fib: rf.fib })} style={foodRow}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rf.name}</div>
                <div style={{ fontSize: 11, color: C.faint, fontFamily: FONT_MONO }}>{rf.qty === 1 ? rf.unit : `${rf.qty} × ${rf.unit}`} · {round(rf.kcal * rf.qty)} kcal</div>
              </div>
              <Plus size={16} color={C.teal} />
            </button>
          ))}
        </Card>
      )}

      {/* search results */}
      {q.trim() !== "" && (
        <Card pad={6}>
          {searching && <div style={{ padding: 14, fontSize: 12, color: C.muted }}>Searching…</div>}
          {!searching && results.length === 0 && <div style={{ padding: 14, fontSize: 12, color: C.muted }}>No matches — try a different term, Quick add, or a photo.</div>}
          {!searching && results.map((item, i) => {
            const open = sel === item;
            return (
              <div key={i}>
                <button onClick={() => pick(item)} style={foodRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.per100.name}</div>
                    <div style={{ fontSize: 11, color: C.faint, fontFamily: FONT_MONO }}>{item.per100.kcal} kcal / 100 g · P{item.per100.p} C{item.per100.c} F{item.per100.f}</div>
                  </div>
                  <Plus size={16} color={C.teal} />
                </button>
                {open && (
                  <div style={{ padding: "4px 10px 12px" }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 4 }}>Measure {loadingUnits && "· loading portions…"}</span>
                      <select value={unitId} onChange={(e) => { setUnitId(e.target.value); const u = units.find((x) => x.id === e.target.value); setAmount(u && u.kind === "grams" ? "100" : "1"); }} style={input}>
                        {units.map((u) => <option key={u.id} value={u.id}>{u.kind === "grams" ? "Grams" : u.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="number" inputMode="decimal" value={amount} min="0" step={unit && unit.kind === "grams" ? "10" : "0.5"} onChange={(e) => setAmount(e.target.value)} style={{ ...input, width: 80, textAlign: "center" }} />
                      <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{unit && unit.kind === "grams" ? "grams" : `× ${unit ? unit.label : ""}`} = <b style={{ color: C.text, fontFamily: FONT_MONO }}>{previewKcal(item)}</b> kcal</span>
                      <button onClick={() => addFromEditor(item)} style={btnPrimary}>Add</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!searching && results.length > 0 && <div style={{ padding: "6px 10px", fontSize: 10, color: C.faint }}>Tap a food, pick a measure, Add. Data: USDA FoodData Central.</div>}
        </Card>
      )}

      <LogGroup title="Meals" items={meals} del={del} />
      <LogGroup title="Snacks" items={snacks} del={del} />
    </div>
  );
}

function LogGroup({ title, items, del }) {
  if (!items.length) return null;
  const total = items.reduce((s, x) => s + x.kcal * x.qty, 0);
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 13, color: C.muted }}>{title}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.text }}>{round(total)} kcal</span>
      </div>
      {items.map((x) => (
        <div key={x.id} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderTop: `1px solid ${C.panel2}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</div>
            <div style={{ fontSize: 11, color: C.faint, fontFamily: FONT_MONO }}>{x.qty === 1 ? x.unit : `${x.qty} × ${x.unit}`}</div>
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.text, marginRight: 10 }}>{round(x.kcal * x.qty)}</span>
          <button onClick={() => del(x.id)} style={iconBtn}><X size={14} /></button>
        </div>
      ))}
    </Card>
  );
}

const actionBtn = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 0", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" };
