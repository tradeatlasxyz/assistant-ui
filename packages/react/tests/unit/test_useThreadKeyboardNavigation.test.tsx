import React from "react";
import { render, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useThreadKeyboardNavigation } from "../../src/primitives/thread/useThreadKeyboardNavigation";

function HookConsumer({
  messageCount,
  onReady,
}: {
  messageCount: number;
  onReady: (api: any) => void;
}) {
  const api = useThreadKeyboardNavigation({ messageCount });
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

describe("useThreadKeyboardNavigation", () => {
  it("navigates next/prev/first/last and clamps correctly", () => {
    let api: any = null;
    render(<HookConsumer messageCount={10} onReady={(a) => (api = a)} />);

    // initial index should be last (9)
    expect(api.currentIndex).toBe(9);

    act(() => api.prev());
    expect(api.currentIndex).toBe(8);

    act(() => api.first());
    expect(api.currentIndex).toBe(0);

    act(() => api.next());
    expect(api.currentIndex).toBe(1);

    act(() => api.last());
    expect(api.currentIndex).toBe(9);

    act(() => api.pageUp());
    expect(api.currentIndex).toBe(4); // default pageSize = 5, so 9 - 5 = 4

    act(() => api.pageDown());
    expect(api.currentIndex).toBe(9);
  });

  it("getActiveId returns stable fallback id", () => {
    let api: any = null;
    render(<HookConsumer messageCount={3} onReady={(a) => (api = a)} />);
    expect(api.getActiveId()).toBe("thread-msg-2");
    expect(api.getActiveId(0)).toBe("thread-msg-0");
  });
});
