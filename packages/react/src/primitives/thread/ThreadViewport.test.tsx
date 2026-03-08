import { describe, expect, it } from "vitest";
import { makeThreadViewportStore } from "../../context/stores/ThreadViewport";

describe("ThreadViewport preserve-scroll scaffolding", () => {
  it("supports per-thread scroll memory map set/get/clear", () => {
    const store = makeThreadViewportStore();
    const state = store.getState();

    expect(state.getSavedScrollTop("thread-a")).toBeUndefined();

    state.setSavedScrollTop("thread-a", 128);
    expect(store.getState().getSavedScrollTop("thread-a")).toBe(128);

    state.clearSavedScrollTop("thread-a");
    expect(store.getState().getSavedScrollTop("thread-a")).toBeUndefined();
  });

  it("supports storing/consuming pending restore scroll positions", () => {
    const store = makeThreadViewportStore();
    const state = store.getState();

    state.setPendingRestoreScrollTop("thread-b", 256);
    expect(store.getState().getPendingRestoreScrollTop("thread-b")).toBe(256);

    expect(store.getState().consumePendingRestoreScrollTop("thread-b")).toBe(
      256,
    );
    expect(
      store.getState().consumePendingRestoreScrollTop("thread-b"),
    ).toBeUndefined();
  });

  it("tracks consumed jump-to-latest marker per thread", () => {
    const store = makeThreadViewportStore();

    expect(store.getState().isRestoreConsumedByJump("thread-c")).toBe(false);
    store.getState().markRestoreConsumedByJump("thread-c", true);
    expect(store.getState().isRestoreConsumedByJump("thread-c")).toBe(true);
    store.getState().markRestoreConsumedByJump("thread-c", false);
    expect(store.getState().isRestoreConsumedByJump("thread-c")).toBe(false);
  });
});
