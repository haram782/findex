import { describe, expect, it } from "vitest";
import { aggregateTimeSeries } from "./chartInterval";
import type { TimeSeriesPoint } from "./types";

const point = (
  date: string,
  overrides: Partial<TimeSeriesPoint> = {}
): TimeSeriesPoint => ({
  date,
  species: "금태",
  status: "선",
  group: null,
  priceAvg: 100,
  priceHigh: 120,
  priceLow: 80,
  quantity: 2,
  tradeAmount: 200,
  ...overrides
});

describe("시계열 봉 집계", () => {
  it("일봉은 원본 일별 데이터를 유지한다", () => {
    const points = [point("2026-07-20"), point("2026-07-21")];

    expect(aggregateTimeSeries(points, "daily")).toEqual(points);
  });

  it("주봉은 수량 가중평균과 구간 고가·저가·합계를 계산한다", () => {
    const result = aggregateTimeSeries(
      [
        point("2026-07-20"),
        point("2026-07-21", {
          priceAvg: 400,
          priceHigh: 450,
          priceLow: 350,
          quantity: 1,
          tradeAmount: 400
        })
      ],
      "weekly"
    );

    expect(result).toEqual([
      point("2026-07-21", {
        priceAvg: 200,
        priceHigh: 450,
        priceLow: 80,
        quantity: 3,
        tradeAmount: 600
      })
    ]);
  });

  it("20일봉은 21개 거래일을 두 구간으로 나눈다", () => {
    const points = Array.from({ length: 21 }, (_, index) =>
      point(`2026-07-${String(index + 1).padStart(2, "0")}`)
    );

    const result = aggregateTimeSeries(points, "twentyDay");

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: "2026-07-20",
      quantity: 40,
      tradeAmount: 4000
    });
    expect(result[1]).toMatchObject({
      date: "2026-07-21",
      quantity: 2,
      tradeAmount: 200
    });
  });

  it("서로 다른 어종과 그룹은 같은 봉에서 섞지 않는다", () => {
    const result = aggregateTimeSeries(
      [
        point("2026-07-20"),
        point("2026-07-20", { species: "양태" }),
        point("2026-07-20", { group: "제주" })
      ],
      "weekly"
    );

    expect(result).toHaveLength(3);
  });
});
