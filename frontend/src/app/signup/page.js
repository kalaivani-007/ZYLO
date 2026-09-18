"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function submit(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setMessage(
        "Check your email to continue. If this email already has a ZYLO account, use Login or Forgot password."
      );
    } catch {
      setError("Unable to connect to ZYLO. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="center-page">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="eyebrow">Join ZYLO</div>

        <h1>Create account</h1>

        <div className="field">
          <label>Name</label>
          <input
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
          />
        </div>

        <div className="field">
          <label>Confirm Password</label>
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Enter password again"
          />
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create my ZYLO account"}
        </button>

        {message && <div className="notice">{message}</div>}
        {error && <div className="error">{error}</div>}

        <p className="muted">
          Already registered? <Link href="/login">Login</Link>
        </p>

        <p className="muted">
          Forgot your password?{" "}
          <Link href="/forgot-password">Reset it here</Link>
        </p>
      </form>
    </main>
  );
}