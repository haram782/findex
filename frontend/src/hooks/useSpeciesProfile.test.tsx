import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardApi } from "../api/client";
import type { SpeciesProfile } from "../types";
import { useSpeciesProfile } from "./useSpeciesProfile";

vi.mock("../api/client", () => ({
  dashboardApi: {
    getSpeciesProfile: vi.fn()
  }
}));

const profile: SpeciesProfile = {
  species: "전복",
  season: "가을~겨울",
  mainOrigins: ["완도", "제주"],
  features: "맛이 좋다",
  handlingNotes: "손질 후 냉장 보관",
  imageUrl: "",
  sourceUrls: ["https://example.com/source"],
  generatedBy: "claude-sonnet-5",
  generatedAt: "2026-07-27T00:00:00Z",
  reviewedAt: "2026-07-27T00:00:00Z"
};

describe("어종 정보 훅", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("선택한 어종의 발행된 정보를 불러온다", async () => {
    vi.mocked(dashboardApi.getSpeciesProfile).mockResolvedValue(profile);

    const { result } = renderHook(() => useSpeciesProfile("전복"));

    await waitFor(() => expect(result.current.profile).toEqual(profile));
    expect(result.current.loading).toBe(false);
  });

  it("발행된 정보가 없으면 profile을 null로 유지한다", async () => {
    vi.mocked(dashboardApi.getSpeciesProfile).mockResolvedValue(null);

    const { result } = renderHook(() => useSpeciesProfile("전복"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it("선택 어종이 없으면 API를 호출하지 않는다", () => {
    renderHook(() => useSpeciesProfile(undefined));

    expect(dashboardApi.getSpeciesProfile).not.toHaveBeenCalled();
  });

  it("선택을 해제하면 이전 어종 정보를 즉시 숨긴다", async () => {
    vi.mocked(dashboardApi.getSpeciesProfile).mockResolvedValue(profile);
    const { result, rerender } = renderHook(
      ({ species }: { species: string | undefined }) =>
        useSpeciesProfile(species),
      { initialProps: { species: "전복" as string | undefined } }
    );
    await waitFor(() => expect(result.current.profile).toEqual(profile));

    rerender({ species: undefined });

    expect(result.current).toEqual({
      profile: null,
      loading: false,
      error: null
    });
  });

  it("어종 변경 시 이전 요청을 취소한다", async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(dashboardApi.getSpeciesProfile).mockImplementation(
      (_species, signal) => {
        signals.push(signal);
        return new Promise(() => undefined);
      }
    );
    const { rerender } = renderHook(
      ({ species }: { species: string }) => useSpeciesProfile(species),
      { initialProps: { species: "전복" } }
    );
    await waitFor(() => expect(signals).toHaveLength(1));

    rerender({ species: "문어" });

    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });
});
