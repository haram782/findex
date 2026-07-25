import type { ChartOptions } from "chart.js";
import type { Theme } from "./types";

type MarketChartOptions = ChartOptions<"line" | "bar">;

export const createMarketChartOptions = (
  theme: Theme,
  volumeMaximum = 1
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
        pan: { enabled: true, mode: "x", threshold: 10 },
        zoom: {
          wheel: { enabled: true, speed: 0.03 },
          pinch: { enabled: true },
          mode: "x"
        }
      }
    },
    scales: {
      x: { ticks: { color: muted }, grid: { color: grid } },
      price: {
        type: "linear",
        axis: "y",
        position: "right",
        ticks: { color: muted },
        grid: { color: grid }
      },
      volume: {
        type: "linear",
        axis: "y",
        display: false,
        beginAtZero: true,
        min: 0,
        max: Math.max(volumeMaximum, 1) * 4.5,
        grid: { display: false }
      }
    }
  };
};
