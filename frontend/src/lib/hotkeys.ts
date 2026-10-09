"use client";

import { useEffect, useRef } from "react";

export type HotkeyMap = Record<string, () => void>;

const SEQUENCE_TIMEOUT_MS = 1000;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Register keyboard shortcuts while the calling component is mounted.
 * Keys are single characters ("/", "?", "c") or two-key sequences ("g h").
 * Ignored while typing in a field or when a modifier key is held.
 */
export function useHotkeys(map: HotkeyMap) {
  const mapRef = useRef(map);
  useEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    let pending: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const reset = () => {
      pending = null;
      clearTimeout(timer);
    };

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      // Closed modals stay in the DOM but have no layout box.
      if (Array.from(document.querySelectorAll("[role=dialog]")).some((el) => el.getClientRects().length > 0)) return;

      const handlers = mapRef.current;
      if (pending) {
        const handler = handlers[`${pending} ${e.key}`];
        reset();
        if (handler) {
          e.preventDefault();
          handler();
          return;
        }
      }
      if (handlers[e.key]) {
        e.preventDefault();
        handlers[e.key]();
      } else if (Object.keys(handlers).some((k) => k.startsWith(`${e.key} `))) {
        pending = e.key;
        timer = setTimeout(reset, SEQUENCE_TIMEOUT_MS);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      reset();
    };
  }, []);
}
