import { afterEach, describe, expect, it, vi } from "vitest";
import { setAppIconBadge } from "./app-badge";

afterEach(() => vi.unstubAllGlobals());

describe("setAppIconBadge", () => {
  it("1以上は数字を付ける", () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { setAppBadge, clearAppBadge });
    setAppIconBadge(3);
    expect(setAppBadge).toHaveBeenCalledWith(3);
    expect(clearAppBadge).not.toHaveBeenCalled();
  });

  it("0 のときは数字を消す", () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { setAppBadge, clearAppBadge });
    setAppIconBadge(0);
    expect(clearAppBadge).toHaveBeenCalled();
    expect(setAppBadge).not.toHaveBeenCalled();
  });

  it("対応していない端末でも落ちない／失敗しても例外にしない", async () => {
    vi.stubGlobal("navigator", {});
    expect(() => setAppIconBadge(2)).not.toThrow();
    vi.stubGlobal("navigator", { setAppBadge: vi.fn().mockRejectedValue(new Error("denied")) });
    expect(() => setAppIconBadge(2)).not.toThrow();
    await Promise.resolve();
  });
});
