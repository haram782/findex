import type { SpeciesSnapshot } from "./types";

export type MarketSortKey =
  | "species"
  | "priceAvg"
  | "changeRate"
  | "tradeAmount";
export type SortDirection = "asc" | "desc";

const compareNames = (
  left: SpeciesSnapshot,
  right: SpeciesSnapshot
): number => {
  const speciesOrder = left.species.localeCompare(right.species, "ko-KR");
  return speciesOrder || left.status.localeCompare(right.status, "ko-KR");
};

export const sortSnapshots = (
  items: SpeciesSnapshot[],
  key: MarketSortKey,
  direction: SortDirection
): SpeciesSnapshot[] =>
  [...items].sort((left, right) => {
    if (key === "species") {
      return compareNames(left, right) * (direction === "asc" ? 1 : -1);
    }

    const leftValue = left[key];
    const rightValue = right[key];
    if (leftValue === null || rightValue === null) {
      if (leftValue === rightValue) {
        return compareNames(left, right);
      }
      return leftValue === null ? 1 : -1;
    }

    const valueOrder = leftValue - rightValue;
    if (valueOrder !== 0) {
      return valueOrder * (direction === "asc" ? 1 : -1);
    }
    return compareNames(left, right);
  });

const formatUnit = (value: number): string =>
  new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1
  }).format(value);

export const formatCompactTradeAmount = (value: number): string => {
  if (Math.abs(value) >= 100_000_000) {
    return `${formatUnit(value / 100_000_000)}억원`;
  }
  if (Math.abs(value) >= 10_000) {
    return `${formatUnit(value / 10_000)}만원`;
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
};
