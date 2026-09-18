"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo,
        }
      );

      if (error) {
        setError(error.message);
        return;
      }

      setMessage(
        "Password reset link sent. Check your email and open the link to create a new password."
      );
    } catch {
      setError("Unable to send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="center-page">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="eyebrow">ZYLO Account Recovery</div>

        <h1>Forgot password?</h1>

        <p className="muted">
          Enter the email address connected to your ZYLO account.
        </p>

        <div className="field">
          <label>Email</label>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </button>

        {message && <div className="notice">{message}</div>}
        {error && <div className="error">{error}</div>}

        <p className="muted">
          Remember your password? <Link href="/login">Back to login</Link>
        </p>
      </form>
    </main>
  );
}