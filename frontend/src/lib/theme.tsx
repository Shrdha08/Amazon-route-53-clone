"use client";

import { applyTheme } from "@cloudscape-design/components/theming";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

/** The real console uses orange primary buttons with dark text. */
const ORANGE = {
  colorBackgroundButtonPrimaryDefault: "#ff9900",
  colorBackgroundButtonPrimaryHover: "#ec8d00",
  colorBackgroundButtonPrimaryActive: "#d98200",
  colorBorderButtonPrimaryDefault: "#ff9900",
  colorBorderButtonPrimaryHover: "#ec8d00",
  colorBorderButtonPrimaryActive: "#d98200",
  colorTextButtonPrimaryDefault: "#0f1b2a",
  colorTextButtonPrimaryHover: "#0f1b2a",
  colorTextButtonPrimaryActive: "#0f1b2a",
};

const STORAGE_KEY = "r53-theme";
const ThemeContext = createContext<ThemeState | null>(null);

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    applyTheme({
      theme: { tokens: Object.fromEntries(Object.entries(ORANGE).map(([k, v]) => [k, { light: v, dark: v }])) },
    });
  }, []);

  // Read the saved preference after mount so server and client markup match.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readStoredTheme());
  }, []);

  useEffect(() => {
    applyMode(theme === "dark" ? Mode.Dark : Mode.Light);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage unavailable: the choice just won't persist */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
