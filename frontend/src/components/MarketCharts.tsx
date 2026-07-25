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
import { Bar, Line } from "react-chartjs-2";
import { buildBarChartData, buildPriceChartData } from "../chartData";
import type { TimeSeriesPoint, VolumeMetric } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

interface MarketChartsProps {
  points: TimeSeriesPoint[];
  volumeMetric: VolumeMetric;
}

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: {
    legend: {
      labels: { color: "#9caac0", boxWidth: 14, usePointStyle: true }
    }
  },
  scales: {
    x: { ticks: { color: "#74849b" }, grid: { color: "#1c2939" } },
    y: { ticks: { color: "#74849b" }, grid: { color: "#1c2939" } }
  }
};

export function MarketCharts({ points, volumeMetric }: MarketChartsProps) {
  return (
    <div className="chart-stack">
      <section className="chart-panel price-chart">
        <Line data={buildPriceChartData(points)} options={commonOptions} />
      </section>
      <section className="chart-panel volume-chart">
        <Bar
          data={buildBarChartData(points, volumeMetric)}
          options={commonOptions}
        />
      </section>
    </div>
  );
}
