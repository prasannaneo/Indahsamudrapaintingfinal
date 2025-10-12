
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { AdminSetup, AdminLogin, AdminDashboard } from "./admin.jsx";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const pollId = import.meta.env.VITE_POLL_ID || "indah-samudra-painting-2025";

export default function App() {
  const [route, setRoute] = useState(window.location.hash || "");
  useEffect(() => {
    const f = () => setRoute(window.location.hash || "");
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  if (route === "#admin-setup") return <AdminSetup />;
  if (route === "#admin-login") return <AdminLogin />;
  if (route === "#admin") return <AdminDashboard />;
  return <div style={{padding:24}}>Public Voting page (existing code in your repo).</div>;
}
