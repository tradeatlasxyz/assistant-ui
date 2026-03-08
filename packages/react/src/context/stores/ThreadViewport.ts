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
  readonly scrollToBottom: (config?: {
    behavior?: ScrollBehavior | undefined;
  }) => void;
  readonly onScrollToBottom: (
    callback: ({ behavior }: { behavior: ScrollBehavior }) => void,
  ) => Unsubscribe;

  /** Store current scrollTop for a thread id */
  readonly setThreadScrollPosition: (
    threadId: string,
    scrollTop: number,
  ) => void;

  /** Read previously stored scrollTop for a thread id */
  readonly getThreadScrollPosition: (threadId: string) => number | undefined;

  /** Clear stored scrollTop for a thread id */
  readonly clearThreadScrollPosition: (threadId: string) => void;

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
  const threadScrollPositions = new Map<string, number>();

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

  const store = create<ThreadViewportState>(() => ({
    isAtBottom: true,
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
    setThreadScrollPosition: (threadId, scrollTop) => {
      threadScrollPositions.set(threadId, scrollTop);
    },
    getThreadScrollPosition: (threadId) => {
      return threadScrollPositions.get(threadId);
    },
    clearThreadScrollPosition: (threadId) => {
      threadScrollPositions.delete(threadId);
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
