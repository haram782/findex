import { describe, expect, it } from "vitest";
import {
  getSpeciesAliases,
  matchesSpeciesSearch
} from "./speciesKnowledge";
import type { SpeciesSnapshot } from "./types";

const item: SpeciesSnapshot = {
  key: "흑점줄전갱이::선::kg",
  species: "흑점줄전갱이",
  status: "선",
  category: "어류",
  priceUnit: "kg",
  priceAvg: 42000,
  changeRate: 1.5,
  tradeAmount: 800000
};

describe("LLM Wiki 어종 다른 이름", () => {
  it("표준 어종명에 연결된 다른 이름을 제공한다", () => {
    expect(getSpeciesAliases("흑점줄전갱이")).toContain("시마아지");
  });

  it("표준 어종명과 다른 이름을 공백·대소문자 차이 없이 검색한다", () => {
    expect(matchesSpeciesSearch(item, "흑점 줄전갱이")).toBe(true);
    expect(matchesSpeciesSearch(item, "시마아지")).toBe(true);
    expect(matchesSpeciesSearch(item, "SHIMA AJI")).toBe(true);
    expect(matchesSpeciesSearch(item, "광어")).toBe(false);
  });

  it("금태(눈볼대)를 표준명으로 검색해도 찾을 수 있다", () => {
    expect(getSpeciesAliases("금태")).toContain("눈볼대");
    expect(
      matchesSpeciesSearch(
        { ...item, species: "금태", key: "금태::선::kg" },
        "눈볼대"
      )
    ).toBe(true);
  });

  it("양태를 지역 명칭 장대로 검색해도 찾을 수 있다", () => {
    expect(
      matchesSpeciesSearch(
        { ...item, species: "양태", key: "양태::선::kg" },
        "장대"
      )
    ).toBe(true);
  });
});
