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

const byDateAndSeries = (left: TimeSeriesPoint, right: TimeSeriesPoint) =>
  left.date.localeCompare(right.date) ||
  seriesKey(left).localeCompare(seriesKey(right));

export function aggregateTimeSeries(
  points: TimeSeriesPoint[],
  interval: ChartInterval
): TimeSeriesPoint[] {
  if (interval === "daily") {
    return points;
  }

  const dates = [...new Set(points.map((point) => point.date))].sort();
  const dateIndexes = new Map(dates.map((date, index) => [date, index]));
  const aggregates = new Map<string, Aggregate>();

  points.forEach((point) => {
    const bucket =
      interval === "weekly"
        ? mondayOf(point.date)
        : String(Math.floor((dateIndexes.get(point.date) ?? 0) / 20));
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
