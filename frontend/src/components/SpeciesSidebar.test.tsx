import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SpeciesSidebar } from "./SpeciesSidebar";
import type { SpeciesSnapshot } from "../types";

const snapshots: SpeciesSnapshot[] = [
  {
    key: "광어::활",
    species: "광어",
    status: "활",
    category: "어류",
    priceAvg: 18000,
    changeRate: -2.4,
    tradeAmount: 2160000
  },
  {
    key: "전복::활",
    species: "전복",
    status: "활",
    category: "패류",
    priceAvg: 25000,
    changeRate: 3.1,
    tradeAmount: 1000000
  }
];

describe("어종 사이드바", () => {
  it("어종명, 평균가, 전일대비, 거래대금 4열을 표시한다", () => {
    render(
      <SpeciesSidebar
        items={snapshots}
        selectedKeys={new Set()}
        favoriteKeys={new Set()}
        onSelectionChange={vi.fn()}
        onFavoriteToggle={vi.fn()}
      />
    );

    expect(
      screen.getByRole("columnheader", { name: /어종명/ })
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: /평균가/ })
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: /전일대비/ })
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: /거래대금/ })
    ).toBeVisible();
    expect(screen.getByText("216만원")).toBeVisible();
  });

  it("카테고리로 목록을 필터링한다", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesSidebar
        items={snapshots}
        selectedKeys={new Set()}
        favoriteKeys={new Set()}
        onSelectionChange={vi.fn()}
        onFavoriteToggle={vi.fn()}
      />
    );

    await user.click(screen.getByRole("tab", { name: "패류" }));

    expect(screen.getByText("전복")).toBeInTheDocument();
    expect(screen.queryByText("광어")).not.toBeInTheDocument();
  });

  it("행 클릭으로 어종+상태 선택을 추가하고 제거한다", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <SpeciesSidebar
        items={snapshots}
        selectedKeys={new Set()}
        favoriteKeys={new Set()}
        onSelectionChange={onSelectionChange}
        onFavoriteToggle={vi.fn()}
      />
    );
    const row = screen.getByRole("button", { name: /활 광어/ });

    await user.click(row);
    expect(onSelectionChange).toHaveBeenCalledWith("광어::활", true);

    rerender(
      <SpeciesSidebar
        items={snapshots}
        selectedKeys={new Set(["광어::활"])}
        favoriteKeys={new Set()}
        onSelectionChange={onSelectionChange}
        onFavoriteToggle={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /활 광어/ }));
    expect(onSelectionChange).toHaveBeenLastCalledWith("광어::활", false);
    const selectedRow = screen
      .getByRole("button", { name: /활 광어/ })
      .closest('[role="row"]');
    expect(selectedRow).not.toBeNull();
    expect(within(selectedRow as HTMLElement).getByText("-2.40%")).toHaveClass(
      "negative"
    );
  });

  it("생선 버튼으로 관심어종을 바꾸고 관심어종만 표시한다", async () => {
    const user = userEvent.setup();
    const onFavoriteToggle = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <SpeciesSidebar
        items={snapshots}
        selectedKeys={new Set()}
        favoriteKeys={new Set(["광어::활"])}
        onSelectionChange={onSelectionChange}
        onFavoriteToggle={onFavoriteToggle}
      />
    );

    await user.click(screen.getByRole("tab", { name: "패류" }));
    await user.click(screen.getByRole("button", { name: "전복 관심어종 추가" }));
    expect(onFavoriteToggle).toHaveBeenCalledWith("전복::활");
    expect(onSelectionChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: "관심어종" }));
    expect(screen.getByText("광어")).toBeInTheDocument();
    expect(screen.queryByText("전복")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "광어 관심어종 제거" })
    ).toContainElement(screen.getByTestId("fish-icon"));
  });

  it("헤더를 누르면 같은 열의 정렬 방향을 전환한다", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesSidebar
        items={snapshots}
        selectedKeys={new Set()}
        favoriteKeys={new Set()}
        onSelectionChange={vi.fn()}
        onFavoriteToggle={vi.fn()}
      />
    );

    const rows = () => screen.getAllByRole("row").slice(1);
    expect(within(rows()[0]).getByText("광어")).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: /거래대금/ })
    ).toHaveAttribute("aria-sort", "descending");

    await user.click(screen.getByRole("button", { name: /전일대비 정렬/ }));
    expect(within(rows()[0]).getByText("전복")).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: /전일대비/ })
    ).toHaveAttribute("aria-sort", "descending");

    await user.click(screen.getByRole("button", { name: /전일대비 정렬/ }));
    expect(within(rows()[0]).getByText("광어")).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: /전일대비/ })
    ).toHaveAttribute("aria-sort", "ascending");
  });
});
