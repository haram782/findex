import { describe, expect, it } from "vitest";
import {
  formatSelectionTitle,
  summarizeSelection
} from "./marketView";
import type { SpeciesSnapshot } from "./types";

describe("선택 어종 제목", () => {
  it("선택 개수에 따라 거래 화면 제목을 축약한다", () => {
    expect(formatSelectionTitle([])).toBe("어종을 선택하세요");
    expect(formatSelectionTitle(["금태"])).toBe("금태");
    expect(formatSelectionTitle(["금태", "양태"])).toBe("금태, 양태");
    expect(formatSelectionTitle(["금태", "양태", "광어", "우럭"])).toBe(
      "금태 외 3"
    );
  });

  it("같은 어종의 여러 상태는 제목에서 한 번만 표시한다", () => {
    expect(formatSelectionTitle(["금태", "금태", "양태"])).toBe(
      "금태, 양태"
    );
  });
});

describe("선택 어종 요약값", () => {
  const snapshot = (
    species: string,
    priceAvg: number | null,
    changeRate: number | null
  ): SpeciesSnapshot => ({
    key: `${species}::활::kg`,
    species,
    status: "활",
    category: "어류",
    priceUnit: "kg",
    priceAvg,
    changeRate,
    tradeAmount: 0
  });

  it("두 종류 이상 선택하면 가격과 전일대비의 산술 평균을 계산한다", () => {
    expect(
      summarizeSelection([
        snapshot("금태", 23000, -4.2),
        snapshot("양태", 5000, 1.2),
        snapshot("광어", 18000, 2)
      ])
    ).toEqual({
      priceAvg: 15333.333333333334,
      changeRate: -0.3333333333333333,
      priceUnit: "kg"
    });
  });

  it("값이 없는 어종은 평균의 분모에서 제외하고 모두 없으면 null을 반환한다", () => {
    expect(
      summarizeSelection([
        snapshot("금태", 23000, null),
        snapshot("양태", null, null)
      ])
    ).toEqual({ priceAvg: 23000, changeRate: null, priceUnit: "kg" });
    expect(
      summarizeSelection([snapshot("양태", null, null)])
    ).toEqual({ priceAvg: null, changeRate: null, priceUnit: "kg" });
  });

  it("가격 단위가 다르면 의미 없는 평균가를 만들지 않고 혼합 단위를 반환한다", () => {
    expect(
      summarizeSelection([
        snapshot("금태", 23000, -4.2),
        { ...snapshot("양태", 5000, 1.2), priceUnit: "box" }
      ])
    ).toEqual({
      priceAvg: null,
      changeRate: -1.5,
      priceUnit: "혼합"
    });
  });
});
