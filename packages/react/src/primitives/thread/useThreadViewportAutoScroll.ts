"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useCallback, useRef, useEffect, type RefCallback } from "react";
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
     * Optional id of the currently focused message (aria-activedescendant).
     * If provided, the viewport will attempt to scroll the focused element into view
     * using the `focusBlock` behavior when the id changes.
     */
    focusedId?: string | null;

    /**
     * How to block align the focused element when scrolling. Defaults to 'nearest'.
     */
    focusBlock?: "nearest" | "center";

    /**
     * Minimum time in ms since the user's last scroll activity before auto-scrolling.
     * Prevents fighting the user's active scrolling. Defaults to 200ms.
     */
    focusDebounceMs?: number;
  };
}

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
  focusedId = null,
  focusBlock = "nearest",
  focusDebounceMs = 200,
}: useThreadViewportAutoScroll.Options): RefCallback<TElement> => {
  const divRef = useRef<TElement>(null);

  const threadViewportStore = useThreadViewportStore();
  if (autoScroll === undefined) {
    autoScroll = threadViewportStore.getState().turnAnchor !== "top";
  }

  const lastScrollTop = useRef<number>(0);
  const lastUserScrollAt = useRef<number>(0);

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

    // update lastUserScrollAt when a user-initiated scroll happens
    if (lastScrollTop.current !== div.scrollTop) {
      lastUserScrollAt.current = Date.now();
    }

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

  // scroll to bottom instantly when switching threads
  useAuiEvent("threadListItem.switchedTo", () => {
    if (!scrollToBottomOnThreadSwitch) return;
    scrollingToBottomBehaviorRef.current = "instant";
    requestAnimationFrame(() => {
      scrollToBottom("instant");
    });
  });

  // When focusedId changes, attempt to scroll the focused element into view
  useEffect(() => {
    if (!focusedId) return;
    const div = divRef.current;
    if (!div) return;

    // Do not auto-scroll if the user performed a recent scroll action
    if (Date.now() - lastUserScrollAt.current < focusDebounceMs) return;

    const el = document.getElementById(focusedId) as HTMLElement | null;
    if (!el) return;

    // only scroll if element is outside of the visible viewport
    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const viewTop = div.scrollTop;
    const viewBottom = div.scrollTop + div.clientHeight;

    if (elTop < viewTop || elBottom > viewBottom) {
      // use Element.scrollIntoView to align with focusBlock
      try {
        el.scrollIntoView({
          block: focusBlock as ScrollLogicalPosition,
          behavior: "auto",
        });
      } catch (err) {
        // fallback to manual scroll
        if (focusBlock === "center") {
          div.scrollTo({ top: elTop - div.clientHeight / 2, behavior: "auto" });
        } else {
          // nearest-ish: ensure element is visible with minimal movement
          if (elTop < viewTop) div.scrollTo({ top: elTop, behavior: "auto" });
          else
            div.scrollTo({
              top: elBottom - div.clientHeight,
              behavior: "auto",
            });
        }
      }
    }
  }, [focusedId, focusBlock, focusDebounceMs]);

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
