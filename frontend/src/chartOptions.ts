import type { ChartOptions } from "chart.js";
import type { Theme } from "./types";

type MarketChartOptions = ChartOptions<"line" | "bar">;

export const getZoomPadding = (labelCount: number): number =>
  Math.max(2, Math.ceil(labelCount * 0.5));

export const getDateTickLabel = (
  value: string | number,
  dateLabels: string[]
): string => {
  const index = Number(value);
  return Number.isInteger(index) ? dateLabels[index] ?? "" : "";
};

export const createMarketChartOptions = (
  theme: Theme,
  volumeMaximum = 1,
  labelCount = 0,
  dateLabels: string[] = []
): MarketChartOptions => {
  const muted = theme === "dark" ? "#8c9bb0" : "#667085";
  const grid = theme === "dark" ? "#1d2b3c" : "#e6eaf0";
  const zoomPadding = getZoomPadding(labelCount);
  const lastLabelIndex = Math.max(labelCount - 1, 0);
  const extendedLastLabelIndex = labelCount + zoomPadding * 2 - 1;
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { right: 72 } },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: {
          color: muted,
          boxWidth: 14,
          font: { size: 12 },
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          title: (items) => {
            const x = items[0]?.parsed.x;
            return typeof x === "number"
              ? dateLabels[Math.round(x)] ?? ""
              : "";
          }
        }
      },
      zoom: {
        limits: {
          x: {
            min: 0,
            max: extendedLastLabelIndex,
            minRange: 2
          }
        },
        pan: { enabled: true, mode: "x", threshold: 10 },
        zoom: {
          wheel: { enabled: false },
          pinch: { enabled: true },
          mode: "x"
        }
      }
    },
    scales: {
      x: {
        type: "linear",
        min: labelCount > 0 ? zoomPadding : undefined,
        max: labelCount > 0 ? zoomPadding + lastLabelIndex : undefined,
        ticks: {
          callback: (value) => getDateTickLabel(value, dateLabels),
          color: muted,
          font: { size: 12 },
          stepSize: 1
        },
        grid: { color: grid }
      },
      price: {
        type: "linear",
        axis: "y",
        position: "left",
        ticks: { color: muted, font: { size: 12 } },
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
