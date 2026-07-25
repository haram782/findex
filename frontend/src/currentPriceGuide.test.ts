import type { Chart, ChartType } from "chart.js";
import { describe, expect, it, vi } from "vitest";
import { createCurrentPriceGuide } from "./currentPriceGuide";

describe("현재가 가이드", () => {
  it("플러그인 생성 뒤 변경된 현재가를 읽어 점선과 가격 배지를 그린다", () => {
    let currentPrice = 23000;
    const context = {
      beginPath: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      lineTo: vi.fn(),
      measureText: vi.fn(() => ({ width: 34 })),
      moveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      setLineDash: vi.fn(),
      stroke: vi.fn()
    };
    const getPixelForValue = vi.fn(() => 50);
    const chart = {
      chartArea: { top: 10, bottom: 90, left: 20, right: 180 },
      ctx: context,
      scales: { price: { getPixelForValue } },
      width: 240
    } as unknown as Chart<ChartType>;
    const plugin = createCurrentPriceGuide(
      () => currentPrice,
      () => "light"
    );
    currentPrice = 24000;

    if (typeof plugin.afterDraw !== "function") {
      throw new Error("현재가 플러그인 draw hook이 없습니다");
    }
    plugin.afterDraw(chart, {}, {});

    expect(getPixelForValue).toHaveBeenCalledWith(24000);
    expect(context.setLineDash).toHaveBeenCalledWith([3, 3]);
    expect(context.fillText).toHaveBeenCalledWith("24,000", 211, 50);
  });
});
