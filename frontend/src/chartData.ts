import type { ChartData } from "chart.js";
import type { TimeSeriesPoint, VolumeMetric } from "./types";

const COLORS = ["#2388ff", "#ff5874", "#2ecb81", "#f3a530", "#9b72f2"];

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
        pointRadius: 0
      },
      {
        label: `${label} · 저가`,
        data: values("priceLow"),
        borderColor: color,
        borderDash: [2, 4],
        borderWidth: 1,
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
