import type { SpeciesSnapshot } from "./types";
import { combinePriceUnits } from "./priceUnit";

export function formatSelectionTitle(speciesNames: string[]): string {
  const uniqueNames = [...new Set(speciesNames)];
  if (uniqueNames.length === 0) {
    return "어종을 선택하세요";
  }
  if (uniqueNames.length <= 2) {
    return uniqueNames.join(", ");
  }
  return `${uniqueNames[0]} 외 ${uniqueNames.length - 1}`;
}

const averageAvailable = (
  items: SpeciesSnapshot[],
  select: (item: SpeciesSnapshot) => number | null
): number | null => {
  const values = items.map(select).filter((value) => value !== null);
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
};

export function summarizeSelection(items: SpeciesSnapshot[]): {
  priceAvg: number | null;
  changeRate: number | null;
  priceUnit: string;
} {
  const priceUnit = combinePriceUnits(items.map((item) => item.priceUnit));
  return {
    priceAvg:
      priceUnit === "혼합"
        ? null
        : averageAvailable(items, (item) => item.priceAvg),
    changeRate: averageAvailable(items, (item) => item.changeRate),
    priceUnit
  };
}
