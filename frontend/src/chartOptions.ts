import type { ChartOptions } from "chart.js";
import type { Theme } from "./types";

type MarketChartOptions = ChartOptions<"line"> & ChartOptions<"bar">;

export const createMarketChartOptions = (
  theme: Theme
): MarketChartOptions => {
  const muted = theme === "dark" ? "#8c9bb0" : "#667085";
  const grid = theme === "dark" ? "#1d2b3c" : "#e6eaf0";
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: { color: muted, boxWidth: 14, usePointStyle: true }
      },
      zoom: {
        limits: { x: { min: "original", max: "original", minRange: 2 } },
        pan: { enabled: true, mode: "x", threshold: 6 },
        zoom: {
          wheel: { enabled: true, speed: 0.08 },
          pinch: { enabled: true },
          mode: "x"
        }
      }
    },
    scales: {
      x: { ticks: { color: muted }, grid: { color: grid } },
      y: { ticks: { color: muted }, grid: { color: grid } }
    }
  };
};
