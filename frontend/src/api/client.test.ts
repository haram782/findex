import { afterEach, describe, expect, it, vi } from "vitest";
import { dashboardApi } from "./client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("대시보드 API 클라이언트", () => {
  it("선택 어종과 group_by를 시계열 요청에 전달하고 응답을 정규화한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              date: "2026-07-25",
              species: "광어",
              status: "활",
              group: "제주",
              price_avg: 19000,
              price_high: 23000,
              price_low: 16000,
              quantity: 10,
              trade_amount: 190000
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await dashboardApi.getTimeSeries(
      [{ species: "광어", status: "활" }],
      "origin",
      new AbortController().signal,
      "2026-07-01",
      "2026-07-25"
    );

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl).toContain("species=%EA%B4%91%EC%96%B4");
    expect(requestedUrl).toContain("status=%ED%99%9C");
    expect(requestedUrl).toContain("group_by=origin");
    expect(requestedUrl).toContain("start_date=2026-07-01");
    expect(requestedUrl).toContain("end_date=2026-07-25");
    expect(result[0]).toMatchObject({
      priceAvg: 19000,
      tradeAmount: 190000
    });
  });

  it("HTTP 오류를 사용자에게 표시할 수 있는 오류로 변환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("error", { status: 503 })
    );

    await expect(
      dashboardApi.getSnapshots(new AbortController().signal)
    ).rejects.toThrow("시세 정보를 불러오지 못했습니다");
  });

  it("snapshot의 거래대금을 시세표 모델로 정규화한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              species: "광어",
              status: "활",
              category: "fish",
              price_avg: 19000,
              change_rate: -2.4,
              trade_value: 190000
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await dashboardApi.getSnapshots(
      new AbortController().signal
    );

    expect(result[0]).toMatchObject({
      species: "광어",
      priceAvg: 19000,
      changeRate: -2.4,
      tradeAmount: 190000
    });
  });
});
