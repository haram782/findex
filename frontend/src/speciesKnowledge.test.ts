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
});
