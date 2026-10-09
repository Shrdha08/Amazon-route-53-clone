"use client";

import styles from "./console.module.css";

/** Fixed footer bar like the console's: CloudShell/Feedback on the left, legal links on the right. */
export default function ConsoleFooter() {
  return (
    <footer id="console-footer" className={styles.footer}>
      <div className={styles.footerLeft}>
        <button type="button">
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <rect x="1.5" y="2.5" width="13" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M4 6l2.5 2L4 10M8 10h4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          CloudShell
        </button>
        <button type="button">Feedback</button>
      </div>
      <div className={styles.footerRight}>
        <span>© {new Date().getFullYear()}, Amazon Web Services, Inc. or its affiliates.</span>
        <button type="button">Privacy</button>
        <button type="button">Terms</button>
        <button type="button">Cookie preferences</button>
      </div>
    </footer>
  );
}
