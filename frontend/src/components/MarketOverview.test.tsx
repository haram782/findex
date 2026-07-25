import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarketOverview } from "./MarketOverview";
import type { SpeciesSnapshot } from "../types";

const selectedItems: SpeciesSnapshot[] = [
  {
    key: "금태::선::kg",
    species: "금태",
    status: "선",
    category: "어류",
    priceUnit: "kg",
    priceAvg: 23000,
    changeRate: -4.2,
    tradeAmount: 230000
  },
  {
    key: "양태::선::kg",
    species: "양태",
    status: "선",
    category: "어류",
    priceUnit: "kg",
    priceAvg: 5000,
    changeRate: 1.2,
    tradeAmount: 50000
  },
  {
    key: "광어::활::kg",
    species: "광어",
    status: "활",
    category: "어류",
    priceUnit: "kg",
    priceAvg: 18000,
    changeRate: 2,
    tradeAmount: 180000
  }
];

describe("선택 어종 요약", () => {
  it("선택 어종들의 평균 가격과 평균 전일대비, 축약 제목을 표시한다", () => {
    render(
      <MarketOverview
        items={selectedItems}
        activeTab="market"
        onTabChange={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "금태 외 2" })).toBeVisible();
    expect(screen.getByText("15,333원/kg")).toBeVisible();
    expect(screen.getByText("-0.33%")).toHaveClass("negative");
    expect(screen.getByAltText("금태 임시 이미지")).toBeVisible();
    expect(screen.queryByText("선 · 어류")).not.toBeInTheDocument();
  });

  it("여러 선택의 가격 단위가 다르면 혼합으로 표시한다", () => {
    render(
      <MarketOverview
        items={[
          selectedItems[0],
          { ...selectedItems[1], priceUnit: "box" }
        ]}
        activeTab="market"
        onTabChange={vi.fn()}
      />
    );

    expect(screen.getByText("단위 혼합")).toBeVisible();
  });

  it("한 종류만 선택하면 상태와 카테고리를 표시한다", () => {
    render(
      <MarketOverview
        items={[selectedItems[0]]}
        activeTab="market"
        onTabChange={vi.fn()}
      />
    );

    expect(screen.getByText("선 · 어류")).toBeVisible();
  });

  it("탭을 누르면 화면 전환을 요청한다", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(
      <MarketOverview
        items={selectedItems}
        activeTab="market"
        onTabChange={onTabChange}
      />
    );

    await user.click(screen.getByRole("tab", { name: "어종 정보" }));

    expect(onTabChange).toHaveBeenCalledWith("profile");
  });
});
