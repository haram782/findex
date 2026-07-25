import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SpeciesSidebar } from "./SpeciesSidebar";
import type { SpeciesSnapshot } from "../types";

const snapshots: SpeciesSnapshot[] = [
  {
    key: "광어::활::kg",
    species: "광어",
    status: "활",
    category: "어류",
    priceUnit: "kg",
    priceAvg: 18000,
    changeRate: -2.4,
    tradeAmount: 2160000
  },
  {
    key: "전복::활::box",
    species: "전복",
    status: "활",
    category: "패류",
    priceUnit: "box",
    priceAvg: 25000,
    changeRate: 3.1,
    tradeAmount: 1000000
  }
];

const otherSnapshot: SpeciesSnapshot = {
  key: "해삼::선::kg",
  species: "해삼",
  status: "선",
  category: "기타",
  priceUnit: "kg",
  priceAvg: 12000,
  changeRate: null,
  tradeAmount: 500000
};

const aliasSnapshot: SpeciesSnapshot = {
  key: "흑점줄전갱이::선::kg",
  species: "흑점줄전갱이",
  status: "선",
  category: "어류",
  priceUnit: "kg",
  priceAvg: 42000,
  changeRate: 1.5,
  tradeAmount: 800000
};

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
    expect(screen.getByText("18,000원")).toBeVisible();
    expect(screen.getByText("/kg")).toBeVisible();
  });

  it("긴 가격 단위의 전체값을 title과 접근성 이름으로 제공한다", () => {
    const longUnit = "매우긴원본포장단위이름";
    render(
      <SpeciesSidebar
        items={[{ ...snapshots[0], key: `광어::활::${longUnit}`, priceUnit: longUnit }]}
        selectedKeys={new Set()}
        favoriteKeys={new Set()}
        onSelectionChange={vi.fn()}
        onFavoriteToggle={vi.fn()}
      />
    );

    expect(screen.getByTitle(`18,000원/${longUnit}`)).toBeVisible();
    expect(
      screen.getByRole("button", { name: `활 광어 ${longUnit}` })
    ).toBeVisible();
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

  it("기타 카테고리를 마지막에 배치한다", () => {
    render(
      <SpeciesSidebar
        items={[otherSnapshot, ...snapshots]}
        selectedKeys={new Set()}
        favoriteKeys={new Set()}
        onSelectionChange={vi.fn()}
        onFavoriteToggle={vi.fn()}
      />
    );

    const categoryTabs = within(
      screen.getByRole("tablist", { name: "어종 카테고리" })
    ).getAllByRole("tab");
    expect(categoryTabs.map((tab) => tab.textContent)).toEqual([
      "전체",
      "어류",
      "패류",
      "기타"
    ]);
  });

  it("정식 어종명과 LLM Wiki의 다른 이름으로 검색한다", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesSidebar
        items={[...snapshots, aliasSnapshot]}
        selectedKeys={new Set()}
        favoriteKeys={new Set()}
        onSelectionChange={vi.fn()}
        onFavoriteToggle={vi.fn()}
      />
    );

    const search = screen.getByRole("searchbox", { name: "어종 검색" });
    await user.type(search, "시마아지");

    expect(screen.getByText("흑점줄전갱이")).toBeVisible();
    expect(screen.queryByText("광어")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "흑점줄전갱이");
    expect(screen.getByText("흑점줄전갱이")).toBeVisible();

    await user.clear(search);
    await user.type(search, "없는어종");
    expect(screen.getByText("검색 결과가 없습니다.")).toBeVisible();
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
    expect(onSelectionChange).toHaveBeenCalledWith("광어::활::kg", true);

    rerender(
      <SpeciesSidebar
        items={snapshots}
        selectedKeys={new Set(["광어::활::kg"])}
        favoriteKeys={new Set()}
        onSelectionChange={onSelectionChange}
        onFavoriteToggle={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /활 광어/ }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      "광어::활::kg",
      false
    );
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
        favoriteKeys={new Set(["광어::활::kg"])}
        onSelectionChange={onSelectionChange}
        onFavoriteToggle={onFavoriteToggle}
      />
    );

    await user.click(screen.getByRole("tab", { name: "패류" }));
    await user.click(
      screen.getByRole("button", { name: "전복 box 관심어종 추가" })
    );
    expect(onFavoriteToggle).toHaveBeenCalledWith("전복::활::box");
    expect(onSelectionChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: "관심어종" }));
    expect(screen.getByText("광어")).toBeInTheDocument();
    expect(screen.queryByText("전복")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "광어 kg 관심어종 제거" })
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
