"use client";

import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

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
