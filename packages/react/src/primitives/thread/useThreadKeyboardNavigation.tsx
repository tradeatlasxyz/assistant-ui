"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type UseThreadKeyboardNavigationOptions = {
  messageCount: number;
  initialIndex?: number;
  pageSize?: number;
};

export type UseThreadKeyboardNavigationResult = {
  currentIndex: number;
  setIndex: (i: number) => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  pageUp: () => void;
  pageDown: () => void;
  getActiveId: (index?: number) => string | null;
  keyDownHandler: (e: KeyboardEvent | any) => void;
  onContainerFocus: () => void;
};

const defaultPageSize = 5;

export function useThreadKeyboardNavigation({
  messageCount,
  initialIndex,
  pageSize = defaultPageSize,
}: UseThreadKeyboardNavigationOptions): UseThreadKeyboardNavigationResult {
  const cappedInitial = Math.max(
    0,
    Math.min(
      (initialIndex ?? messageCount - 1) || 0,
      Math.max(0, messageCount - 1),
    ),
  );
  const [currentIndex, setCurrentIndex] = useState<number>(cappedInitial);

  useEffect(() => {
    // When messageCount changes (e.g., new messages), ensure index is clamped
    setCurrentIndex((prev) =>
      Math.max(0, Math.min(prev, Math.max(0, messageCount - 1))),
    );
  }, [messageCount]);

  const clamp = useCallback(
    (i: number) => Math.max(0, Math.min(i, Math.max(0, messageCount - 1))),
    [messageCount],
  );

  const next = useCallback(() => setCurrentIndex((i) => clamp(i + 1)), [clamp]);
  const prev = useCallback(() => setCurrentIndex((i) => clamp(i - 1)), [clamp]);
  const first = useCallback(
    () => setCurrentIndex(() => (messageCount > 0 ? 0 : -1)),
    [messageCount],
  );
  const last = useCallback(
    () => setCurrentIndex(() => Math.max(0, messageCount - 1)),
    [messageCount],
  );
  const pageDown = useCallback(
    () => setCurrentIndex((i) => clamp(i + pageSize)),
    [clamp, pageSize],
  );
  const pageUp = useCallback(
    () => setCurrentIndex((i) => clamp(i - pageSize)),
    [clamp, pageSize],
  );

  const getActiveId = useCallback(
    (index?: number) => {
      const idx = typeof index === "number" ? index : currentIndex;
      if (idx === -1 || messageCount === 0) return null;
      // Use stable id format: thread-msg-{index}. NOTE: MessageRoot uses message id when available,
      // but index-based id is a safe fallback. Keep in sync with MessageRoot id generation.
      return `thread-msg-${idx}`;
    },
    [currentIndex, messageCount],
  );

  const onContainerFocus = useCallback(() => {
    // When container is focused, default to last message if none selected
    setCurrentIndex((i) =>
      i >= 0 && i < messageCount ? i : Math.max(0, messageCount - 1),
    );
  }, [messageCount]);

  const keyDownHandler = useCallback(
    (e: KeyboardEvent | any) => {
      // ignore when modifier keys are pressed
      // @ts-expect-error - exists on React synthetic events too
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = (e as any).target as HTMLElement | null;
      const activeElement =
        typeof document !== "undefined" ? document.activeElement : null;
      // don't trap keys when focus is inside an input, textarea, or contenteditable
      if (activeElement) {
        const tag = (activeElement as HTMLElement).tagName?.toLowerCase();
        const isEditable = (activeElement as HTMLElement).isContentEditable;
        if (tag === "input" || tag === "textarea" || isEditable) return;
      }

      const key = (e as any).key;
      let handled = true;
      switch (key) {
        case "ArrowDown":
          next();
          break;
        case "ArrowUp":
          prev();
          break;
        case "Home":
          first();
          break;
        case "End":
          last();
          break;
        case "PageDown":
          pageDown();
          break;
        case "PageUp":
          pageUp();
          break;
        default:
          handled = false;
      }

      if (handled) {
        // prevent default navigation of the page
        // Synthetic events use preventDefault on React events
        try {
          // @ts-expect-error
          if (typeof e.preventDefault === "function") e.preventDefault();
        } catch (err) {
          // ignore
        }
      }
    },
    [next, prev, first, last, pageDown, pageUp],
  );

  const setIndex = useCallback(
    (i: number) => {
      setCurrentIndex((_) => clamp(i));
    },
    [clamp],
  );

  const result = useMemo(
    () => ({
      currentIndex,
      setIndex,
      next,
      prev,
      first,
      last,
      pageUp,
      pageDown,
      getActiveId,
      keyDownHandler,
      onContainerFocus,
    }),
    [
      currentIndex,
      setIndex,
      next,
      prev,
      first,
      last,
      pageUp,
      pageDown,
      getActiveId,
      keyDownHandler,
      onContainerFocus,
    ],
  );

  return result;
}
