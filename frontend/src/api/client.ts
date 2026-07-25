import type {
  CatalogItem,
  GroupBy,
  SpeciesSelection,
  SpeciesSnapshot,
  TimeSeriesPoint
} from "../types";

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
  return {
    ...normalizeCatalog(item),
    key: `${species}::${status}`,
    priceAvg: numberOrNull(item.price_avg),
    changeRate: numberOrNull(item.change_rate)
  };
};

const normalizePoint = (item: ApiObject): TimeSeriesPoint => ({
  date: String(item.date ?? ""),
  species: String(item.species ?? ""),
  status: String(item.status ?? ""),
  group: item.group === null || item.group === undefined ? null : String(item.group),
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
    selections: SpeciesSelection[],
    groupBy: GroupBy,
    signal: AbortSignal,
    startDate?: string,
    endDate?: string
  ): Promise<TimeSeriesPoint[]> {
    const params = new URLSearchParams({ group_by: groupBy });
    selections.forEach(({ species, status }) => {
      params.append("species", species);
      params.append("status", status);
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
  }
};
