"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function submit(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Incorrect email or password. If you forgot your password, use Forgot password below."
            : error.message
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect to ZYLO. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="center-page">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="eyebrow">Welcome back</div>

        <h1>Login</h1>

        <div className="field">
          <label>Email</label>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "-4px",
            marginBottom: "12px",
          }}
        >
          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Open my homes"}
        </button>

        {error && <div className="error">{error}</div>}

        <p className="muted">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </form>
    </main>
  );
}