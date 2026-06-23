import React, { useRef, useState } from "react";
import { X, Camera, RefreshCw } from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO, Card, input, btnPrimary, btnGhost } from "./ui.jsx";

// Resize to <=1024px and return base64 JPEG (keeps payload small + cheap).
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1024;
      let { width, height } = img;
      if (width > max || height > max) { const s = max / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s); }
      const cv = document.createElement("canvas"); cv.width = width; cv.height = height;
      cv.getContext("2d").drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/jpeg", 0.8).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}

export default function PhotoEstimate({ meal, onAdd, onClose }) {
  const fileRef = useRef(null);
  const [stage, setStage] = useState("pick"); // pick | loading | result | error
  const [errMsg, setErrMsg] = useState(null);
  const [est, setEst] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "", fiber: "", note: "" });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage("loading"); setErrMsg(null);
    try {
      const image = await fileToBase64(file);
      const r = await fetch("/api/estimate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image, media_type: "image/jpeg" }) });
      const data = await r.json();
      if (!r.ok) {
        setStage("error");
        setErrMsg(data.error === "not_configured"
          ? "Photo estimate isn’t set up yet. Add an ANTHROPIC_API_KEY in your Vercel project settings to enable it."
          : "Couldn’t estimate that photo. Try again, or log it manually.");
        return;
      }
      setEst({ name: data.name || "Meal", kcal: Math.round(data.kcal) || "", protein: Math.round(data.protein) || 0,
        carbs: Math.round(data.carbs) || 0, fat: Math.round(data.fat) || 0, fiber: Math.round(data.fiber) || 0, note: data.note || "" });
      setStage("result");
    } catch (e2) { setStage("error"); setErrMsg("Couldn’t read that image. Try another photo."); }
  };

  const save = () => {
    if (!est.kcal) return;
    onAdd({ name: est.name || "Meal (photo)", unit: "photo estimate", qty: 1, kcal: +est.kcal,
      p: +est.protein || 0, c: +est.carbs || 0, f: +est.fat || 0, fib: +est.fiber || 0 });
    onClose();
  };
  const set = (k, v) => setEst({ ...est, [k]: v });

  return (
    <div style={overlay}>
      <div style={{ width: "100%", maxWidth: 440, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: C.text, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16 }}>Estimate from photo</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text, cursor: "pointer", display: "flex" }}><X size={22} /></button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />

        {stage === "pick" && (
          <Card>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
              Take a photo of your meal and we’ll estimate the calories and macros. It’s a rough guess you can edit before saving — and the photo is never stored anywhere.
            </div>
            <button onClick={() => fileRef.current?.click()} style={{ ...btnPrimary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Camera size={18} /> Take / choose photo</button>
          </Card>
        )}

        {stage === "loading" && <Card><div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 12 }}>Estimating…</div></Card>}

        {stage === "error" && (
          <Card>
            <div style={{ color: C.over, fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>{errMsg}</div>
            <button onClick={() => setStage("pick")} style={btnGhost}>Try again</button>
          </Card>
        )}

        {stage === "result" && (
          <Card>
            <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.5, marginBottom: 10 }}>
              Estimate — adjust anything before saving.{est.note ? ` ${est.note}` : ""}
            </div>
            <input value={est.name} onChange={(e) => set("name", e.target.value)} placeholder="Name" style={{ ...input, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Labeled label="kcal"><input type="number" value={est.kcal} onChange={(e) => set("kcal", e.target.value)} style={input} /></Labeled>
              <Labeled label="Protein"><input type="number" value={est.protein} onChange={(e) => set("protein", e.target.value)} style={input} /></Labeled>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <Labeled label="Carbs"><input type="number" value={est.carbs} onChange={(e) => set("carbs", e.target.value)} style={input} /></Labeled>
              <Labeled label="Fiber"><input type="number" value={est.fiber} onChange={(e) => set("fiber", e.target.value)} style={input} /></Labeled>
              <Labeled label="Fat"><input type="number" value={est.fat} onChange={(e) => set("fat", e.target.value)} style={input} /></Labeled>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={14} /> Retake</button>
              <button onClick={save} style={btnPrimary}>Add to {meal === "snack" ? "snacks" : "meals"}</button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
function Labeled({ label, children }) {
  return <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{label}</div>{children}</div>;
}
const overlay = { position: "fixed", inset: 0, zIndex: 50, background: "rgba(8,11,15,0.96)", display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto" };
