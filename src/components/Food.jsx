import React, { useEffect, useState } from "react";
import { X, Plus, Search, Camera } from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO, Card, Stat, Mini, Toggle, input, btnPrimary, btnGhost, foodRow, iconBtn } from "./ui.jsx";
import { round, r1, todayStr } from "../lib/calc.js";
import { searchFoods, lookupBarcode } from "../lib/foods.js";
import Scanner from "./Scanner.jsx";

export default function Food({ todayFood, targets, burned, addFood, del }) {
  const [meal, setMeal] = useState("meal");
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sel, setSel] = useState(null);          // selected { per100, serving }
  const [mode, setMode] = useState("grams");     // "serving" | "grams"
  const [amount, setAmount] = useState("100");   // servings count, or grams
  const [custom, setCustom] = useState(false);
  const [cf, setCf] = useState({ name: "", unit: "serving", kcal: "", p: "", c: "", f: "", fib: "" });
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true); setSel(null);
    const t = setTimeout(async () => { const r = await searchFoods(q); setResults(r); setSearching(false); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const eaten = todayFood.reduce((s, x) => s + x.kcal * x.qty, 0);
  const protein = todayFood.reduce((s, x) => s + x.p * x.qty, 0);
  const carbs = todayFood.reduce((s, x) => s + x.c * x.qty, 0);
  const fiber = todayFood.reduce((s, x) => s + (x.fib || 0) * x.qty, 0);
  const left = targets ? targets.budget + round(burned) - round(eaten) : null;
  const bulk = targets?.mode === "bulk";

  const pick = (item) => {
    if (sel === item) { setSel(null); return; }
    setSel(item);
    if (item.serving) { setMode("serving"); setAmount("1"); }
    else { setMode("grams"); setAmount("100"); }
  };

  // live preview kcal for the open panel
  const previewKcal = (item) => {
    const a = +amount || 0;
    return mode === "grams" ? round(item.per100.kcal * a / 100) : round((item.serving?.kcal ?? 0) * a);
  };

  const commit = (item) => {
    const a = +amount || 0;
    if (a <= 0) return;
    let entry;
    if (mode === "grams") {
      const k = a / 100;
      entry = { unit: `${a} g`, qty: 1, kcal: round(item.per100.kcal * k), p: r1(item.per100.p * k),
        c: r1(item.per100.c * k), f: r1(item.per100.f * k), fib: r1(item.per100.fib * k) };
    } else {
      const s = item.serving;
      entry = { unit: s.unit, qty: a, kcal: s.kcal, p: s.p, c: s.c, f: s.f, fib: s.fib };
    }
    addFood({ date: todayStr(), meal, name: item.per100.name, ...entry });
    setSel(null); setQ(""); setResults([]); setScanMsg(null);
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

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={15} color={C.faint} style={{ position: "absolute", left: 12, top: 13 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any food or brand…" style={{ ...input, paddingLeft: 34 }} />
        </div>
        <button onClick={() => { setScanMsg(null); setScanning(true); }} aria-label="Scan barcode"
          style={{ width: 46, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.teal, cursor: "pointer" }}>
          <Camera size={18} />
        </button>
      </div>
      {scanMsg && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{scanMsg}</div>}

      {!custom && q.trim() !== "" && (
        <Card pad={6}>
          {searching && <div style={{ padding: 14, fontSize: 12, color: C.muted }}>Searching…</div>}
          {!searching && results.length === 0 && <div style={{ padding: 14, fontSize: 12, color: C.muted }}>No matches — try a different term or add it as a custom food.</div>}
          {!searching && results.map((item, i) => {
            const open = sel === item;
            return (
              <div key={i}>
                <button onClick={() => pick(item)} style={foodRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.per100.name}</div>
                    <div style={{ fontSize: 11, color: C.faint, fontFamily: FONT_MONO }}>{item.per100.kcal} kcal · P{item.per100.p} C{item.per100.c} Fib{item.per100.fib} F{item.per100.f} / 100 g</div>
                  </div>
                  <Plus size={16} color={C.teal} />
                </button>
                {open && (
                  <div style={{ padding: "4px 10px 12px" }}>
                    <div style={{ marginBottom: 8 }}>
                      <Toggle value={mode} onChange={setMode}
                        options={item.serving ? [["serving", item.serving.unit], ["grams", "Grams"]] : [["grams", "Grams"]]} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="number" inputMode="decimal" value={amount} min="0" step={mode === "grams" ? "10" : "0.5"}
                        onChange={(e) => setAmount(e.target.value)} style={{ ...input, width: 80, textAlign: "center" }} />
                      <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>
                        {mode === "grams" ? "grams" : `× ${item.serving.unit}`} = <b style={{ color: C.text, fontFamily: FONT_MONO }}>{previewKcal(item)}</b> kcal
                      </span>
                      <button onClick={() => commit(item)} style={btnPrimary}>Add</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ padding: "6px 10px", fontSize: 10, color: C.faint }}>Typed search: USDA FoodData Central · Barcodes: Open Food Facts</div>
        </Card>
      )}

      <button onClick={() => setCustom((v) => !v)} style={btnGhost}>{custom ? "Cancel custom food" : "+ Add custom food"}</button>

      {custom && (
        <Card>
          <div style={{ fontSize: 11, color: C.faint, marginBottom: 8, lineHeight: 1.4 }}>Enter the macros for one serving (or for a known amount), then log it.</div>
          <input placeholder="Name" value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} style={{ ...input, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input placeholder="Unit (1 egg, 30 g…)" value={cf.unit} onChange={(e) => setCf({ ...cf, unit: e.target.value })} style={input} />
            <input placeholder="kcal" type="number" value={cf.kcal} onChange={(e) => setCf({ ...cf, kcal: e.target.value })} style={input} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input placeholder="Protein" type="number" value={cf.p} onChange={(e) => setCf({ ...cf, p: e.target.value })} style={input} />
            <input placeholder="Carbs" type="number" value={cf.c} onChange={(e) => setCf({ ...cf, c: e.target.value })} style={input} />
            <input placeholder="Fiber" type="number" value={cf.fib} onChange={(e) => setCf({ ...cf, fib: e.target.value })} style={input} />
            <input placeholder="Fat" type="number" value={cf.f} onChange={(e) => setCf({ ...cf, f: e.target.value })} style={input} />
          </div>
          <button onClick={() => {
            if (!cf.name || !cf.kcal) return;
            addFood({ date: todayStr(), meal, name: cf.name, unit: cf.unit || "serving", qty: 1,
              kcal: +cf.kcal, p: +cf.p || 0, c: +cf.c || 0, f: +cf.f || 0, fib: +cf.fib || 0 });
            setCf({ name: "", unit: "serving", kcal: "", p: "", c: "", f: "", fib: "" }); setCustom(false);
          }} style={btnPrimary}>Add to log</button>
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
