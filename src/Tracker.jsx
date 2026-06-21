import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Home, Utensils, Activity, Scale, Settings, TrendingUp, TrendingDown } from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO, FONT_BODY, page, shell, topbar, scroll, navbar, navBtn, Splash } from "./components/ui.jsx";
import { deriveTargets, todayStr, round } from "./lib/calc.js";
import * as db from "./lib/db.js";
import Today from "./components/Today.jsx";
import Food from "./components/Food.jsx";
import Cardio from "./components/Cardio.jsx";
import Weight from "./components/Weight.jsx";
import Setup from "./components/Setup.jsx";

export default function Tracker({ session }) {
  const uid = session.user.id;
  const today = todayStr();
  const [tab, setTab] = useState("today");
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState(null);
  const [weighIns, setWeighIns] = useState([]);
  const [food, setFood] = useState([]);
  const [cardio, setCardio] = useState([]);

  const reload = useCallback(async () => {
    const [p, w, fl, cl] = await Promise.all([
      db.fetchProfile(uid), db.fetchWeighIns(uid), db.fetchFood(uid, today), db.fetchCardio(uid, today),
    ]);
    setProfile(p); setWeighIns(w); setFood(fl); setCardio(cl);
  }, [uid, today]);

  useEffect(() => { reload().finally(() => setLoaded(true)); }, [reload]);

  // Keep devices fresh: refetch when the tab/window regains focus.
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") reload(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [reload]);

  const targets = useMemo(() => deriveTargets(profile), [profile]);
  const eaten = food.reduce((s, x) => s + x.kcal * x.qty, 0);
  const burned = cardio.reduce((s, x) => s + x.kcal, 0);
  const proteinEaten = food.reduce((s, x) => s + x.p * x.qty, 0);
  const carbsEaten = food.reduce((s, x) => s + x.c * x.qty, 0);
  const fatEaten = food.reduce((s, x) => s + x.f * x.qty, 0);
  const fiberEaten = food.reduce((s, x) => s + (x.fib || 0) * x.qty, 0);
  const latestWeight = weighIns.length ? weighIns[weighIns.length - 1].weight : profile?.currentWeight ?? 160;

  // handlers
  const onSaveProfile = async (p) => setProfile(await db.saveProfile(uid, p));
  const onAddFood = async (e) => { const saved = await db.addFood(uid, e); setFood((l) => [...l, saved]); };
  const onDelFood = async (id) => { setFood((l) => l.filter((x) => x.id !== id)); await db.deleteFood(id); };
  const onAddCardio = async (e) => { const saved = await db.addCardio(uid, e); setCardio((l) => [...l, saved]); };
  const onDelCardio = async (id) => { setCardio((l) => l.filter((x) => x.id !== id)); await db.deleteCardio(id); };
  const onAddWeigh = async (w) => {
    const saved = await db.addWeighIn(uid, w);
    setWeighIns((l) => [...l, saved].sort((a, b) => a.date.localeCompare(b.date)));
  };

  if (!loaded) return <Splash />;

  return (
    <div style={page}>
      <div style={shell}>
        <header style={topbar}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: "-0.02em", fontSize: 19 }}>
            Fit<span style={{ color: C.teal }}>Cut</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {targets && <ModePill mode={targets.mode} />}
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.faint }}>
              {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </span>
        </header>

        <main style={scroll}>
          {tab === "today" && <Today {...{ profile, targets, eaten, burned, proteinEaten, carbsEaten, fatEaten, fiberEaten, setTab }} />}
          {tab === "food" && <Food {...{ todayFood: food, targets, burned, addFood: onAddFood, del: onDelFood }} />}
          {tab === "cardio" && <Cardio {...{ weightLb: latestWeight, todayCardio: cardio, addCardio: onAddCardio, del: onDelCardio }} />}
          {tab === "weight" && <Weight {...{ weighIns, profile, addWeigh: onAddWeigh }} />}
          {tab === "setup" && <Setup {...{ profile, save: onSaveProfile }} />}
        </main>

        <nav style={navbar}>
          {[["today", Home, "Today"], ["food", Utensils, "Food"], ["cardio", Activity, "Cardio"], ["weight", Scale, "Weight"], ["setup", Settings, "Goal"]].map(([k, Icon, label]) => (
            <button key={k} onClick={() => setTab(k)} style={navBtn(tab === k)}>
              <Icon size={20} strokeWidth={tab === k ? 2.4 : 1.8} />
              <span style={{ fontSize: 10, fontFamily: FONT_BODY }}>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function ModePill({ mode }) {
  const bulk = mode === "bulk";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FONT_MONO, fontSize: 10,
      fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 999,
      color: bulk ? C.warn : C.good, background: bulk ? "rgba(232,179,57,0.14)" : "rgba(88,201,122,0.14)" }}>
      {bulk ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{bulk ? "Bulk" : "Cut"}
    </span>
  );
}
