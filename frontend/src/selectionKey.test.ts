import { describe, expect, it } from "vitest";
import {
  createSelectionKey,
  parseSelectionKey
} from "./selectionKey";

describe("가격 선택 key", () => {
  it("어종·상태·가격 단위를 하나의 key로 만들고 복원한다", () => {
    const selection = {
      species: "광어",
      status: "활",
      priceUnit: "kg"
    };

    const key = createSelectionKey(selection);

    expect(key).toBe("광어::활::kg");
    expect(parseSelectionKey(key)).toEqual(selection);
  });

  it("빈 가격 단위와 원문 미상을 내부 key에서 구분한다", () => {
    const blank = createSelectionKey({
      species: "광어",
      status: "활",
      priceUnit: ""
    });
    const literal = createSelectionKey({
      species: "광어",
      status: "활",
      priceUnit: "미상"
    });

    expect(blank).toBe("광어::활::");
    expect(literal).toBe("광어::활::미상");
    expect(parseSelectionKey(blank)?.priceUnit).toBe("");
  });

  it("필드가 부족하거나 어종이 빈 key는 복원하지 않는다", () => {
    expect(parseSelectionKey("광어::활")).toBeNull();
    expect(parseSelectionKey("::활::kg")).toBeNull();
  });
});
