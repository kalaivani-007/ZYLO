"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NavBar() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="nav-shell">
      <Link href="/" className="brand">ZYLO</Link>
      <nav className="nav-links">
        <Link href="/inspiration">Ideas</Link>
        {user && <Link href="/dashboard">My Homes</Link>}
        {user && <Link href="/billing">Plan</Link>}
        {!user ? <><Link href="/login">Login</Link><Link className="btn small" href="/signup">Start designing</Link></> : <button className="ghost" onClick={logout}>Logout</button>}
      </nav>
    </header>
  );
}
