import { describe, expect, it } from "vitest";
import {
  combinePriceUnits,
  formatPriceWithUnit,
  normalizePriceUnit
} from "./priceUnit";

describe("가격 단위 표시", () => {
  it("가격과 단일 포장 단위를 함께 표시한다", () => {
    expect(formatPriceWithUnit(13686, "kg")).toBe("13,686원/kg");
  });

  it("서로 다른 단위나 이미 혼합된 단위를 혼합으로 결합한다", () => {
    expect(combinePriceUnits(["kg", "kg"])).toBe("kg");
    expect(combinePriceUnits(["kg", "box"])).toBe("혼합");
    expect(combinePriceUnits(["", "미상"])).toBe("혼합");
    expect(combinePriceUnits(["혼합"])).toBe("혼합");
    expect(formatPriceWithUnit(13686, "혼합")).toBe("13,686원/혼합");
  });

  it("비어 있는 단위는 미상으로 표시하고 가격이 없으면 단위를 붙이지 않는다", () => {
    expect(normalizePriceUnit("")).toBe("미상");
    expect(normalizePriceUnit("  ")).toBe("미상");
    expect(normalizePriceUnit(null)).toBe("미상");
    expect(formatPriceWithUnit(null, "kg")).toBe("-");
  });

  it("선택이 없거나 빈 단위만 있으면 미상으로 결합한다", () => {
    expect(combinePriceUnits([])).toBe("미상");
    expect(combinePriceUnits(["", "  "])).toBe("미상");
  });
});
