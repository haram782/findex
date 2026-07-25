import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardApi } from "../api/client";
import type { GroupBy, TimeSeriesPoint } from "../types";
import { useDashboard } from "./useDashboard";

vi.mock("../api/client", () => ({
  dashboardApi: {
    getCatalog: vi.fn(),
    getSnapshots: vi.fn(),
    getTimeSeries: vi.fn()
  }
}));

const point: TimeSeriesPoint = {
  date: "2026-07-24",
  species: "광어",
  status: "활",
  group: null,
  priceAvg: 18000,
  priceHigh: 22000,
  priceLow: 15000,
  quantity: 12,
  tradeAmount: 216000
};

describe("대시보드 데이터 훅", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(dashboardApi.getCatalog).mockResolvedValue([
      { species: "광어", status: "활", category: "어류" }
    ]);
    vi.mocked(dashboardApi.getSnapshots).mockResolvedValue([
      {
        key: "광어::활",
        species: "광어",
        status: "활",
        category: "어류",
        priceAvg: 18000,
        changeRate: -2.4
      }
    ]);
  });

  it("목록과 선택 시계열을 불러와 상태를 갱신한다", async () => {
    vi.mocked(dashboardApi.getTimeSeries).mockResolvedValue([point]);
    const selectedKeys = new Set(["광어::활"]);

    const { result } = renderHook(() => useDashboard(selectedKeys, "none"));

    await waitFor(() => expect(result.current.points).toEqual([point]));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.snapshots[0].key).toBe("광어::활");
  });

  it("분리 기준 변경 시 이전 시계열 요청을 취소한다", async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(dashboardApi.getTimeSeries).mockImplementation(
      (_selections, _groupBy, signal) => {
        signals.push(signal);
        return new Promise(() => undefined);
      }
    );
    const selectedKeys = new Set(["광어::활"]);
    const { rerender } = renderHook(
      ({ groupBy }: { groupBy: GroupBy }) =>
        useDashboard(selectedKeys, groupBy),
      { initialProps: { groupBy: "none" as GroupBy } }
    );
    await waitFor(() => expect(signals).toHaveLength(1));

    rerender({ groupBy: "origin" });

    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });
});
