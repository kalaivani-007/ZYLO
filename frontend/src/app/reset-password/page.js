"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
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

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Password updated successfully!");

    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }

  return (
    <main className="center-page">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="eyebrow">ZYLO Account Recovery</div>

        <h1>Create new password</h1>

        <p className="muted">
          Enter a new password for your ZYLO account.
        </p>

        <div className="field">
          <label>New Password</label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
          />
        </div>

        <div className="field">
          <label>Confirm Password</label>
          <input
            required
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Enter password again"
          />
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>

        {error && <div className="error">{error}</div>}
        {message && <div>{message}</div>}
      </form>
    </main>
  );
}
