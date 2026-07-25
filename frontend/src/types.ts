export type GroupBy = "none" | "origin" | "spec";
export type VolumeMetric = "quantity" | "tradeAmount";

export interface SpeciesSelection {
  species: string;
  status: string;
}

export interface CatalogItem extends SpeciesSelection {
  category: string;
}

export interface SpeciesSnapshot extends CatalogItem {
  key: string;
  priceAvg: number | null;
  changeRate: number | null;
}

export interface TimeSeriesPoint extends SpeciesSelection {
  date: string;
  group: string | null;
  priceAvg: number | null;
  priceHigh: number;
  priceLow: number;
  quantity: number;
  tradeAmount: number;
}
