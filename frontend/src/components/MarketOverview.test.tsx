import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarketOverview } from "./MarketOverview";
import type { SpeciesSnapshot } from "../types";

const selectedItems: SpeciesSnapshot[] = [
  {
    key: "금태::선",
    species: "금태",
    status: "선",
    category: "어류",
    priceAvg: 23000,
    changeRate: -4.2,
    tradeAmount: 230000
  },
  {
    key: "양태::선",
    species: "양태",
    status: "선",
    category: "어류",
    priceAvg: 5000,
    changeRate: 1.2,
    tradeAmount: 50000
  },
  {
    key: "광어::활",
    species: "광어",
    status: "활",
    category: "어류",
    priceAvg: 18000,
    changeRate: 2,
    tradeAmount: 180000
  }
];

describe("선택 어종 요약", () => {
  it("대표 어종과 가격, 임시 이미지와 축약 제목을 표시한다", () => {
    render(
      <MarketOverview
        items={selectedItems}
        activeTab="market"
        onTabChange={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "금태 외 2" })).toBeVisible();
    expect(screen.getByText("23,000원")).toBeVisible();
    expect(screen.getByAltText("금태 임시 이미지")).toBeVisible();
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
