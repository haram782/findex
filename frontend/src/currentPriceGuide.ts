import type { ChartType, Plugin } from "chart.js";
import type { Theme } from "./types";

export const createCurrentPriceGuide = (
  getPrice: () => number | null,
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

    const color = getTheme() === "dark" ? "#48a3ff" : "#1474e5";
    const label = Math.round(price).toLocaleString("ko-KR");
    const badgeWidth = Math.max(54, ctx.measureText(label).width + 14);
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
    ctx.fillRect(badgeX, y - 10, badgeWidth, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, badgeX + badgeWidth / 2, y);
    ctx.restore();
  }
});
