"use client";

import { create } from "zustand";
import type { Unsubscribe } from "@assistant-ui/core";

export type SizeHandle = {
  /** Update the height */
  setHeight: (height: number) => void;
  /** Unregister this handle */
  unregister: Unsubscribe;
};

type SizeRegistry = {
  register: () => SizeHandle;
};

const createSizeRegistry = (
  onChange: (total: number) => void,
): SizeRegistry => {
  const entries = new Map<symbol, number>();

  const recalculate = () => {
    let total = 0;
    for (const height of entries.values()) {
      total += height;
    }
    onChange(total);
  };

  return {
    register: () => {
      const id = Symbol();
      entries.set(id, 0);

      return {
        setHeight: (height: number) => {
          if (entries.get(id) !== height) {
            entries.set(id, height);
            recalculate();
          }
        },
        unregister: () => {
          entries.delete(id);
          recalculate();
        },
      };
    },
  };
};

export type ThreadViewportState = {
  readonly isAtBottom: boolean;

  readonly setSavedScrollTop: (threadId: string, scrollTop: number) => void;
  readonly getSavedScrollTop: (threadId: string) => number | undefined;
  readonly clearSavedScrollTop: (threadId: string) => void;

  readonly setPendingRestoreScrollTop: (
    threadId: string,
    scrollTop: number,
  ) => void;
  readonly getPendingRestoreScrollTop: (threadId: string) => number | undefined;
  readonly consumePendingRestoreScrollTop: (
    threadId: string,
  ) => number | undefined;

  readonly markRestoreConsumedByJump: (
    threadId: string,
    consumed: boolean,
  ) => void;
  readonly isRestoreConsumedByJump: (threadId: string) => boolean;

  readonly scrollMemoryVersion: number;
  readonly scrollToBottom: (config?: {
    behavior?: ScrollBehavior | undefined;
  }) => void;
  readonly onScrollToBottom: (
    callback: ({ behavior }: { behavior: ScrollBehavior }) => void,
  ) => Unsubscribe;

  /** Controls scroll anchoring: "top" anchors user messages at top, "bottom" is classic behavior */
  readonly turnAnchor: "top" | "bottom";

  /** Raw height values from registered elements */
  readonly height: {
    /** Total viewport height */
    readonly viewport: number;
    /** Total content inset height (footer, anchor message, etc.) */
    readonly inset: number;
    /** Height of the anchor user message (full height) */
    readonly userMessage: number;
  };

  /** Register a viewport and get a handle to update its height */
  readonly registerViewport: () => SizeHandle;

  /** Register a content inset (footer, anchor message, etc.) and get a handle to update its height */
  readonly registerContentInset: () => SizeHandle;

  /** Register the anchor user message height */
  readonly registerUserMessageHeight: () => SizeHandle;
};

export type ThreadViewportStoreOptions = {
  turnAnchor?: "top" | "bottom" | undefined;
};

export const makeThreadViewportStore = (
  options: ThreadViewportStoreOptions = {},
) => {
  const scrollToBottomListeners = new Set<
    (config: { behavior: ScrollBehavior }) => void
  >();
  const savedScrollTopByThreadId = new Map<string, number>();
  const pendingRestoreScrollTopByThreadId = new Map<string, number>();
  const restoreConsumedByJumpThreadIds = new Set<string>();

  const viewportRegistry = createSizeRegistry((total) => {
    store.setState({
      height: {
        ...store.getState().height,
        viewport: total,
      },
    });
  });
  const insetRegistry = createSizeRegistry((total) => {
    store.setState({
      height: {
        ...store.getState().height,
        inset: total,
      },
    });
  });
  const userMessageRegistry = createSizeRegistry((total) => {
    store.setState({
      height: {
        ...store.getState().height,
        userMessage: total,
      },
    });
  });

  const store = create<ThreadViewportState>((set) => ({
    isAtBottom: true,

    setSavedScrollTop: (threadId, scrollTop) => {
      savedScrollTopByThreadId.set(threadId, scrollTop);
      set((state) => ({ scrollMemoryVersion: state.scrollMemoryVersion + 1 }));
    },
    getSavedScrollTop: (threadId) => savedScrollTopByThreadId.get(threadId),
    clearSavedScrollTop: (threadId) => {
      if (!savedScrollTopByThreadId.delete(threadId)) return;
      set((state) => ({ scrollMemoryVersion: state.scrollMemoryVersion + 1 }));
    },

    setPendingRestoreScrollTop: (threadId, scrollTop) => {
      pendingRestoreScrollTopByThreadId.set(threadId, scrollTop);
      set((state) => ({ scrollMemoryVersion: state.scrollMemoryVersion + 1 }));
    },
    getPendingRestoreScrollTop: (threadId) =>
      pendingRestoreScrollTopByThreadId.get(threadId),
    consumePendingRestoreScrollTop: (threadId) => {
      const value = pendingRestoreScrollTopByThreadId.get(threadId);
      if (value === undefined) return undefined;
      pendingRestoreScrollTopByThreadId.delete(threadId);
      set((state) => ({ scrollMemoryVersion: state.scrollMemoryVersion + 1 }));
      return value;
    },

    markRestoreConsumedByJump: (threadId, consumed) => {
      const hadValue = restoreConsumedByJumpThreadIds.has(threadId);
      if (consumed) {
        if (hadValue) return;
        restoreConsumedByJumpThreadIds.add(threadId);
      } else {
        if (!hadValue) return;
        restoreConsumedByJumpThreadIds.delete(threadId);
      }
      set((state) => ({ scrollMemoryVersion: state.scrollMemoryVersion + 1 }));
    },
    isRestoreConsumedByJump: (threadId) =>
      restoreConsumedByJumpThreadIds.has(threadId),

    scrollMemoryVersion: 0,

    scrollToBottom: ({ behavior = "auto" } = {}) => {
      for (const listener of scrollToBottomListeners) {
        listener({ behavior });
      }
    },
    onScrollToBottom: (callback) => {
      scrollToBottomListeners.add(callback);
      return () => {
        scrollToBottomListeners.delete(callback);
      };
    },

    turnAnchor: options.turnAnchor ?? "bottom",

    height: {
      viewport: 0,
      inset: 0,
      userMessage: 0,
    },

    registerViewport: viewportRegistry.register,
    registerContentInset: insetRegistry.register,
    registerUserMessageHeight: userMessageRegistry.register,
  }));

  return store;
};
