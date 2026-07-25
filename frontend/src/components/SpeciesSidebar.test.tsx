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
    changeRate: -2.4
  },
  {
    key: "전복::활",
    species: "전복",
    status: "활",
    category: "패류",
    priceAvg: 25000,
    changeRate: 3.1
  }
];

describe("어종 사이드바", () => {
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
    expect(
      within(screen.getByRole("button", { name: /활 광어/ })).getByText(
        "-2.40%"
      )
    ).toHaveClass("negative");
  });

  it("별 버튼으로 즐겨찾기를 바꾸고 즐겨찾기만 표시한다", async () => {
    const user = userEvent.setup();
    const onFavoriteToggle = vi.fn();
    render(
      <SpeciesSidebar
        items={snapshots}
        selectedKeys={new Set()}
        favoriteKeys={new Set(["광어::활"])}
        onSelectionChange={vi.fn()}
        onFavoriteToggle={onFavoriteToggle}
      />
    );

    await user.click(screen.getByRole("tab", { name: "패류" }));
    await user.click(screen.getByRole("button", { name: "전복 즐겨찾기 추가" }));
    expect(onFavoriteToggle).toHaveBeenCalledWith("전복::활");

    await user.click(screen.getByRole("tab", { name: "즐겨찾기" }));
    expect(screen.getByText("광어")).toBeInTheDocument();
    expect(screen.queryByText("전복")).not.toBeInTheDocument();
  });
});
