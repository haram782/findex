import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpeciesProfilePanel } from "./SpeciesProfilePanel";
import type { SpeciesProfile } from "../types";

const profile: SpeciesProfile = {
  species: "전복",
  season: "가을~겨울",
  mainOrigins: ["완도", "제주"],
  features: "쫄깃한 식감이 특징",
  handlingNotes: "손질 후 냉장 보관",
  imageUrl: "",
  sourceUrls: ["https://example.com/source"],
  generatedBy: "claude-sonnet-5",
  generatedAt: "2026-07-27T00:00:00Z",
  reviewedAt: "2026-07-27T00:00:00Z"
};

describe("어종 정보 패널", () => {
  it("발행된 정보가 있으면 제철·산지·특징·손질법·출처를 보여준다", () => {
    render(
      <SpeciesProfilePanel
        species="전복"
        aliases={["복"]}
        profile={profile}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText("가을~겨울")).toBeVisible();
    expect(screen.getByText("완도, 제주")).toBeVisible();
    expect(screen.getByText("쫄깃한 식감이 특징")).toBeVisible();
    expect(screen.getByText("손질 후 냉장 보관")).toBeVisible();
    expect(screen.getByRole("link", { name: "https://example.com/source" })).toHaveAttribute(
      "href",
      "https://example.com/source"
    );
  });

  it("발행된 정보가 없으면 안내 문구와 다른 이름을 보여준다", () => {
    render(
      <SpeciesProfilePanel
        species="전복"
        aliases={["복"]}
        profile={null}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText("검수된 어종 정보가 아직 없습니다.")).toBeVisible();
    expect(screen.getByText("복")).toBeVisible();
  });

  it("불러오는 중에는 로딩 문구를 보여준다", () => {
    render(
      <SpeciesProfilePanel
        species="전복"
        aliases={[]}
        profile={null}
        loading={true}
        error={null}
      />
    );

    expect(screen.getByText("어종 정보를 불러오는 중입니다.")).toBeVisible();
  });

  it("조회 실패를 미발행 정보와 구분해 보여준다", () => {
    render(
      <SpeciesProfilePanel
        species="전복"
        aliases={[]}
        profile={null}
        loading={false}
        error="네트워크 연결을 확인해 주세요"
      />
    );

    expect(
      screen.getByText("어종 정보를 불러오지 못했습니다.")
    ).toBeVisible();
    expect(screen.getByText("네트워크 연결을 확인해 주세요")).toBeVisible();
    expect(
      screen.queryByText("검수된 어종 정보가 아직 없습니다.")
    ).not.toBeInTheDocument();
  });
});
