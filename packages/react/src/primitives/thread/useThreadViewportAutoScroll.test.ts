import { describe, expect, it } from "vitest";
import { makeThreadViewportStore } from "../../context/stores/ThreadViewport";
import { getThreadSwitchScrollAction } from "./useThreadViewportAutoScroll";

describe("getThreadSwitchScrollAction", () => {
  it("restores saved position on thread switch", () => {
    const action = getThreadSwitchScrollAction({
      preserveScrollOnThreadSwitch: true,
      savedScrollTop: 240,
      scrollToBottomOnThreadSwitch: true,
    });

    expect(action).toEqual({ type: "restore", scrollTop: 240 });
  });

  it("falls back to default bottom behavior for unseen thread", () => {
    const action = getThreadSwitchScrollAction({
      preserveScrollOnThreadSwitch: true,
      savedScrollTop: undefined,
      scrollToBottomOnThreadSwitch: true,
    });

    expect(action).toEqual({ type: "scrollToBottom" });
  });

  it("keeps existing disabled behavior when preserve is off", () => {
    const action = getThreadSwitchScrollAction({
      preserveScrollOnThreadSwitch: false,
      savedScrollTop: 240,
      scrollToBottomOnThreadSwitch: false,
    });

    expect(action).toEqual({ type: "none" });
  });
});

describe("ThreadViewport scroll memory", () => {
  it("stores and clears per-thread scroll positions", () => {
    const store = makeThreadViewportStore({ turnAnchor: "bottom" });
    const state = store.getState();

    state.setThreadScrollPosition("thread-1", 128);
    expect(state.getThreadScrollPosition("thread-1")).toBe(128);

    state.clearThreadScrollPosition("thread-1");
    expect(state.getThreadScrollPosition("thread-1")).toBeUndefined();
  });

  it("works for top-anchor mode too", () => {
    const store = makeThreadViewportStore({ turnAnchor: "top" });
    const state = store.getState();

    state.setThreadScrollPosition("thread-top", 64);
    expect(state.getThreadScrollPosition("thread-top")).toBe(64);
    expect(state.turnAnchor).toBe("top");
  });
});
