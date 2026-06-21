import React, { useEffect, useState } from "react";
import { supabase, supabaseReady } from "./supabaseClient.js";
import Auth from "./components/Auth.jsx";
import Tracker from "./Tracker.jsx";
import { Splash, ConfigNotice } from "./components/ui.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseReady) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabaseReady) return <ConfigNotice />;
  if (!ready) return <Splash />;
  if (!session) return <Auth />;
  return <Tracker session={session} />;
}
