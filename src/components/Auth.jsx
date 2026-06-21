import React, { useState } from "react";
import { supabase } from "../supabaseClient.js";
import { C, FONT_DISPLAY, page, input, btnPrimary } from "./ui.jsx";

export default function Auth() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg(null); setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        setMsg({ ok: true, text: "Account created. If email confirmation is on, check your inbox, then sign in." });
        setMode("signin");
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message || "Something went wrong." });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ ...page, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", marginBottom: 4 }}>
          Fit<span style={{ color: C.teal }}>Cut</span>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>
          {mode === "signin" ? "Sign in to your tracker." : "Create your account."}
        </div>
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...input, marginBottom: 10 }} />
        <input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ ...input, marginBottom: 16 }} />
        <button onClick={submit} disabled={busy || !email || !pw} style={{ ...btnPrimary, opacity: busy || !email || !pw ? 0.5 : 1, marginBottom: 14 }}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        {msg && (
          <div style={{ fontSize: 12, color: msg.ok ? C.good : C.over, marginBottom: 14, lineHeight: 1.5 }}>{msg.text}</div>
        )}
        <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
          style={{ background: "transparent", border: "none", color: C.teal, fontSize: 13, cursor: "pointer", padding: 0 }}>
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
