import { describe, expect, it } from "vitest";
import {
  buildBarChartData,
  buildMarketChartData,
  buildPriceChartData,
  getSeriesKey
} from "./chartData";
import type { TimeSeriesPoint } from "./types";

const points: TimeSeriesPoint[] = [
  {
    date: "2026-07-24",
    species: "광어",
    status: "활",
    group: "제주",
    priceAvg: 18000,
    priceHigh: 22000,
    priceLow: 15000,
    quantity: 12,
    tradeAmount: 216000
  },
  {
    date: "2026-07-25",
    species: "광어",
    status: "활",
    group: "제주",
    priceAvg: 19000,
    priceHigh: 23000,
    priceLow: 16000,
    quantity: 10,
    tradeAmount: 190000
  },
  {
    date: "2026-07-25",
    species: "우럭",
    status: "선",
    group: null,
    priceAvg: 9000,
    priceHigh: 12000,
    priceLow: 7000,
    quantity: 30,
    tradeAmount: 270000
  }
];

describe("차트 데이터 변환", () => {
  it("날짜를 정렬하고 어종·상태·그룹별 평균가/고가/저가 라인을 만든다", () => {
    const chart = buildPriceChartData(points);

    expect(chart.labels).toEqual(["2026-07-24", "2026-07-25"]);
    expect(chart.datasets).toHaveLength(6);
    expect(chart.datasets[0]).toMatchObject({
      label: "활 광어 · 제주 · 평균가",
      data: [18000, 19000]
    });
    expect(chart.datasets[3]).toMatchObject({
      label: "선 우럭 · 평균가",
      data: [null, 9000]
    });
  });

  it("최고가와 최저가 선은 기본 토글을 끈 상태로 만든다", () => {
    const chart = buildPriceChartData(points);

    expect(chart.datasets[0].hidden).not.toBe(true);
    expect(chart.datasets[1].hidden).toBe(true);
    expect(chart.datasets[2].hidden).toBe(true);
  });

  it("수량과 거래대금 중 요청한 하나의 bar dataset만 만든다", () => {
    const quantity = buildBarChartData(points, "quantity");
    const amount = buildBarChartData(points, "tradeAmount");

    expect(quantity.datasets).toHaveLength(2);
    expect(quantity.datasets[0]).toMatchObject({
      label: "활 광어 · 제주 · 수량",
      data: [12, 10]
    });
    expect(amount.datasets[0]).toMatchObject({
      label: "활 광어 · 제주 · 거래대금",
      data: [216000, 190000]
    });
    expect(getSeriesKey(points[0])).toBe("광어::활::제주");
  });

  it("가격선과 거래량 막대를 동일한 날짜 축 데이터로 통합한다", () => {
    const chart = buildMarketChartData(points, "quantity");

    expect(chart.labels).toEqual(["2026-07-24", "2026-07-25"]);
    expect(chart.datasets).toHaveLength(8);
    expect(chart.datasets[0]).toMatchObject({
      type: "line",
      yAxisID: "price",
      label: "활 광어 · 제주 · 평균가"
    });
    expect(chart.datasets[6]).toMatchObject({
      type: "bar",
      yAxisID: "volume",
      label: "활 광어 · 제주 · 수량",
      maxBarThickness: 10,
      data: [
        { x: 0, y: 12 },
        { x: 1, y: 10 }
      ]
    });
  });

  it("축소 시 드러날 날짜 여백을 가격선과 거래량에 함께 추가한다", () => {
    const chart = buildMarketChartData(points, "quantity", 2);

    expect(chart.labels).toEqual([
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
      "2026-07-27"
    ]);
    expect(chart.datasets[0].data).toEqual([
      { x: 0, y: null },
      { x: 1, y: null },
      { x: 2, y: 18000 },
      { x: 3, y: 19000 },
      { x: 4, y: null },
      { x: 5, y: null }
    ]);
    expect(chart.datasets[6].data).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 12 },
      { x: 3, y: 10 },
      { x: 4, y: 0 },
      { x: 5, y: 0 }
    ]);
  });

  it("단일 주봉에서도 주 단위 날짜 여백을 유지한다", () => {
    const chart = buildMarketChartData(
      [points[0]],
      "quantity",
      1,
      "week"
    );

    expect(chart.labels).toEqual([
      "2026-07-17",
      "2026-07-24",
      "2026-07-31"
    ]);
  });

  it("월봉은 실제 월 길이에 맞춘 날짜 여백을 만든다", () => {
    const chart = buildMarketChartData(
      [
        { ...points[0], date: "2026-07-20" },
        { ...points[1], date: "2026-07-21" }
      ],
      "quantity",
      1,
      "month"
    );

    expect(chart.labels).toEqual([
      "2026-06-20",
      "2026-07-20",
      "2026-07-21",
      "2026-08-21"
    ]);
  });

  it("월봉 날짜 여백은 짧은 달의 마지막 날로 보정한다", () => {
    const chart = buildMarketChartData(
      [{ ...points[0], date: "2026-01-31" }],
      "quantity",
      1,
      "month"
    );

    expect(chart.labels).toEqual([
      "2025-12-31",
      "2026-01-31",
      "2026-02-28"
    ]);
  });

  it("데이터가 없으면 빈 차트 구조를 반환한다", () => {
    expect(buildPriceChartData([])).toEqual({ labels: [], datasets: [] });
    expect(buildBarChartData([], "quantity")).toEqual({
      labels: [],
      datasets: []
    });
    expect(buildMarketChartData([], "quantity")).toEqual({
      labels: [],
      datasets: []
    });
  });
});
