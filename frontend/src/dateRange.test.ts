import { describe, expect, it } from "vitest";
import { getDateWindow } from "./dateRange";

describe("차트 조회 기간", () => {
  const today = new Date(2026, 6, 26);

  it("기간의 시작일과 종료일을 포함해 계산한다", () => {
    expect(getDateWindow("week", today)).toEqual({
      startDate: "2026-07-20",
      endDate: "2026-07-26"
    });
    expect(getDateWindow("twentyDays", today)).toEqual({
      startDate: "2026-07-07",
      endDate: "2026-07-26"
    });
  });

  it("전체 기간은 수집원이 제공하는 과거 범위를 요청한다", () => {
    expect(getDateWindow("all", today)).toEqual({
      startDate: "2000-01-01",
      endDate: "2026-07-26"
    });
  });

  it("브라우저 시간대와 무관하게 KST 자정 경계를 사용한다", () => {
    const justAfterKstMidnight = new Date("2026-07-25T15:30:00Z");

    expect(getDateWindow("week", justAfterKstMidnight)).toEqual({
      startDate: "2026-07-20",
      endDate: "2026-07-26"
    });
  });
});
