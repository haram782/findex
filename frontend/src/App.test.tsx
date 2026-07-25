import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const { marketChartsMock, useDashboardMock } = vi.hoisted(() => ({
  marketChartsMock: vi.fn(() => <div data-testid="market-charts" />),
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
  MarketCharts: marketChartsMock
}));

vi.mock("./components/MarketOverview", () => ({
  MarketOverview: () => <div data-testid="market-overview" />
}));

vi.mock("./components/SpeciesSidebar", () => ({
  SpeciesSidebar: () => <aside data-testid="species-sidebar" />
}));

describe("시장 시세 툴바", () => {
  beforeEach(() => {
    marketChartsMock.mockClear();
    useDashboardMock.mockClear();
    useDashboardMock.mockReturnValue({
      snapshots: [],
      points: [
        {
          date: "2026-07-20",
          species: "금태",
          status: "선",
          group: null,
          priceAvg: 100,
          priceHigh: 120,
          priceLow: 80,
          quantity: 2,
          tradeAmount: 200
        },
        {
          date: "2026-07-21",
          species: "금태",
          status: "선",
          group: null,
          priceAvg: 400,
          priceHigh: 450,
          priceLow: 350,
          quantity: 1,
          tradeAmount: 400
        }
      ],
      loading: false,
      error: null
    });
  });

  it("요청한 봉 단위 버튼만 순서대로 표시한다", () => {
    render(<App />);

    const range = screen.getByLabelText("봉 단위");
    expect(
      within(range)
        .getAllByRole("button")
        .map((button) => button.textContent)
    ).toEqual(["1일", "1주", "1개월", "3개월", "6개월"]);
    expect(screen.queryByRole("button", { name: "일봉" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "주봉" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "20일봉" })
    ).not.toBeInTheDocument();
  });

  it("1일을 기본 봉 단위로 선택하고 날짜별 데이터를 유지한다", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "1일" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(marketChartsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        chartInterval: "day",
        points: expect.arrayContaining([
          expect.objectContaining({ date: "2026-07-20" }),
          expect.objectContaining({ date: "2026-07-21" })
        ])
      }),
      expect.anything()
    );
  });

  it("1주를 선택하면 날짜별 데이터를 주 단위 봉으로 집계한다", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "1주" }));

    expect(marketChartsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        chartInterval: "week",
        points: [
          expect.objectContaining({
            date: "2026-07-21",
            priceAvg: 200,
            quantity: 3,
            tradeAmount: 600
          })
        ]
      }),
      expect.anything()
    );
  });

  it("봉 단위 변경과 무관하게 전체 수집 기간을 조회한다", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "6개월" }));

    expect(useDashboardMock).toHaveBeenLastCalledWith(
      expect.any(Set),
      "none",
      "2000-01-01",
      undefined
    );
  });
});
