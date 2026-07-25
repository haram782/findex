import type { ChartData } from "chart.js";
import type {
  ChartInterval,
  TimeSeriesPoint,
  VolumeMetric
} from "./types";

const COLORS = ["#2388ff", "#ff5874", "#2ecb81", "#f3a530", "#9b72f2"];
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS: Record<ChartInterval, number> = {
  daily: 1,
  weekly: 7,
  twentyDay: 20
};

export const getSeriesKey = (point: TimeSeriesPoint): string =>
  `${point.species}::${point.status}::${point.group ?? ""}`;

const getSeriesLabel = (point: TimeSeriesPoint): string =>
  `${point.status} ${point.species}${point.group ? ` · ${point.group}` : ""}`;

const organize = (points: TimeSeriesPoint[]) => {
  const labels = [...new Set(points.map((point) => point.date))].sort();
  const series = new Map<string, Map<string, TimeSeriesPoint>>();
  const examples = new Map<string, TimeSeriesPoint>();

  points.forEach((point) => {
    const key = getSeriesKey(point);
    if (!series.has(key)) {
      series.set(key, new Map());
      examples.set(key, point);
    }
    series.get(key)?.set(point.date, point);
  });

  return { labels, series, examples };
};

export function buildPriceChartData(
  points: TimeSeriesPoint[]
): ChartData<"line", (number | null)[], string> {
  if (points.length === 0) {
    return { labels: [], datasets: [] };
  }
  const { labels, series, examples } = organize(points);
  const datasets: ChartData<"line", (number | null)[], string>["datasets"] = [];

  /*
   * Chart.js의 공통 날짜 축에서 희소 시계열을 정확히 맞추려면 각 시리즈를 전체 날짜에
   * 투영해야 한다. 최악에는 O(시리즈×날짜)이지만 선택 어종을 5개로 제한하고 일별
   * 시장 그룹 수도 작아 현재 화면 규모에서 허용한다. 그룹 수가 커지면 {x, y} 데이터와
   * time scale을 도입해 누락값 투영을 제거한다.
   */
  [...series.entries()].forEach(([key, byDate], index) => {
    const example = examples.get(key) as TimeSeriesPoint;
    const color = COLORS[index % COLORS.length];
    const label = getSeriesLabel(example);
    const values = (field: "priceAvg" | "priceHigh" | "priceLow") =>
      labels.map((date) => byDate.get(date)?.[field] ?? null);

    datasets.push(
      {
        label: `${label} · 평균가`,
        data: values("priceAvg"),
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: 1,
        tension: 0.2
      },
      {
        label: `${label} · 고가`,
        data: values("priceHigh"),
        borderColor: color,
        borderDash: [7, 5],
        borderWidth: 1,
        hidden: true,
        pointRadius: 0
      },
      {
        label: `${label} · 저가`,
        data: values("priceLow"),
        borderColor: color,
        borderDash: [2, 4],
        borderWidth: 1,
        hidden: true,
        pointRadius: 0
      }
    );
  });

  return { labels, datasets };
}

export function buildBarChartData(
  points: TimeSeriesPoint[],
  metric: VolumeMetric
): ChartData<"bar", number[], string> {
  if (points.length === 0) {
    return { labels: [], datasets: [] };
  }
  const { labels, series, examples } = organize(points);
  const datasets: ChartData<"bar", number[], string>["datasets"] = [];

  /*
   * 가격 차트와 동일한 날짜 축 정렬 때문에 O(시리즈×날짜) 투영이 필요하다. 어종 선택은
   * 최대 5개이고 예상 날짜는 기본 90일이라 허용 가능하다. 데이터 규모가 늘면 객체형
   * 좌표와 time scale로 전환해 입력 행 수에 비례하도록 개선한다.
   */
  [...series.entries()].forEach(([key, byDate], index) => {
    const example = examples.get(key) as TimeSeriesPoint;
    const color = COLORS[index % COLORS.length];
    const suffix = metric === "quantity" ? "수량" : "거래대금";
    datasets.push({
      label: `${getSeriesLabel(example)} · ${suffix}`,
      data: labels.map((date) => byDate.get(date)?.[metric] ?? 0),
      backgroundColor: `${color}99`,
      borderColor: color,
      borderWidth: 1
    });
  });

  return { labels, datasets };
}

export function buildMarketChartData(
  points: TimeSeriesPoint[],
  metric: VolumeMetric,
  datePadding = 0,
  chartInterval: ChartInterval = "daily"
): ChartData<"line" | "bar", (number | null)[], string> {
  if (points.length === 0) {
    return { labels: [], datasets: [] };
  }
  const price = buildPriceChartData(points);
  const volume = buildBarChartData(points, metric);

  const datasets = [
      ...price.datasets.map((dataset) => ({
        ...dataset,
        type: "line" as const,
        yAxisID: "price",
        order: 1
      })),
      ...volume.datasets.map((dataset) => ({
        ...dataset,
        type: "bar" as const,
        yAxisID: "volume",
        order: 2,
        backgroundColor:
          typeof dataset.backgroundColor === "string"
            ? dataset.backgroundColor.replace(/99$/, "55")
            : dataset.backgroundColor,
        borderWidth: 0,
        barPercentage: 0.62,
        categoryPercentage: 0.74
      }))
    ];
  const labels = (price.labels ?? []).map(String);
  if (datePadding === 0) {
    return { labels, datasets };
  }

  const timestamps = labels.map((label) => Date.parse(label));
  const validTimestamps = timestamps.every(Number.isFinite);
  const interval =
    INTERVAL_DAYS[chartInterval] * DAY_IN_MILLISECONDS;
  const formatDate = (timestamp: number): string =>
    new Date(timestamp).toISOString().slice(0, 10);
  const before = validTimestamps
    ? Array.from({ length: datePadding }, (_, index) =>
        formatDate(
          timestamps[0] - (datePadding - index) * interval
        )
      )
    : Array<string>(datePadding).fill("");
  const after = validTimestamps
    ? Array.from({ length: datePadding }, (_, index) =>
        formatDate(
          timestamps[timestamps.length - 1] + (index + 1) * interval
        )
      )
    : Array<string>(datePadding).fill("");

  return {
    labels: [...before, ...labels, ...after],
    datasets: datasets.map((dataset) => {
      const emptyValue = dataset.type === "bar" ? 0 : null;
      return {
        ...dataset,
        data: [
          ...Array<number | null>(datePadding).fill(emptyValue),
          ...dataset.data,
          ...Array<number | null>(datePadding).fill(emptyValue)
        ]
      };
    })
  };
}
