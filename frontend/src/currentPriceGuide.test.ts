import type { Chart, ChartType } from "chart.js";
import { describe, expect, it, vi } from "vitest";
import {
  buildCurrentPriceGuides,
  createCurrentPriceGuide,
  positionGuideBadges
} from "./currentPriceGuide";

describe("현재가 가이드 구성", () => {
  it("선택 어종의 평균가 데이터셋 색상으로 복수 가이드를 만든다", () => {
    expect(
      buildCurrentPriceGuides(
        [
          { species: "광어", status: "활", priceUnit: "kg", price: 18000 },
          { species: "우럭", status: "선", priceUnit: "box", price: 9000 },
          { species: "전복", status: "활", priceUnit: "kg", price: null }
        ],
        [
          {
            type: "line",
            label: "활 광어 · kg · 평균가",
            priceUnit: "kg",
            borderColor: "#2388ff"
          },
          {
            type: "line",
            label: "선 우럭 · 제주 · box · 평균가",
            priceUnit: "box",
            borderColor: "#ff5874"
          }
        ]
      )
    ).toEqual([
      { price: 18000, priceUnit: "kg", color: "#2388ff" },
      { price: 9000, priceUnit: "box", color: "#ff5874" }
    ]);
  });

  it("같은 어종과 상태라도 가격 단위가 다른 dataset에는 현재가를 연결하지 않는다", () => {
    expect(
      buildCurrentPriceGuides(
        [{ species: "광어", status: "활", priceUnit: "kg", price: 18000 }],
        [
          {
            type: "line",
            label: "활 광어 · box · 평균가",
            priceUnit: "box",
            borderColor: "#2388ff"
          }
        ]
      )
    ).toEqual([]);
  });

  it("산지·규격별 평균가가 여러 개면 전체 현재가 guide를 임의 그룹에 연결하지 않는다", () => {
    expect(
      buildCurrentPriceGuides(
        [{ species: "광어", status: "활", priceUnit: "kg", price: 18000 }],
        [
          {
            type: "line",
            label: "활 광어 · 제주 · kg · 평균가",
            priceUnit: "kg",
            borderColor: "#2388ff"
          },
          {
            type: "line",
            label: "활 광어 · 완도 · kg · 평균가",
            priceUnit: "kg",
            borderColor: "#ff5874"
          }
        ]
      )
    ).toEqual([]);
  });

  it("가까운 가격 배지는 실제 가격 순서를 유지하며 겹치지 않게 배치한다", () => {
    expect(positionGuideBadges([50, 54], 10, 100)).toEqual([50, 75]);
    expect(positionGuideBadges([54, 50], 10, 100)).toEqual([75, 50]);
    expect(positionGuideBadges([86, 90], 10, 100)).toEqual([64, 89]);
  });
});

describe("현재가 가이드 그리기", () => {
  it("각 가격의 실제 위치에 선을 그리고 겹친 우측 배지만 분리한다", () => {
    const badgeColors: string[] = [];
    const context = {
      beginPath: vi.fn(),
      fillRect: vi.fn(function (this: { fillStyle: string }) {
        badgeColors.push(this.fillStyle);
      }),
      fillStyle: "",
      fillText: vi.fn(),
      font: "",
      lineTo: vi.fn(),
      lineWidth: 0,
      measureText: vi.fn(() => ({ width: 34 })),
      moveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      setLineDash: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: "",
      textAlign: "center",
      textBaseline: "middle"
    };
    const getPixelForValue = vi
      .fn()
      .mockReturnValueOnce(50)
      .mockReturnValueOnce(54);
    const chart = {
      chartArea: { top: 10, bottom: 100, left: 20, right: 180 },
      ctx: context,
      scales: { price: { getPixelForValue } },
      width: 260
    } as unknown as Chart<ChartType>;
    const plugin = createCurrentPriceGuide(() => [
      { price: 18000, priceUnit: "kg", color: "#2388ff" },
      { price: 17500, priceUnit: "box", color: "#ff5874" }
    ]);

    if (typeof plugin.afterDraw !== "function") {
      throw new Error("현재가 플러그인 draw hook이 없습니다");
    }
    plugin.afterDraw(chart, {}, {});

    expect(getPixelForValue).toHaveBeenNthCalledWith(1, 18000);
    expect(getPixelForValue).toHaveBeenNthCalledWith(2, 17500);
    expect(context.moveTo).toHaveBeenNthCalledWith(1, 20, 50);
    expect(context.moveTo).toHaveBeenNthCalledWith(2, 20, 54);
    expect(context.fillRect).toHaveBeenNthCalledWith(1, 184, 39, 58, 22);
    expect(context.fillRect).toHaveBeenNthCalledWith(2, 184, 64, 58, 22);
    expect(context.fillText).toHaveBeenNthCalledWith(
      1,
      "18,000원/kg",
      213,
      50
    );
    expect(context.fillText).toHaveBeenNthCalledWith(
      2,
      "17,500원/box",
      213,
      75
    );
    expect(badgeColors).toEqual(["#2388ff", "#ff5874"]);
  });

  it("긴 가격 단위 배지를 canvas 안에서 생략 표시한다", () => {
    const context = {
      beginPath: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: "",
      fillText: vi.fn(),
      font: "",
      lineTo: vi.fn(),
      lineWidth: 0,
      measureText: vi.fn((value: string) => ({ width: value.length * 10 })),
      moveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      setLineDash: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: "",
      textAlign: "center",
      textBaseline: "middle"
    };
    const chart = {
      chartArea: { top: 10, bottom: 100, left: 20, right: 180 },
      ctx: context,
      scales: { price: { getPixelForValue: () => 50 } },
      width: 260
    } as unknown as Chart<ChartType>;
    const plugin = createCurrentPriceGuide(() => [
      {
        price: 18000,
        priceUnit: "매우긴원본포장단위이름이계속이어지는경우",
        color: "#2388ff"
      }
    ]);

    if (typeof plugin.afterDraw !== "function") {
      throw new Error("현재가 플러그인 draw hook이 없습니다");
    }
    plugin.afterDraw(chart, {}, {});

    const [badgeX, , badgeWidth] = context.fillRect.mock.calls[0];
    expect(badgeWidth).toBeLessThanOrEqual(160);
    expect(badgeX + badgeWidth).toBeLessThanOrEqual(258);
    expect(context.fillText.mock.calls[0][0]).toMatch(/…$/);
  });
});
