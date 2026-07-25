import type { ChartType, Plugin } from "chart.js";
import type { Theme } from "./types";

export const getCurrentPriceColor = (
  changeRate: number | null,
  theme: Theme
): string => {
  if (changeRate === null) {
    return theme === "dark" ? "#48a3ff" : "#1474e5";
  }
  return changeRate >= 0 ? "#ff5874" : "#398dff";
};

export const createCurrentPriceGuide = (
  getPrice: () => number | null,
  getChangeRate: () => number | null,
  getTheme: () => Theme
): Plugin<ChartType> => ({
  id: "currentPriceGuide",
  afterDraw(chart) {
    const price = getPrice();
    const priceScale = chart.scales.price;
    if (price === null || !priceScale) {
      return;
    }
    const y = priceScale.getPixelForValue(price);
    const { ctx, chartArea } = chart;
    if (y < chartArea.top || y > chartArea.bottom) {
      return;
    }

    const color = getCurrentPriceColor(getChangeRate(), getTheme());
    const label = Math.round(price).toLocaleString("ko-KR");
    const badgeWidth = Math.max(58, ctx.measureText(label).width + 16);
    const badgeX = Math.min(
      chartArea.right + 4,
      chart.width - badgeWidth - 2
    );

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.fillRect(badgeX, y - 11, badgeWidth, 22);
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, badgeX + badgeWidth / 2, y);
    ctx.restore();
  }
});
