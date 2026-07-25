import { describe, expect, it } from "vitest";
import {
  formatCompactTradeAmount,
  sortSnapshots
} from "./marketTable";
import type { SpeciesSnapshot } from "./types";

const item = (
  species: string,
  tradeAmount: number,
  changeRate: number | null
): SpeciesSnapshot => ({
  key: `${species}::활`,
  species,
  status: "활",
  category: "어류",
  priceAvg: tradeAmount / 10,
  changeRate,
  tradeAmount
});

describe("어종 시세표", () => {
  const items = [
    item("광어", 2160000, -2.4),
    item("전복", 1000000, 3.1),
    item("우럭", 0, null)
  ];

  it("기본 거래대금 내림차순으로 정렬하고 입력 배열을 보존한다", () => {
    const original = [...items];

    expect(
      sortSnapshots(items, "tradeAmount", "desc").map(({ species }) => species)
    ).toEqual(["광어", "전복", "우럭"]);
    expect(items).toEqual(original);
  });

  it("숫자 null 값은 정렬 방향과 무관하게 마지막에 둔다", () => {
    expect(
      sortSnapshots(items, "changeRate", "asc").map(({ species }) => species)
    ).toEqual(["광어", "전복", "우럭"]);
    expect(
      sortSnapshots(items, "changeRate", "desc").map(({ species }) => species)
    ).toEqual(["전복", "광어", "우럭"]);
  });

  it("거래대금을 원·만·억 단위로 축약한다", () => {
    expect(formatCompactTradeAmount(9500)).toBe("9,500원");
    expect(formatCompactTradeAmount(2160000)).toBe("216만원");
    expect(formatCompactTradeAmount(152000000)).toBe("1.5억원");
  });
});
