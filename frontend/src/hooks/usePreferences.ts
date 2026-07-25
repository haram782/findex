import { useCallback, useEffect, useMemo, useState } from "react";
import type { SpeciesSnapshot, Theme } from "../types";

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

type FavoriteCandidate = Pick<
  SpeciesSnapshot,
  "key" | "species" | "status"
>;

const migrateFavoriteKeys = (
  storedKeys: ReadonlySet<string>,
  candidates: readonly FavoriteCandidate[]
): Set<string> => {
  const candidatesByLegacyKey = new Map<string, string[]>();
  candidates.forEach((candidate) => {
    const legacyKey = `${candidate.species}::${candidate.status}`;
    const keys = candidatesByLegacyKey.get(legacyKey) ?? [];
    keys.push(candidate.key);
    candidatesByLegacyKey.set(legacyKey, keys);
  });
  const migrated = new Set(storedKeys);
  storedKeys.forEach((key) => {
    const matches = candidatesByLegacyKey.get(key);
    if (!matches) {
      return;
    }
    migrated.delete(key);
    matches.forEach((candidateKey) => migrated.add(candidateKey));
  });
  return migrated;
};

export function useFavorites(
  candidates: readonly FavoriteCandidate[] = []
) {
  const [storedKeys, setStoredKeys] = useState<Set<string>>(readFavorites);
  const favoriteKeys = useMemo(
    () => migrateFavoriteKeys(storedKeys, candidates),
    [candidates, storedKeys]
  );
  useEffect(() => {
    if (candidates.length === 0) {
      return;
    }
    writePreference(FAVORITES_KEY, JSON.stringify([...favoriteKeys]));
  }, [candidates.length, favoriteKeys]);
  const toggleFavorite = useCallback((key: string) => {
    setStoredKeys((current) => {
      const next = migrateFavoriteKeys(current, candidates);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      writePreference(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }, [candidates]);
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
