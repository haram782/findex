import { describe, expect, it } from "vitest";
import { formatSelectionTitle } from "./marketView";

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
