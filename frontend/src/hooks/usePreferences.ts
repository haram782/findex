import { useCallback, useState } from "react";
import type { Theme } from "../types";

const FAVORITES_KEY = "findex-favorites";
const THEME_KEY = "findex-theme";

const writePreference = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const readFavorites = (): Set<string> => {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? stored.map(String) : []);
  } catch {
    return new Set();
  }
};

export function useFavorites() {
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(readFavorites);
  const toggleFavorite = useCallback((key: string) => {
    setFavoriteKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      writePreference(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);
  return { favoriteKeys, toggleFavorite };
}

const readTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    return "dark";
  }
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

export function useTheme() {
  const [theme, updateTheme] = useState<Theme>(readTheme);
  const setTheme = useCallback((next: Theme) => {
    writePreference(THEME_KEY, next);
    updateTheme(next);
  }, []);
  return { theme, setTheme };
}
