import type { ChartInterval, TimeSeriesPoint } from "./types";

interface Aggregate {
  example: TimeSeriesPoint;
  date: string;
  priceHigh: number;
  priceLow: number;
  quantity: number;
  tradeAmount: number;
}

const seriesKey = (point: TimeSeriesPoint): string =>
  `${point.species}::${point.status}::${point.group ?? ""}`;

const mondayOf = (date: string): string => {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
};

const monthOf = (date: string): string => date.slice(0, 7);

const quarterOf = (date: string): string => {
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
};

const halfYearOf = (date: string): string => {
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));
  return `${year}-H${month <= 6 ? 1 : 2}`;
};

const bucketOf: Record<ChartInterval, (date: string) => string> = {
  day: (date) => date,
  week: mondayOf,
  month: monthOf,
  quarter: quarterOf,
  halfYear: halfYearOf
};

const byDateAndSeries = (left: TimeSeriesPoint, right: TimeSeriesPoint) =>
  left.date.localeCompare(right.date) ||
  seriesKey(left).localeCompare(seriesKey(right));

export function aggregateTimeSeries(
  points: TimeSeriesPoint[],
  interval: ChartInterval
): TimeSeriesPoint[] {
  if (interval === "day") {
    return points;
  }

  const aggregates = new Map<string, Aggregate>();

  points.forEach((point) => {
    const bucket = bucketOf[interval](point.date);
    const key = `${seriesKey(point)}::${bucket}`;
    const current = aggregates.get(key);
    if (!current) {
      aggregates.set(key, {
        example: point,
        date: point.date,
        priceHigh: point.priceHigh,
        priceLow: point.priceLow,
        quantity: point.quantity,
        tradeAmount: point.tradeAmount
      });
      return;
    }
    current.date = current.date > point.date ? current.date : point.date;
    current.priceHigh = Math.max(current.priceHigh, point.priceHigh);
    current.priceLow = Math.min(current.priceLow, point.priceLow);
    current.quantity += point.quantity;
    current.tradeAmount += point.tradeAmount;
  });

  return [...aggregates.values()]
    .map((aggregate) => ({
      ...aggregate.example,
      date: aggregate.date,
      priceAvg:
        aggregate.quantity === 0
          ? null
          : Math.round(aggregate.tradeAmount / aggregate.quantity),
      priceHigh: aggregate.priceHigh,
      priceLow: aggregate.priceLow,
      quantity: aggregate.quantity,
      tradeAmount: aggregate.tradeAmount
    }))
    .sort(byDateAndSeries);
}
