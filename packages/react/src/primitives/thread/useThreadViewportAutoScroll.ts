"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useCallback, useRef, type RefCallback } from "react";
import { useAuiEvent, useAuiState } from "@assistant-ui/store";
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
     * Whether to preserve and restore scrollTop when switching threads.
     *
     * Defaults to false.
     */
    preserveScrollOnThreadSwitch?: boolean | undefined;
  };
}

type ThreadSwitchScrollAction =
  | { type: "restore"; scrollTop: number }
  | { type: "scrollToBottom" }
  | { type: "none" };

export const getThreadSwitchScrollAction = ({
  preserveScrollOnThreadSwitch,
  savedScrollTop,
  scrollToBottomOnThreadSwitch,
}: {
  preserveScrollOnThreadSwitch: boolean;
  savedScrollTop: number | undefined;
  scrollToBottomOnThreadSwitch: boolean;
}): ThreadSwitchScrollAction => {
  if (preserveScrollOnThreadSwitch && savedScrollTop !== undefined) {
    return { type: "restore", scrollTop: savedScrollTop };
  }

  if (scrollToBottomOnThreadSwitch) {
    return { type: "scrollToBottom" };
  }

  return { type: "none" };
};

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
  preserveScrollOnThreadSwitch = false,
}: useThreadViewportAutoScroll.Options): RefCallback<TElement> => {
  const divRef = useRef<TElement>(null);
  const threadId = useAuiState((s) => s.threadListItem.id);

  const threadViewportStore = useThreadViewportStore();
  if (autoScroll === undefined) {
    autoScroll = threadViewportStore.getState().turnAnchor !== "top";
  }

  const lastScrollTop = useRef<number>(0);

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

    if (preserveScrollOnThreadSwitch && threadId) {
      threadViewportStore
        .getState()
        .setThreadScrollPosition(threadId, div.scrollTop);
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

  useAuiEvent(
    "threadListItem.switchedAway",
    ({ threadId: switchedFromThreadId }) => {
      if (!preserveScrollOnThreadSwitch) return;
      const div = divRef.current;
      if (!div) return;
      threadViewportStore
        .getState()
        .setThreadScrollPosition(switchedFromThreadId, div.scrollTop);
    },
  );

  // preserve/restore on thread switch with fallback to default behavior
  useAuiEvent(
    "threadListItem.switchedTo",
    ({ threadId: switchedToThreadId }) => {
      const savedScrollTop = threadViewportStore
        .getState()
        .getThreadScrollPosition(switchedToThreadId);
      const action = getThreadSwitchScrollAction({
        preserveScrollOnThreadSwitch,
        savedScrollTop,
        scrollToBottomOnThreadSwitch,
      });

      if (action.type === "none") return;
      if (action.type === "scrollToBottom") {
        scrollingToBottomBehaviorRef.current = "instant";
        requestAnimationFrame(() => {
          scrollToBottom("instant");
        });
        return;
      }

      scrollingToBottomBehaviorRef.current = null;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const div = divRef.current;
          if (!div) return;
          div.scrollTop = action.scrollTop;
          handleScroll();
        });
      });
    },
  );

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
