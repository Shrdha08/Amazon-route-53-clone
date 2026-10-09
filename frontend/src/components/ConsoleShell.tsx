"use client";

import {
  AppLayout,
  BreadcrumbGroup,
  Flashbar,
  Input,
  SideNavigation,
  TopNavigation,
  type BreadcrumbGroupProps,
  type FlashbarProps,
  type SideNavigationProps,
} from "@cloudscape-design/components";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import ShortcutsModal from "@/components/ShortcutsModal";
import { useAuth } from "@/lib/auth";
import { useHotkeys } from "@/lib/hotkeys";
import { useTheme } from "@/lib/theme";

interface ShellApi {
  notify: (type: "success" | "error" | "info", content: ReactNode) => void;
  setBreadcrumbs: (items: BreadcrumbGroupProps.Item[]) => void;
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
  { type: "section", text: "Traffic flow", defaultExpanded: true, items: [{ type: "link", text: "Traffic policies", href: "/traffic-policies" }] },
  { type: "link", text: "Resolver", href: "/resolver" },
];

/** 123456789012 -> 1234-5678-9012, as the console displays account IDs. */
const formatAccountId = (id: string) => id.replace(/(\d{4})(?=\d)/g, "$1-");

const NAV_LINKS = NAV_ITEMS.flatMap((i) => (i.type === "section" ? i.items : [i])).flatMap((i) =>
  i.type === "link" ? [i.href] : [],
);

/** Focus the page table filter: the last visible search box (the top bar has its own). */
function focusTableFilter() {
  const boxes = Array.from(document.querySelectorAll<HTMLInputElement>("input[type=search]")).filter((el) => el.offsetParent !== null);
  boxes[boxes.length - 1]?.focus();
}

export default function ConsoleShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [flashes, setFlashes] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbGroupProps.Item[]>([]);
  const [navOpen, setNavOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const notify = useCallback<ShellApi["notify"]>((type, content) => {
    const id = crypto.randomUUID();
    const dismiss = () => setFlashes((f) => f.filter((m) => m.id !== id));
    setFlashes((f) => [...f, { id, type, content, dismissible: true, onDismiss: dismiss }]);
    if (type !== "error") setTimeout(dismiss, 8000);
  }, []);

  const api = useMemo(() => ({ notify, setBreadcrumbs }), [notify]);

  const activeHref = NAV_LINKS.find((href) => pathname.startsWith(href)) ?? "";

  const go = (href: string) => router.push(href);

  useHotkeys({
    "?": () => setShortcutsOpen(true),
    "/": focusTableFilter,
    "g h": () => go("/hosted-zones"),
    "g d": () => go("/dashboard"),
  });

  return (
    <ShellContext.Provider value={api}>
      <div id="top-nav" style={{ position: "sticky", top: 0, zIndex: 1002 }}>
        <TopNavigation
          identity={{ href: "/hosted-zones", title: "Route 53", onFollow: (e) => { e.preventDefault(); go("/hosted-zones"); } }}
          search={<Input type="search" ariaLabel="Search" placeholder="Search" value={search} onChange={({ detail }) => setSearch(detail.value)} />}
          utilities={[
            { type: "button", text: theme === "dark" ? "Light mode" : "Dark mode", onClick: toggleTheme },
            { type: "menu-dropdown", text: "Global", ariaLabel: "Region", items: [{ id: "global", text: "Global" }] },
            {
              type: "menu-dropdown",
              text: "Support",
              items: [
                { id: "shortcuts", text: "Keyboard shortcuts" },
                { id: "docs", text: "Documentation", href: "https://docs.aws.amazon.com/route53/", external: true },
              ],
              onItemClick: ({ detail }) => detail.id === "shortcuts" && setShortcutsOpen(true),
            },
            {
              type: "menu-dropdown",
              text: user ? `${user.username} @ ${formatAccountId(user.account_id)}` : "",
              iconName: "user-profile",
              items: [
                { id: "account", text: `Account ID: ${user ? formatAccountId(user.account_id) : ""}` },
                { id: "signout", text: "Sign out" },
              ],
              onItemClick: async ({ detail }) => {
                if (detail.id === "signout") {
                  await logout();
                  router.replace("/login");
                }
              },
            },
          ]}
        />
      </div>
      <ShortcutsModal visible={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <AppLayout
        headerSelector="#top-nav"
        navigationOpen={navOpen}
        onNavigationChange={({ detail }) => setNavOpen(detail.open)}
        navigation={
          <SideNavigation
            header={{ text: "Route 53", href: "/hosted-zones" }}
            activeHref={activeHref}
            items={NAV_ITEMS}
            onFollow={(e) => { e.preventDefault(); go(e.detail.href); }}
          />
        }
        breadcrumbs={
          breadcrumbs.length > 0 && (
            <BreadcrumbGroup items={breadcrumbs} onFollow={(e) => { e.preventDefault(); go(e.detail.href); }} />
          )
        }
        notifications={<Flashbar items={flashes} stackItems />}
        toolsHide
        content={children}
      />
    </ShellContext.Provider>
  );
}
