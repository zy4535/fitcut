import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { C, FONT_DISPLAY, btnGhost } from "./ui.jsx";

export default function Scanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current, (result, _e, controls) => {
      controlsRef.current = controls;
      if (cancelled) { controls.stop(); return; }
      if (result) { controls.stop(); onResult(result.getText()); }
    }).then((c) => { controlsRef.current = c; if (cancelled) c.stop(); })
      .catch(() => setErr("Couldn’t open the camera. Allow camera access for this site and try again."));
    return () => { cancelled = true; try { controlsRef.current?.stop(); } catch {} };
  }, [onResult]);

  return (
    <div style={overlay}>
      <div style={{ width: "100%", maxWidth: 440, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: C.text, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16 }}>Scan a barcode</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text, cursor: "pointer", display: "flex" }}><X size={22} /></button>
        </div>
        <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: "#000", aspectRatio: "3 / 4" }}>
          <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
          <div style={{ position: "absolute", inset: "28% 12%", border: `2px solid ${C.teal}`, borderRadius: 10, boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }} />
        </div>
        {err ? <div style={{ color: C.over, fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>{err}</div>
             : <div style={{ color: C.muted, fontSize: 12, marginTop: 12, textAlign: "center" }}>Point the camera at a product barcode.</div>}
        <button onClick={onClose} style={{ ...btnGhost, marginTop: 14, width: "100%" }}>Cancel</button>
      </div>
    </div>
  );
}
const overlay = { position: "fixed", inset: 0, zIndex: 50, background: "rgba(8,11,15,0.96)", display: "flex", alignItems: "center", justifyContent: "center" };
