import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFavorites, useTheme } from "./usePreferences";

describe("사용자 화면 설정", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("즐겨찾기를 브라우저 저장소에 보존하고 복원한다", () => {
    const first = renderHook(() => useFavorites());

    act(() => first.result.current.toggleFavorite("금태::선"));
    expect(first.result.current.favoriteKeys.has("금태::선")).toBe(true);
    first.unmount();

    const restored = renderHook(() => useFavorites());
    expect(restored.result.current.favoriteKeys.has("금태::선")).toBe(true);
  });

  it("테마를 전환하고 브라우저 저장소에 보존한다", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("light"));

    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("findex-theme")).toBe("light");
  });

  it("손상된 즐겨찾기 저장값은 빈 목록으로 복구한다", () => {
    localStorage.setItem("findex-favorites", "{invalid");

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favoriteKeys.size).toBe(0);
  });

  it("브라우저 저장소 쓰기가 차단돼도 설정 상태를 유지한다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const favorites = renderHook(() => useFavorites());
    const theme = renderHook(() => useTheme());

    expect(() =>
      act(() => favorites.result.current.toggleFavorite("금태::선"))
    ).not.toThrow();
    expect(() => act(() => theme.result.current.setTheme("light"))).not.toThrow();
    expect(favorites.result.current.favoriteKeys.has("금태::선")).toBe(true);
    expect(theme.result.current.theme).toBe("light");
  });
});
