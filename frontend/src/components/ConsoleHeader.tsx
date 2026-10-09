"use client";

import { Button, ButtonDropdown, Input } from "@cloudscape-design/components";
import { useEffect, useRef, useState } from "react";
import AwsLogo from "@/components/AwsLogo";
import styles from "./console.module.css";

interface Props {
  username: string;
  accountId: string;
  themeLabel: string;
  onHome: () => void;
  onToggleTheme: () => void;
  onShowShortcuts: () => void;
  onSignOut: () => void;
}

const GRID_ICON = (
  <svg viewBox="0 0 16 16" focusable="false" aria-hidden>
    {[2, 7, 12].flatMap((x) => [2, 7, 12].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="2.4" height="2.4" fill="currentColor" />))}
  </svg>
);

const TERMINAL_ICON = (
  <svg viewBox="0 0 16 16" focusable="false" aria-hidden>
    <rect x="1.5" y="2.5" width="13" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 6l2.5 2L4 10M8 10h4" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

/** Dark top bar modeled on the AWS console header: logo, Services, search, utilities, region, account. */
export default function ConsoleHeader({ username, accountId, themeLabel, onHome, onToggleTheme, onShowShortcuts, onSignOut }: Props) {
  const [search, setSearch] = useState("");
  const searchWrap = useRef<HTMLDivElement>(null);

  // Alt+S focuses the search box, as advertised by the [Alt+S] hint.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        searchWrap.current?.querySelector("input")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header id="top-nav" className={`awsui-context-top-navigation ${styles.header}`}>
      <button type="button" className={styles.logo} onClick={onHome} aria-label="Route 53 home">
        <AwsLogo width={44} textColor="#ffffff" />
      </button>
      <button type="button" className={styles.services}>
        <span className={styles.gridIcon}>{GRID_ICON}</span> Services
      </button>
      <div className={styles.search} ref={searchWrap}>
        <Input type="search" ariaLabel="Search" placeholder="Search" value={search} onChange={({ detail }) => setSearch(detail.value)} />
        {!search && <span className={styles.hint}>[Alt+S]</span>}
      </div>
      <div className={styles.spacer} />
      <Button variant="icon" iconSvg={TERMINAL_ICON} ariaLabel="CloudShell" />
      <Button variant="icon" iconName="notification" ariaLabel="Notifications" />
      <ButtonDropdown
        variant="icon"
        iconName="status-info"
        ariaLabel="Help"
        items={[
          { id: "shortcuts", text: "Keyboard shortcuts" },
          { id: "docs", text: "Documentation", href: "https://docs.aws.amazon.com/route53/", external: true },
        ]}
        onItemClick={({ detail }) => detail.id === "shortcuts" && onShowShortcuts()}
        expandToViewport
      />
      <ButtonDropdown
        variant="icon"
        iconName="settings"
        ariaLabel="Settings"
        items={[{ id: "theme", text: themeLabel }]}
        onItemClick={({ detail }) => detail.id === "theme" && onToggleTheme()}
        expandToViewport
      />
      <div className={styles.menu}>
        <ButtonDropdown items={[{ id: "global", text: "Global" }]} expandToViewport>
          Global
        </ButtonDropdown>
      </div>
      <div className={styles.menu}>
      <ButtonDropdown
        items={[
          { id: "account", text: `Account ID: ${accountId}` },
          { id: "signout", text: "Sign out" },
        ]}
        onItemClick={({ detail }) => detail.id === "signout" && onSignOut()}
        expandToViewport
      >
        {username} @ {accountId}
      </ButtonDropdown>
      </div>
    </header>
  );
}
