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

    expect(aggregateTimeSeries(points, "day")).toEqual(points);
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
      "week"
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

  it("주봉은 일요일과 다음 월요일을 서로 다른 봉으로 나눈다", () => {
    const result = aggregateTimeSeries(
      [point("2026-07-26"), point("2026-07-27")],
      "week"
    );

    expect(result.map(({ date }) => date)).toEqual([
      "2026-07-26",
      "2026-07-27"
    ]);
  });

  it.each([
    ["month", "2026-07-31", "2026-08-01"],
    ["quarter", "2026-03-31", "2026-04-01"],
    ["halfYear", "2026-06-30", "2026-07-01"]
  ] as const)(
    "%s 봉은 달력 구간 경계에서 서로 다른 봉으로 나눈다",
    (interval, firstDate, secondDate) => {
      const result = aggregateTimeSeries(
        [point(firstDate), point(secondDate)],
        interval
      );

      expect(result).toHaveLength(2);
      expect(result.map(({ date }) => date)).toEqual([
        firstDate,
        secondDate
      ]);
    }
  );

  it("월봉은 같은 달의 거래를 하나로 집계한다", () => {
    const result = aggregateTimeSeries(
      [point("2026-07-01"), point("2026-07-31")],
      "month"
    );

    expect(result).toEqual([
      point("2026-07-31", {
        priceAvg: 100,
        quantity: 4,
        tradeAmount: 400
      })
    ]);
  });

  it("서로 다른 어종과 그룹은 같은 봉에서 섞지 않는다", () => {
    const result = aggregateTimeSeries(
      [
        point("2026-07-20"),
        point("2026-07-20", { species: "양태" }),
        point("2026-07-20", { group: "제주" })
      ],
      "week"
    );

    expect(result).toHaveLength(3);
  });
});
