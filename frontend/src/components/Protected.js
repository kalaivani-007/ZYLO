"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Protected({ children }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setReady(true);
    });
  }, [router]);
  if (!ready) return <main className="center-page"><div className="panel">Opening your ZYLO workspace…</div></main>;
  return children;
}
