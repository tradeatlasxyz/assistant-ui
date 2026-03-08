// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, act } from "vitest";
import { renderHook } from "@testing-library/react-hooks";

// We'll mock useAuiEvent to capture handlers and invoke them in tests.
const handlers: Record<string, Array<Function>> = {};
vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiEvent: (event: string, cb: Function) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(cb);
    },
  };
});

import { useThreadViewportAutoScroll } from "../useThreadViewportAutoScroll";

describe("useThreadViewportAutoScroll preserve behavior", () => {
  beforeEach(() => {
    for (const k of Object.keys(handlers)) delete handlers[k];
  });

  it("restores saved scrollTop on thread switch when enabled", () => {
    const { result } = renderHook(() =>
      useThreadViewportAutoScroll<HTMLDivElement>({
        preserveScrollOnThreadSwitch: true,
        scrollToBottomOnThreadSwitch: false,
      }),
    );

    const div = {
      clientHeight: 100,
      scrollHeight: 1000,
      scrollTop: 0,
    } as any as HTMLDivElement;

    act(() => {
      // @ts-expect-error
      result.current(div);
    });

    act(() => {
      div.scrollTop = 250;
      handlers["threadListItem.switchedAway"]?.forEach((h) =>
        h({ threadId: "t1" }),
      );
    });

    act(() => {
      div.scrollTop = 0;
      handlers["threadListItem.switchedTo"]?.forEach((h) =>
        h({ threadId: "t1" }),
      );
    });

    expect(div.scrollTop).toBe(250);
  });

  it("does not restore when feature disabled", () => {
    const { result } = renderHook(() =>
      useThreadViewportAutoScroll<HTMLDivElement>({
        preserveScrollOnThreadSwitch: false,
        scrollToBottomOnThreadSwitch: false,
      }),
    );

    const div = {
      clientHeight: 100,
      scrollHeight: 1000,
      scrollTop: 0,
    } as any as HTMLDivElement;

    act(() => {
      // @ts-expect-error
      result.current(div);
    });

    act(() => {
      div.scrollTop = 300;
      handlers["threadListItem.switchedAway"]?.forEach((h) =>
        h({ threadId: "t2" }),
      );
    });

    act(() => {
      div.scrollTop = 0;
      handlers["threadListItem.switchedTo"]?.forEach((h) =>
        h({ threadId: "t2" }),
      );
    });

    expect(div.scrollTop).toBe(0);
  });
});
