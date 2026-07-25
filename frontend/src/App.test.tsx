import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const { useDashboardMock } = vi.hoisted(() => ({
  useDashboardMock: vi.fn()
}));

vi.mock("./hooks/useDashboard", () => ({
  useDashboard: useDashboardMock
}));

vi.mock("./hooks/usePreferences", () => ({
  useFavorites: () => ({
    favoriteKeys: new Set<string>(),
    toggleFavorite: vi.fn()
  }),
  useTheme: () => ({
    theme: "dark",
    setTheme: vi.fn()
  })
}));

vi.mock("./components/MarketCharts", () => ({
  MarketCharts: () => <div data-testid="market-charts" />
}));

vi.mock("./components/MarketOverview", () => ({
  MarketOverview: () => <div data-testid="market-overview" />
}));

vi.mock("./components/SpeciesSidebar", () => ({
  SpeciesSidebar: () => <aside data-testid="species-sidebar" />
}));

describe("시장 시세 툴바", () => {
  beforeEach(() => {
    useDashboardMock.mockClear();
    useDashboardMock.mockReturnValue({
      snapshots: [],
      points: [],
      loading: false,
      error: null
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("요청한 기간 버튼만 순서대로 표시하고 집계 단위 버튼을 제거한다", () => {
    render(<App />);

    const range = screen.getByLabelText("조회 기간");
    expect(
      within(range)
        .getAllByRole("button")
        .map((button) => button.textContent)
    ).toEqual(["1일", "1주", "1개월", "3개월", "6개월"]);
    expect(screen.queryByLabelText("차트 집계 단위")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "일봉" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "주봉" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "20일봉" })
    ).not.toBeInTheDocument();
  });

  it("3개월을 기본 조회 기간으로 선택한다", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "3개월" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("기간 선택을 API 조회 시작일과 종료일에 반영한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T16:00:00Z"));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "1개월" }));

    expect(useDashboardMock).toHaveBeenLastCalledWith(
      expect.any(Set),
      "none",
      "2026-06-27",
      "2026-07-26"
    );
  });
});
