import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMarketChartOptions } from "../chartOptions";
import type { TimeSeriesPoint } from "../types";
import { MarketCharts } from "./MarketCharts";

const chartSpies = vi.hoisted(() => ({
  priceReset: vi.fn(),
  priceZoom: vi.fn(),
  volumeReset: vi.fn(),
  volumeZoom: vi.fn()
}));

vi.mock("chartjs-plugin-zoom", () => ({
  default: { id: "zoom" }
}));

vi.mock("react-chartjs-2", async () => {
  const React = await import("react");
  return {
    Line: React.forwardRef<unknown, Record<string, unknown>>(
      (_props, ref) => {
        React.useImperativeHandle(ref, () => ({
          resetZoom: chartSpies.priceReset,
          zoom: chartSpies.priceZoom
        }));
        return React.createElement("div", { "data-testid": "price-chart" });
      }
    ),
    Bar: React.forwardRef<unknown, Record<string, unknown>>(
      (_props, ref) => {
        React.useImperativeHandle(ref, () => ({
          resetZoom: chartSpies.volumeReset,
          zoom: chartSpies.volumeZoom
        }));
        return React.createElement("div", { "data-testid": "volume-chart" });
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
  it("가로축 휠 확대, 핀치, 드래그 이동 설정을 유지한다", () => {
    const options = createMarketChartOptions("dark");
    const zoom = options.plugins?.zoom;

    expect(zoom?.pan).toMatchObject({ enabled: true, mode: "x" });
    expect(zoom?.zoom?.wheel).toMatchObject({ enabled: true });
    expect(zoom?.zoom?.pinch).toMatchObject({ enabled: true });
    expect(zoom?.zoom?.mode).toBe("x");
  });

  it("확대, 축소, 초기화를 두 차트에 함께 적용한다", async () => {
    const user = userEvent.setup();
    render(
      <MarketCharts
        points={points}
        volumeMetric="tradeAmount"
        theme="dark"
      />
    );
    chartSpies.priceReset.mockClear();
    chartSpies.volumeReset.mockClear();

    await user.click(screen.getByRole("button", { name: "차트 확대" }));
    await user.click(screen.getByRole("button", { name: "차트 축소" }));
    await user.click(screen.getByRole("button", { name: "초기화" }));

    expect(chartSpies.priceZoom).toHaveBeenNthCalledWith(1, { x: 1.2 });
    expect(chartSpies.priceZoom).toHaveBeenNthCalledWith(2, { x: 0.8 });
    expect(chartSpies.volumeZoom).toHaveBeenNthCalledWith(1, { x: 1.2 });
    expect(chartSpies.volumeZoom).toHaveBeenNthCalledWith(2, { x: 0.8 });
    expect(chartSpies.priceReset).toHaveBeenCalledOnce();
    expect(chartSpies.volumeReset).toHaveBeenCalledOnce();
  });
});
