import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chart as ChartJS } from "chart.js";
import { describe, expect, it, vi } from "vitest";
import { createMarketChartOptions } from "../chartOptions";
import type { TimeSeriesPoint } from "../types";
import { MarketCharts } from "./MarketCharts";

const chartSpies = vi.hoisted(() => ({
  reset: vi.fn(),
  zoom: vi.fn()
}));

vi.mock("chartjs-plugin-zoom", () => ({
  default: { id: "zoom" }
}));

vi.mock("react-chartjs-2", async () => {
  const React = await import("react");
  return {
    Chart: React.forwardRef<unknown, Record<string, unknown>>(
      (_props, ref) => {
        React.useImperativeHandle(ref, () => ({
          resetZoom: chartSpies.reset,
          zoom: chartSpies.zoom
        }));
        return React.createElement("div", { "data-testid": "market-chart" });
      }
    )
  };
});

const points: TimeSeriesPoint[] = [
  {
    species: "금태",
    status: "선",
    date: "2026-07-26",
    group: null,
    priceAvg: 23000,
    priceHigh: 25000,
    priceLow: 22000,
    tradeAmount: 230000,
    quantity: 10
  }
];

describe("시장 차트 확대와 이동", () => {
  it("raw 혼합 차트에 line과 bar controller를 등록한다", () => {
    expect(ChartJS.registry.getController("line")).toBeDefined();
    expect(ChartJS.registry.getController("bar")).toBeDefined();
  });

  it("가로축 휠 확대, 핀치, 드래그 이동 설정을 유지한다", () => {
    const options = createMarketChartOptions("dark");
    const zoom = options.plugins?.zoom;

    expect(zoom?.pan).toMatchObject({
      enabled: true,
      mode: "x",
      threshold: 10
    });
    expect(zoom?.zoom?.wheel).toMatchObject({
      enabled: true,
      speed: 0.03
    });
    expect(zoom?.zoom?.pinch).toMatchObject({ enabled: true });
    expect(zoom?.zoom?.mode).toBe("x");
    expect(options.scales?.price).toMatchObject({ axis: "y" });
    expect(options.scales?.volume).toMatchObject({ axis: "y" });
  });

  it("단일 통합 차트에 확대, 축소, 초기화를 적용한다", async () => {
    const user = userEvent.setup();
    render(
      <MarketCharts
        points={points}
        volumeMetric="tradeAmount"
        theme="dark"
        currentPrice={23000}
      />
    );
    chartSpies.reset.mockClear();

    await user.click(screen.getByRole("button", { name: "차트 확대" }));
    await user.click(screen.getByRole("button", { name: "차트 축소" }));
    await user.click(screen.getByRole("button", { name: "초기화" }));

    expect(screen.getByTestId("market-chart")).toBeVisible();
    expect(screen.queryByTestId("volume-chart")).not.toBeInTheDocument();
    expect(chartSpies.zoom).toHaveBeenNthCalledWith(1, { x: 1.1 });
    expect(chartSpies.zoom).toHaveBeenNthCalledWith(2, { x: 0.9 });
    expect(chartSpies.reset).toHaveBeenCalledOnce();
  });

  it("시계열 배열 순서와 무관하게 전달된 대표 현재가를 강조한다", () => {
    render(
      <MarketCharts
        points={[
          {
            ...points[0],
            species: "양태",
            priceAvg: 5000
          },
          ...points
        ]}
        volumeMetric="tradeAmount"
        theme="light"
        currentPrice={23000}
      />
    );

    expect(screen.getByText("현재가 23,000원")).toBeVisible();
  });
});
