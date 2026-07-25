import type { SpeciesSnapshot } from "./types";

export const SPECIES_ALIASES: Readonly<Record<string, readonly string[]>> = {
  흑점줄전갱이: ["시마아지", "shima aji"]
};

const normalizeSearchText = (value: string): string =>
  value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[\s_-]+/g, "");

export const getSpeciesAliases = (species: string): readonly string[] =>
  SPECIES_ALIASES[species] ?? [];

export const matchesSpeciesSearch = (
  item: SpeciesSnapshot,
  query: string
): boolean => {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) {
    return true;
  }

  return [
    item.species,
    item.status,
    item.category,
    ...getSpeciesAliases(item.species)
  ].some((value) => normalizeSearchText(value).includes(normalizedQuery));
};
