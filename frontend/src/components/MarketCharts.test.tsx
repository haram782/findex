import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chart as ChartJS } from "chart.js";
import { describe, expect, it, vi } from "vitest";
import {
  createMarketChartOptions,
  getDateTickLabel
} from "../chartOptions";
import type { TimeSeriesPoint } from "../types";
import { MarketCharts } from "./MarketCharts";

const chartSpies = vi.hoisted(() => ({
  reset: vi.fn(),
  mounted: vi.fn(),
  unmounted: vi.fn()
}));

const smoothZoomSpies = vi.hoisted(() => ({
  destroy: vi.fn(),
  reset: vi.fn(),
  zoom: vi.fn()
}));

vi.mock("chartjs-plugin-zoom", () => ({
  default: { id: "zoom" }
}));

vi.mock("../wheelZoom", () => ({
  createSmoothWheelZoom: () => smoothZoomSpies
}));

vi.mock("react-chartjs-2", async () => {
  const React = await import("react");
  return {
    Chart: React.forwardRef<unknown, Record<string, unknown>>(
      (_props, ref) => {
        React.useEffect(() => {
          chartSpies.mounted();
          return () => chartSpies.unmounted();
        }, []);
        React.useImperativeHandle(ref, () => ({
          resetZoom: chartSpies.reset
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

  it("플러그인 휠 배율은 끄고 핀치와 드래그 이동 설정을 유지한다", () => {
    const options = createMarketChartOptions("dark", 1, 5);
    const zoom = options.plugins?.zoom;

    expect(zoom?.pan).toMatchObject({
      enabled: true,
      mode: "x",
      threshold: 10
    });
    expect(zoom?.zoom?.wheel).toMatchObject({
      enabled: false
    });
    expect(zoom?.zoom?.pinch).toMatchObject({ enabled: true });
    expect(zoom?.zoom?.mode).toBe("x");
    expect(zoom?.limits?.x).toMatchObject({
      min: 0,
      max: 10,
      minRange: 2
    });
    expect(options.layout?.padding).toMatchObject({ right: 72 });
    expect(options.animation).toBe(false);
    expect(options.scales?.price).toMatchObject({
      axis: "y",
      position: "left"
    });
    expect(options.scales?.x).toMatchObject({
      type: "linear",
      min: 3,
      max: 7
    });
    expect(options.scales?.volume).toMatchObject({ axis: "y" });
    expect(options.scales?.x?.ticks?.font).toMatchObject({ size: 12 });
    expect(
      (options.scales?.x?.ticks as { stepSize?: number })?.stepSize
    ).toBe(1);
    expect(options.scales?.price?.ticks?.font).toMatchObject({ size: 12 });
  });

  it("선형 축의 정수 위치에만 날짜 라벨을 표시한다", () => {
    const labels = ["2026-07-20", "2026-07-21"];

    expect(getDateTickLabel(0, labels)).toBe("2026-07-20");
    expect(getDateTickLabel(0.5, labels)).toBe("");
    expect(getDateTickLabel(2, labels)).toBe("");
  });

  it("단일 통합 차트에 정렬된 확대·축소 버튼만 표시한다", async () => {
    const user = userEvent.setup();
    render(
      <MarketCharts
        points={points}
        volumeMetric="tradeAmount"
        theme="dark"
        currentPrices={[
          {
            species: "금태",
            status: "선",
            price: 23000
          }
        ]}
        chartInterval="day"
      />
    );
    chartSpies.reset.mockClear();
    smoothZoomSpies.reset.mockClear();
    smoothZoomSpies.zoom.mockClear();

    await user.click(screen.getByRole("button", { name: "차트 확대" }));
    await user.click(screen.getByRole("button", { name: "차트 축소" }));

    expect(screen.getByTestId("market-chart")).toBeVisible();
    expect(screen.queryByTestId("volume-chart")).not.toBeInTheDocument();
    expect(screen.queryByText(/휠로/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "초기화" })).not.toBeInTheDocument();
    expect(screen.queryByText(/현재가/)).not.toBeInTheDocument();
    expect(smoothZoomSpies.zoom).toHaveBeenNthCalledWith(1, -100);
    expect(smoothZoomSpies.zoom).toHaveBeenNthCalledWith(2, 100);
  });

  it("시계열 배열 순서와 무관하게 복수 현재가를 전달한다", () => {
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
        currentPrices={[
          { species: "금태", status: "선", price: 23000 },
          { species: "양태", status: "선", price: 5000 }
        ]}
        chartInterval="day"
      />
    );

    expect(screen.queryByText(/현재가/)).not.toBeInTheDocument();
  });

  it("현재가와 테마가 바뀌어도 차트 캔버스를 다시 마운트하지 않는다", () => {
    chartSpies.mounted.mockClear();
    chartSpies.unmounted.mockClear();
    const { rerender, unmount } = render(
      <MarketCharts
        points={points}
        volumeMetric="tradeAmount"
        theme="dark"
        currentPrices={[
          { species: "금태", status: "선", price: 23000 }
        ]}
        chartInterval="day"
      />
    );

    rerender(
      <MarketCharts
        points={points}
        volumeMetric="tradeAmount"
        theme="light"
        currentPrices={[
          { species: "금태", status: "선", price: 24000 }
        ]}
        chartInterval="day"
      />
    );

    expect(chartSpies.mounted).toHaveBeenCalledTimes(1);
    expect(chartSpies.unmounted).not.toHaveBeenCalled();

    unmount();
    expect(chartSpies.unmounted).toHaveBeenCalledTimes(1);
  });
});
