export type GroupBy = "none" | "origin" | "spec";
export type VolumeMetric = "quantity" | "tradeAmount";
export type ChartInterval = "day" | "week" | "month" | "quarter" | "halfYear";
export type MarketTab = "market" | "profile" | "news";
export type Theme = "dark" | "light";

export interface SpeciesSelection {
  species: string;
  status: string;
}

export interface PriceSelection extends SpeciesSelection {
  priceUnit: string;
}

export interface CatalogItem extends SpeciesSelection {
  category: string;
}

export interface SpeciesSnapshot extends CatalogItem {
  key: string;
  priceUnit: string;
  priceAvg: number | null;
  changeRate: number | null;
  tradeAmount: number;
}

export interface TimeSeriesPoint extends SpeciesSelection {
  date: string;
  group: string | null;
  priceUnit: string;
  priceAvg: number | null;
  priceHigh: number;
  priceLow: number;
  quantity: number;
  tradeAmount: number;
}

export interface SpeciesProfile {
  species: string;
  season: string;
  mainOrigins: string[];
  features: string;
  handlingNotes: string;
  imageUrl: string;
  sourceUrls: string[];
  generatedBy: string;
  generatedAt: string | null;
  reviewedAt: string | null;
}
