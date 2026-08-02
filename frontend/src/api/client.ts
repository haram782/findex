import type {
  CatalogItem,
  GroupBy,
  PriceSelection,
  SpeciesProfile,
  SpeciesSnapshot,
  TimeSeriesPoint
} from "../types";
import { createSelectionKey } from "../selectionKey";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "/api/v1"
).replace(/\/$/, "");

interface ApiList<T> {
  results: T[];
}

type ApiObject = Record<string, unknown>;

const CATEGORY_LABELS: Record<string, string> = {
  fish: "어류",
  shellfish: "패류",
  crustacean: "갑각류",
  cephalopod: "두족류",
  other: "기타"
};

const numberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const requiredNumber = (value: unknown): number => numberOrNull(value) ?? 0;

async function request<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) {
    throw new Error("시세 정보를 불러오지 못했습니다");
  }
  return response.json() as Promise<T>;
}

const normalizeCatalog = (item: ApiObject): CatalogItem => ({
  species: String(item.species ?? ""),
  status: String(item.status ?? ""),
  category:
    CATEGORY_LABELS[String(item.category ?? "other")] ??
    String(item.category ?? "기타")
});

const normalizeSnapshot = (item: ApiObject): SpeciesSnapshot => {
  const species = String(item.species ?? "");
  const status = String(item.status ?? "");
  const priceUnit = String(item.price_unit ?? "").trim();
  return {
    ...normalizeCatalog(item),
    key: createSelectionKey({ species, status, priceUnit }),
    priceUnit,
    priceAvg: numberOrNull(item.price_avg),
    changeRate: numberOrNull(item.change_rate),
    tradeAmount: requiredNumber(item.trade_amount ?? item.trade_value)
  };
};

const normalizeSpeciesProfile = (item: ApiObject): SpeciesProfile => ({
  species: String(item.species ?? ""),
  season: String(item.season ?? ""),
  mainOrigins: Array.isArray(item.main_origins)
    ? item.main_origins.map(String)
    : [],
  features: String(item.features ?? ""),
  handlingNotes: String(item.handling_notes ?? ""),
  imageUrl: String(item.image_url ?? ""),
  sourceUrls: Array.isArray(item.source_urls)
    ? item.source_urls.map(String)
    : [],
  generatedBy: String(item.generated_by ?? ""),
  generatedAt: item.generated_at ? String(item.generated_at) : null,
  reviewedAt: item.reviewed_at ? String(item.reviewed_at) : null
});

const normalizePoint = (item: ApiObject): TimeSeriesPoint => ({
  date: String(item.date ?? ""),
  species: String(item.species ?? ""),
  status: String(item.status ?? ""),
  group: item.group === null || item.group === undefined ? null : String(item.group),
  priceUnit: String(item.price_unit ?? "").trim(),
  priceAvg: numberOrNull(item.price_avg),
  priceHigh: requiredNumber(item.price_high),
  priceLow: requiredNumber(item.price_low),
  quantity: requiredNumber(item.quantity),
  tradeAmount: requiredNumber(item.trade_amount ?? item.trade_value)
});

export const dashboardApi = {
  async getCatalog(signal: AbortSignal): Promise<CatalogItem[]> {
    const body = await request<ApiList<ApiObject>>("/catalog/", signal);
    return body.results.map(normalizeCatalog);
  },

  async getSnapshots(signal: AbortSignal): Promise<SpeciesSnapshot[]> {
    const body = await request<ApiList<ApiObject>>("/snapshot/", signal);
    return body.results.map(normalizeSnapshot);
  },

  async getTimeSeries(
    selections: PriceSelection[],
    groupBy: GroupBy,
    signal: AbortSignal,
    startDate?: string,
    endDate?: string
  ): Promise<TimeSeriesPoint[]> {
    const params = new URLSearchParams({ group_by: groupBy });
    selections.forEach(({ species, status, priceUnit }) => {
      params.append("species", species);
      params.append("status", status);
      params.append("price_unit", priceUnit);
    });
    if (startDate) {
      params.set("start_date", startDate);
    }
    if (endDate) {
      params.set("end_date", endDate);
    }
    const body = await request<ApiList<ApiObject>>(
      `/timeseries/?${params.toString()}`,
      signal
    );
    return body.results.map(normalizePoint);
  },

  async getSpeciesProfile(
    species: string,
    signal: AbortSignal
  ): Promise<SpeciesProfile | null> {
    const response = await fetch(
      `${API_BASE_URL}/species-profile/${encodeURIComponent(species)}/`,
      { signal }
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error("어종 정보를 불러오지 못했습니다");
    }
    const body = (await response.json()) as ApiObject;
    return normalizeSpeciesProfile(body);
  }
};
