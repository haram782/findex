import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { useEffect, useMemo, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import { buildBarChartData, buildPriceChartData } from "../chartData";
import { createMarketChartOptions } from "../chartOptions";
import type { Theme, TimeSeriesPoint, VolumeMetric } from "../types";

ChartJS.register(
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
}

export function MarketCharts({
  points,
  volumeMetric,
  theme
}: MarketChartsProps) {
  const priceChart = useRef<ChartJS<"line"> | null>(null);
  const volumeChart = useRef<ChartJS<"bar"> | null>(null);
  const priceOptions = useMemo(
    () => createMarketChartOptions(theme),
    [theme]
  );
  const volumeOptions = useMemo(
    () => createMarketChartOptions(theme),
    [theme]
  );

  const eachChart = (
    action: (chart: ChartJS<"line"> | ChartJS<"bar">) => void
  ) => {
    if (priceChart.current) {
      action(priceChart.current);
    }
    if (volumeChart.current) {
      action(volumeChart.current);
    }
  };

  const changeZoom = (factor: number) =>
    eachChart((chart) => chart.zoom({ x: factor }));
  const resetZoom = () => eachChart((chart) => chart.resetZoom());

  useEffect(() => {
    priceChart.current?.resetZoom();
    volumeChart.current?.resetZoom();
  }, [points]);

  return (
    <div className="chart-area">
      <div className="chart-controls">
        <span>휠로 확대 · 드래그로 이동</span>
        <button aria-label="차트 확대" onClick={() => changeZoom(1.2)}>
          +
        </button>
        <button aria-label="차트 축소" onClick={() => changeZoom(0.8)}>
          −
        </button>
        <button onClick={resetZoom}>초기화</button>
      </div>
      <div className="chart-stack">
        <section className="chart-panel price-chart">
          <Line
            ref={priceChart}
            data={buildPriceChartData(points)}
            options={priceOptions}
          />
        </section>
        <section className="chart-panel volume-chart">
          <Bar
            ref={volumeChart}
            data={buildBarChartData(points, volumeMetric)}
            options={volumeOptions}
          />
        </section>
      </div>
    </div>
  );
}
