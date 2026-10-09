"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AwsLogo from "@/components/AwsLogo";
import { useAuth } from "@/lib/auth";
import styles from "./login.module.css";

const ACCOUNT_KEY = "r53-account";

function readSavedAccount(): string {
  try {
    return localStorage.getItem(ACCOUNT_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [remember, setRemember] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/hosted-zones");
  }, [loading, user, router]);

  useEffect(() => {
    const saved = readSavedAccount();
    if (saved) {
      // Restoring the remembered account after mount keeps server and client markup identical.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccount(saved);
      setRemember(true);
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await login(username.trim(), password);
      try {
        if (remember) localStorage.setItem(ACCOUNT_KEY, account);
        else localStorage.removeItem(ACCOUNT_KEY);
      } catch {
        /* storage unavailable: the account just isn't remembered */
      }
      router.replace("/hosted-zones");
    } catch {
      setError("Your authentication information is incorrect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const unavailable = (what: string) => setNotice(`${what} is not available in this demo. Sign in with the IAM user credentials above.`);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <a href="#feedback" onClick={(e) => e.preventDefault()}>Provide feedback</a>
        <button type="button">Multi-session disabled ▾</button>
        <button type="button">English ▾</button>
      </div>

      <div className={styles.logo}>
        <AwsLogo />
      </div>

      <main className={styles.content}>
        {bannerOpen && (
          <div className={styles.banner} role="note">
            <span className={styles.info} aria-hidden>i</span>
            <div className={styles.bannerText}>
              <strong>Demo environment</strong>
              This is a Route 53 console clone with mocked sign-in. Use account ID <code>123456789012</code>, IAM username <code>admin</code> and password <code>admin123</code>.
            </div>
            <button type="button" className={styles.bannerClose} aria-label="Dismiss" onClick={() => setBannerOpen(false)}>×</button>
          </div>
        )}

        <div className={styles.columns}>
          <div className={styles.cardWrap}>
            <form className={styles.card} onSubmit={onSubmit}>
              <h1>
                IAM user sign in <span className={styles.info} aria-hidden>i</span>
              </h1>

              {error && <div className={`${styles.message} ${styles.messageError}`} role="alert">{error}</div>}
              {notice && <div className={`${styles.message} ${styles.messageInfo}`} role="status">{notice}</div>}

              <label className={styles.label} htmlFor="account">
                Account ID or alias{" "}
                <button type="button" className={styles.dashed} onClick={() => unavailable("Creating an account")}>(Don&apos;t have?)</button>
              </label>
              <input id="account" className={styles.input} value={account} onChange={(e) => setAccount(e.target.value)} autoComplete="off" />
              <label className={styles.check}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember this account
              </label>

              <label className={`${styles.label} ${styles.bold}`} htmlFor="username">IAM username</label>
              <input id="username" className={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />

              <label className={`${styles.label} ${styles.bold}`} htmlFor="password">Password</label>
              <input
                id="password"
                className={styles.input}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <div className={styles.row}>
                <label className={styles.check}>
                  <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                  Show Password
                </label>
                <button type="button" className={styles.dashed} onClick={() => unavailable("Password recovery")}>Having trouble?</button>
              </div>

              <button type="submit" className={styles.primary} disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </button>
              <button type="button" className={styles.secondary} onClick={() => unavailable("Root user sign-in")}>
                Sign in using root user email
              </button>
              <button type="button" className={styles.center} onClick={() => unavailable("Creating an AWS account")}>
                Create a new AWS account
              </button>
            </form>
            <p className={styles.legal}>
              By continuing, you agree to <a href="#agreement" onClick={(e) => e.preventDefault()}>AWS Customer Agreement</a> or other agreement for AWS services,
              and the <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Notice</a>. This site uses essential cookies. See our{" "}
              <a href="#cookies" onClick={(e) => e.preventDefault()}>Cookie Notice</a> for more information.
            </p>
          </div>

          <aside className={styles.promo} aria-label="Promotion">
            <h2>Amazon Route 53</h2>
            <p>A reliable and cost-effective way to route end users to internet applications</p>
            <button type="button" className={styles.promoButton}>Learn more »</button>
          </aside>
        </div>
      </main>

      <footer className={styles.footer}>© 2026 Amazon Web Services, Inc. or its affiliates. All rights reserved.</footer>
    </div>
  );
}
