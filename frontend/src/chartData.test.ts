import { describe, expect, it } from "vitest";
import {
  buildBarChartData,
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

  it("데이터가 없으면 빈 차트 구조를 반환한다", () => {
    expect(buildPriceChartData([])).toEqual({ labels: [], datasets: [] });
    expect(buildBarChartData([], "quantity")).toEqual({
      labels: [],
      datasets: []
    });
  });
});
