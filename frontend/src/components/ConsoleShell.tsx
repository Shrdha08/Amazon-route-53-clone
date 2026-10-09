"use client";

import {
  AppLayout,
  BreadcrumbGroup,
  Flashbar,
  SideNavigation,
  type BreadcrumbGroupProps,
  type FlashbarProps,
  type SideNavigationProps,
} from "@cloudscape-design/components";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import ConsoleFooter from "@/components/ConsoleFooter";
import ConsoleHeader from "@/components/ConsoleHeader";
import ShortcutsModal from "@/components/ShortcutsModal";
import { useAuth } from "@/lib/auth";
import { useHotkeys } from "@/lib/hotkeys";
import { useTheme } from "@/lib/theme";

interface ShellApi {
  /** Show a flash message; `header` renders as the bold first line with `content` below it. */
  notify: (type: "success" | "error" | "info", content: ReactNode, header?: ReactNode) => void;
  setBreadcrumbs: (items: BreadcrumbGroupProps.Item[]) => void;
  /** Provide (or clear with null) the right-hand details panel for the current page. */
  setSidePanel: (panel: ReactNode | null) => void;
}

const ShellContext = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within ConsoleShell");
  return ctx;
}

/** Declare this page's breadcrumbs; call with a stable (memoized) array. */
export function useBreadcrumbs(items: BreadcrumbGroupProps.Item[]) {
  const { setBreadcrumbs } = useShell();
  useEffect(() => {
    setBreadcrumbs(items);
    const current = items[items.length - 1]?.text;
    document.title = current ? `${current} | Route 53 Management Console` : "Route 53 Management Console";
  }, [items, setBreadcrumbs]);
}

const NAV_ITEMS: SideNavigationProps.Item[] = [
  { type: "link", text: "Dashboard", href: "/dashboard" },
  { type: "link", text: "Hosted zones", href: "/hosted-zones" },
  { type: "link", text: "Health checks", href: "/health-checks" },
  { type: "link", text: "Profiles", href: "/profiles" },
  { type: "section", text: "IP-based routing", defaultExpanded: true, items: [{ type: "link", text: "CIDR collections", href: "/cidr-collections" }] },
  {
    type: "section",
    text: "Traffic flow",
    defaultExpanded: true,
    items: [
      { type: "link", text: "Traffic policies", href: "/traffic-policies" },
      { type: "link", text: "Policy records", href: "/policy-records" },
    ],
  },
  {
    type: "section",
    text: "Domains",
    defaultExpanded: true,
    items: [
      { type: "link", text: "Registered domains", href: "/registered-domains" },
      { type: "link", text: "Requests", href: "/requests" },
    ],
  },
  {
    type: "section",
    text: "Resolver",
    defaultExpanded: true,
    items: [
      { type: "link", text: "VPCs", href: "/resolver/vpcs" },
      { type: "link", text: "Inbound endpoints", href: "/resolver/inbound-endpoints" },
      { type: "link", text: "Outbound endpoints", href: "/resolver/outbound-endpoints" },
      { type: "link", text: "Rules", href: "/resolver/rules" },
      { type: "link", text: "Query logging", href: "/resolver/query-logging" },
      { type: "link", text: "Outposts", href: "/resolver/outposts" },
    ],
  },
];

/** 123456789012 -> 1234-5678-9012, as the console displays account IDs. */
const formatAccountId = (id: string) => id.replace(/(\d{4})(?=\d)/g, "$1-");

const NAV_LINKS = NAV_ITEMS.flatMap((i) => (i.type === "section" ? i.items : [i])).flatMap((i) =>
  i.type === "link" ? [i.href] : [],
);

/** Focus the page's table filter: the last visible filter/search box (the top bar has its own). */
function focusTableFilter() {
  const boxes = Array.from(document.querySelectorAll<HTMLInputElement>("input[type=search], input[aria-label^='Filter']")).filter(
    (el) => el.offsetParent !== null,
  );
  boxes[boxes.length - 1]?.focus();
}

export default function ConsoleShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [flashes, setFlashes] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbGroupProps.Item[]>([]);
  const [sidePanel, setSidePanelNode] = useState<ReactNode | null>(null);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const notify = useCallback<ShellApi["notify"]>((type, content, header) => {
    const id = crypto.randomUUID();
    const dismiss = () => setFlashes((f) => f.filter((m) => m.id !== id));
    setFlashes((f) => [...f, { id, type, header, content, dismissible: true, onDismiss: dismiss }]);
    if (type !== "error") setTimeout(dismiss, 8000);
  }, []);

  const setSidePanel = useCallback((panel: ReactNode | null) => {
    setSidePanelNode(panel);
    if (panel !== null) setToolsOpen(true); // a new selection reopens the panel
  }, []);

  const api = useMemo(() => ({ notify, setBreadcrumbs, setSidePanel }), [notify, setSidePanel]);

  const activeHref = NAV_LINKS.filter((href) => pathname.startsWith(href)).sort((a, b) => b.length - a.length)[0] ?? "";

  const go = (href: string) => router.push(href);

  useHotkeys({
    "?": () => setShortcutsOpen(true),
    "/": focusTableFilter,
    "g h": () => go("/hosted-zones"),
    "g d": () => go("/dashboard"),
  });

  return (
    <ShellContext.Provider value={api}>
      <ConsoleHeader
        username={user?.username ?? ""}
        accountId={user ? formatAccountId(user.account_id) : ""}
        themeLabel={theme === "dark" ? "Light mode" : "Dark mode"}
        onHome={() => go("/hosted-zones")}
        onToggleTheme={toggleTheme}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onSignOut={async () => {
          await logout();
          router.replace("/login");
        }}
      />
      <ShortcutsModal visible={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <AppLayout
        headerSelector="#top-nav"
        footerSelector="#console-footer"
        navigationOpen={navOpen}
        onNavigationChange={({ detail }) => setNavOpen(detail.open)}
        navigation={
          <SideNavigation
            header={{ text: "Route 53", href: "/hosted-zones" }}
            activeHref={activeHref}
            items={NAV_ITEMS}
            onFollow={(e) => {
              e.preventDefault();
              go(e.detail.href);
            }}
          />
        }
        breadcrumbs={
          breadcrumbs.length > 0 && (
            <BreadcrumbGroup items={breadcrumbs} onFollow={(e) => { e.preventDefault(); go(e.detail.href); }} />
          )
        }
        notifications={<Flashbar items={flashes} stackItems />}
        tools={sidePanel ?? undefined}
        toolsHide={sidePanel === null}
        toolsOpen={toolsOpen}
        onToolsChange={({ detail }) => setToolsOpen(detail.open)}
        toolsWidth={320}
        content={children}
      />
      <ConsoleFooter />
    </ShellContext.Provider>
  );
}
