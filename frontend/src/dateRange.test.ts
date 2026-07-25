import { describe, expect, it } from "vitest";
import { getDateWindow } from "./dateRange";

describe("차트 조회 기간", () => {
  const today = new Date(2026, 6, 26);

  it("기간의 시작일과 종료일을 포함해 계산한다", () => {
    expect(getDateWindow("day", today)).toEqual({
      startDate: "2026-07-26",
      endDate: "2026-07-26"
    });
    expect(getDateWindow("week", today)).toEqual({
      startDate: "2026-07-20",
      endDate: "2026-07-26"
    });
    expect(getDateWindow("month", today)).toEqual({
      startDate: "2026-06-27",
      endDate: "2026-07-26"
    });
    expect(getDateWindow("quarter", today)).toEqual({
      startDate: "2026-04-28",
      endDate: "2026-07-26"
    });
    expect(getDateWindow("halfYear", today)).toEqual({
      startDate: "2026-01-28",
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
