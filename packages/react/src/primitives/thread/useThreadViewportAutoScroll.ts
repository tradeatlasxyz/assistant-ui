"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useCallback, useRef, type RefCallback } from "react";
import { useAuiEvent } from "@assistant-ui/store";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { writableStore } from "../../context/ReadonlyStore";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";

export namespace useThreadViewportAutoScroll {
  export type Options = {
    /**
     * Whether to automatically scroll to the bottom when new messages are added.
     * When enabled, the viewport will automatically scroll to show the latest content.
     *
     * Default false if `turnAnchor` is "top", otherwise defaults to true.
     */
    autoScroll?: boolean | undefined;

    /**
     * Whether to scroll to bottom when a new run starts.
     *
     * Defaults to true.
     */
    scrollToBottomOnRunStart?: boolean | undefined;

    /**
     * Whether to scroll to bottom when thread history is first loaded.
     *
     * Defaults to true.
     */
    scrollToBottomOnInitialize?: boolean | undefined;

    /**
     * Whether to scroll to bottom when switching to a different thread.
     *
     * Defaults to true.
     */
    scrollToBottomOnThreadSwitch?: boolean | undefined;

    /**
     * Whether to preserve per-thread scroll position when switching threads.
     *
     * Defaults to false.
     */
    preserveScrollOnThreadSwitch?: boolean | undefined;
  };
}

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
  preserveScrollOnThreadSwitch = false,
}: useThreadViewportAutoScroll.Options): RefCallback<TElement> => {
  const divRef = useRef<TElement>(null);

  const threadViewportStore = useThreadViewportStore();
  if (autoScroll === undefined) {
    autoScroll = threadViewportStore.getState().turnAnchor !== "top";
  }

  const lastScrollTop = useRef<number>(0);
  const savedScrollPositionsRef = useRef<Map<string, number>>(new Map());
  const currentThreadIdRef = useRef<string | null>(null);

  // bug: when ScrollToBottom's button changes its disabled state, the scroll stops
  // fix: delay the state change until the scroll is done
  // stores the scroll behavior to reuse during content resize, or null if not scrolling
  const scrollingToBottomBehaviorRef = useRef<ScrollBehavior | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const div = divRef.current;
    if (!div) return;

    scrollingToBottomBehaviorRef.current = behavior;
    div.scrollTo({ top: div.scrollHeight, behavior });
  }, []);

  const handleScroll = () => {
    const div = divRef.current;
    if (!div) return;

    const isAtBottom = threadViewportStore.getState().isAtBottom;
    const newIsAtBottom =
      Math.abs(div.scrollHeight - div.scrollTop - div.clientHeight) < 1 ||
      div.scrollHeight <= div.clientHeight;

    if (!newIsAtBottom && lastScrollTop.current < div.scrollTop) {
      // ignore scroll down
    } else {
      if (newIsAtBottom) {
        scrollingToBottomBehaviorRef.current = null;
      }

      const shouldUpdate =
        newIsAtBottom || scrollingToBottomBehaviorRef.current === null;

      if (shouldUpdate && newIsAtBottom !== isAtBottom) {
        writableStore(threadViewportStore).setState({
          isAtBottom: newIsAtBottom,
        });
      }
    }

    lastScrollTop.current = div.scrollTop;
  };

  const resizeRef = useOnResizeContent(() => {
    const scrollBehavior = scrollingToBottomBehaviorRef.current;
    if (scrollBehavior) {
      scrollToBottom(scrollBehavior);
    } else if (autoScroll && threadViewportStore.getState().isAtBottom) {
      scrollToBottom("instant");
    }

    handleScroll();
  });

  const scrollRef = useManagedRef<HTMLElement>((el) => {
    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  });

  useOnScrollToBottom(({ behavior }) => {
    const currentThreadId = currentThreadIdRef.current;
    if (currentThreadId && preserveScrollOnThreadSwitch) {
      savedScrollPositionsRef.current.delete(currentThreadId);
    }
    scrollToBottom(behavior);
  });

  // autoscroll on run start
  useAuiEvent("thread.runStart", () => {
    if (!scrollToBottomOnRunStart) return;
    scrollingToBottomBehaviorRef.current = "auto";
    requestAnimationFrame(() => {
      scrollToBottom("auto");
    });
  });

  // scroll to bottom instantly when thread history is first loaded
  useAuiEvent("thread.initialize", () => {
    if (!scrollToBottomOnInitialize) return;
    scrollingToBottomBehaviorRef.current = "instant";
    requestAnimationFrame(() => {
      scrollToBottom("instant");
    });
  });

  // handle thread switch events: optionally restore or persist per-thread scroll position
  useAuiEvent("threadListItem.switchedTo", (payload?: any) => {
    const threadId = payload?.threadId as string | undefined;
    if (threadId) currentThreadIdRef.current = threadId;

    if (preserveScrollOnThreadSwitch && threadId) {
      const saved = savedScrollPositionsRef.current.get(threadId);
      if (saved !== undefined) {
        // restore saved position after layout stabilizes; skip default auto-scroll
        requestAnimationFrame(() => {
          const div = divRef.current;
          if (!div) return;
          scrollingToBottomBehaviorRef.current = null;
          div.scrollTop = saved;
          handleScroll();
        });
        return;
      }
    }

    if (!scrollToBottomOnThreadSwitch) return;
    scrollingToBottomBehaviorRef.current = "instant";
    requestAnimationFrame(() => {
      scrollToBottom("instant");
    });
  });

  useAuiEvent("threadListItem.switchedAway", (payload?: any) => {
    if (!preserveScrollOnThreadSwitch) return;
    const threadId = payload?.threadId as string | undefined;
    const div = divRef.current;
    if (threadId && div) {
      savedScrollPositionsRef.current.set(threadId, div.scrollTop);
    }
  });

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
