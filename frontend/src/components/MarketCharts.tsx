import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { useEffect, useMemo, useRef } from "react";
import { Chart } from "react-chartjs-2";
import { buildMarketChartData } from "../chartData";
import {
  createMarketChartOptions,
  getZoomPadding
} from "../chartOptions";
import {
  createCurrentPriceGuide,
  getCurrentPriceColor
} from "../currentPriceGuide";
import type {
  ChartInterval,
  Theme,
  TimeSeriesPoint,
  VolumeMetric
} from "../types";

ChartJS.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  zoomPlugin
);

interface MarketChartsProps {
  points: TimeSeriesPoint[];
  volumeMetric: VolumeMetric;
  theme: Theme;
  currentPrice: number | null;
  currentChangeRate: number | null;
  chartInterval: ChartInterval;
}

export function MarketCharts({
  points,
  volumeMetric,
  theme,
  currentPrice,
  currentChangeRate,
  chartInterval
}: MarketChartsProps) {
  const marketChart = useRef<ChartJS<"line" | "bar"> | null>(null);
  const volumeMaximum = useMemo(
    () =>
      points.reduce(
        (maximum, point) => Math.max(maximum, point[volumeMetric]),
        0
      ),
    [points, volumeMetric]
  );
  const labelCount = useMemo(
    () => new Set(points.map((point) => point.date)).size,
    [points]
  );
  const options = useMemo(
    () => createMarketChartOptions(theme, volumeMaximum, labelCount),
    [labelCount, theme, volumeMaximum]
  );
  const zoomPadding = getZoomPadding(labelCount);
  const data = useMemo(
    () =>
      buildMarketChartData(
        points,
        volumeMetric,
        zoomPadding,
        chartInterval
      ),
    [chartInterval, points, volumeMetric, zoomPadding]
  );
  const plugins = useMemo(
    () => [
      createCurrentPriceGuide(
        () => currentPrice,
        () => currentChangeRate,
        () => theme
      )
    ],
    [currentChangeRate, currentPrice, theme]
  );
  const changeZoom = (factor: number) =>
    marketChart.current?.zoom({ x: factor });
  const resetZoom = () => marketChart.current?.resetZoom();

  useEffect(() => {
    marketChart.current?.resetZoom();
  }, [points]);

  return (
    <div className="chart-area">
      <div className="chart-controls">
        {currentPrice !== null && (
          <strong
            className="current-price-chip"
            style={{ color: getCurrentPriceColor(currentChangeRate, theme) }}
          >
            현재가 {Math.round(currentPrice).toLocaleString("ko-KR")}원
          </strong>
        )}
        <span>휠로 천천히 확대 · 드래그로 이동</span>
        <button aria-label="차트 확대" onClick={() => changeZoom(1.1)}>
          +
        </button>
        <button aria-label="차트 축소" onClick={() => changeZoom(0.9)}>
          −
        </button>
        <button onClick={resetZoom}>초기화</button>
      </div>
      <div className="chart-stack">
        <section className="chart-panel market-chart">
          <Chart
            key={`${theme}-${currentPrice ?? "empty"}-${currentChangeRate ?? "flat"}`}
            ref={marketChart}
            type="bar"
            data={data}
            options={options}
            plugins={plugins}
          />
        </section>
      </div>
    </div>
  );
}
