"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);

  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function prepareRecoverySession() {
      try {
        // PKCE recovery links can return a ?code=...
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }
        }

        // Supabase may also restore the session automatically
        // from the recovery link.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (mounted) {
          setRecoveryReady(Boolean(session));
          setChecking(false);
        }
      } catch {
        if (mounted) {
          setRecoveryReady(false);
          setChecking(false);
          setError(
            "This password reset link is invalid or has expired. Please request a new reset link."
          );
        }
      }
    }

    prepareRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setRecoveryReady(true);
        setChecking(false);
        setError("");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setMessage("");

    if (!recoveryReady) {
      setError(
        "Your password reset session is not active. Please request a new reset link."
      );
      return;
    }

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
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage("Password updated successfully. Redirecting to login...");

      // End the recovery session so the user signs in normally
      // with the new password.
      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch {
      setError("Unable to update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="center-page">
        <div className="panel auth-card">
          <div className="eyebrow">ZYLO Account Recovery</div>
          <h1>Checking reset link...</h1>
          <p className="muted">
            Please wait while ZYLO verifies your password reset session.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="center-page">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="eyebrow">ZYLO Account Recovery</div>

        <h1>Create new password</h1>

        {recoveryReady ? (
          <>
            <p className="muted">
              Enter a new password for your ZYLO account.
            </p>

            <div className="field">
              <label>New Password</label>
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
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Your reset link is invalid or has expired.
            </p>

            <Link className="btn" href="/forgot-password">
              Request a new reset link
            </Link>
          </>
        )}

        {error && <div className="error">{error}</div>}
        {message && <div className="notice">{message}</div>}

        <p className="muted">
          <Link href="/login">Back to login</Link>
        </p>
      </form>
    </main>
  );
}