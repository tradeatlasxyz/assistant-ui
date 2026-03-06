"use client";

import { useCallback, useRef, useState } from "react";

export type KeyboardNavOptions = {
  pageStep?: number; // number of items to skip on PageUp/PageDown
  /**
   * initialFocus: determines which item to focus when the container is first focused/mounted.
   * - "last" (default): focus most recent message
   * - "first": focus first message
   * - number: focus a specific index
   */
  initialFocus?: "last" | "first" | number;
};

import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export type UseThreadKeyboardNavigationAPI = {
  focusIndex: number | null;
  setFocusIndex: (index: number | null) => void;
  registerMessage: (id: string, el: HTMLElement | null) => void;
  unregisterMessage: (id: string) => void;
  containerRef: (el: HTMLElement | null) => void;
  handleKeyDown: (e: ReactKeyboardEvent | KeyboardEvent) => void;
  activeId: string | null;
  /** Get the index for a given message id, or null if unknown */
  getIndexById: (id: string) => number | null;
  /** Get the current total number of registered messages */
  getTotal: () => number;
};

export function useThreadKeyboardNavigation(
  options?: KeyboardNavOptions,
): UseThreadKeyboardNavigationAPI {
  const pageStep = options?.pageStep ?? 5;
  const initialFocus = options?.initialFocus ?? "last";
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  // map from id -> element
  const messagesRef = useRef(new Map<string, HTMLElement | null>());
  const containerRefEl = useRef<HTMLElement | null>(null);

  const getOrderedIds = useCallback(() => {
    // Map preserves insertion order assuming register/unregister called in render order.
    return Array.from(messagesRef.current.keys());
  }, []);
  // compute activeId from ordered ids and focusIndex
  const activeId = getOrderedIds().at(focusIndex ?? -1) ?? null;

  const registerMessage = useCallback(
    (id: string, el: HTMLElement | null) => {
      messagesRef.current.set(id, el);

      // If no focusIndex set yet, apply initial focus policy when the first messages register.
      // NOTE: registration order and virtualization may affect when this runs; keep behavior conservative.
      if (focusIndex === null) {
        const ids = getOrderedIds();
        if (ids.length === 0) return;

        let newIndex: number;
        if (typeof initialFocus === "number") {
          newIndex = Math.max(0, Math.min(initialFocus, ids.length - 1));
        } else if (initialFocus === "first") {
          newIndex = 0;
        } else {
          // default: 'last'
          newIndex = ids.length - 1;
        }

        setFocusIndex(newIndex);
        // focus the element if present
        try {
          const targetId = ids[newIndex];
          const targetEl = messagesRef.current.get(targetId);
          if (targetEl) {
            targetEl.focus();
            targetEl.scrollIntoView({ block: "nearest" });
          }
        } catch (_err) {
          // ignore focus errors
        }
      }
    },
    [focusIndex, getOrderedIds, initialFocus],
  );

  const unregisterMessage = useCallback((id: string) => {
    messagesRef.current.delete(id);
  }, []);

  const containerRef = useCallback((el: HTMLElement | null) => {
    containerRefEl.current = el;
  }, []);

  const focusById = useCallback((id: string | null) => {
    if (!id) return;
    const el = messagesRef.current.get(id);
    if (el) {
      try {
        el.focus();
        el.scrollIntoView({ block: "nearest" });
      } catch (_err) {
        // ignore
      }
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: any) => {
      const ids = getOrderedIds();
      if (ids.length === 0) return;

      const clamp = (n: number) => Math.max(0, Math.min(n, ids.length - 1));
      let currentIndex = focusIndex === null ? ids.length - 1 : focusIndex;

      switch (e.key) {
        case "ArrowDown":
          currentIndex = clamp(currentIndex + 1);
          setFocusIndex(currentIndex);
          focusById(ids[currentIndex]);
          e.preventDefault();
          break;
        case "ArrowUp":
          currentIndex = clamp(currentIndex - 1);
          setFocusIndex(currentIndex);
          focusById(ids[currentIndex]);
          e.preventDefault();
          break;
        case "Home":
          currentIndex = 0;
          setFocusIndex(currentIndex);
          focusById(ids[currentIndex]);
          e.preventDefault();
          break;
        case "End":
          currentIndex = ids.length - 1;
          setFocusIndex(currentIndex);
          focusById(ids[currentIndex]);
          e.preventDefault();
          break;
        case "PageDown":
          currentIndex = clamp(currentIndex + pageStep);
          setFocusIndex(currentIndex);
          focusById(ids[currentIndex]);
          e.preventDefault();
          break;
        case "PageUp":
          currentIndex = clamp(currentIndex - pageStep);
          setFocusIndex(currentIndex);
          focusById(ids[currentIndex]);
          e.preventDefault();
          break;
        default:
          return;
      }
    },
    [focusIndex, getOrderedIds, pageStep, focusById],
  );

  const getIndexById = useCallback(
    (id: string) => {
      const ids = getOrderedIds();
      const i = ids.indexOf(id);
      return i === -1 ? null : i;
    },
    [getOrderedIds],
  );

  const getTotal = useCallback(() => getOrderedIds().length, [getOrderedIds]);

  const focusAtIndex = useCallback(
    (index: number) => {
      const ids = getOrderedIds();
      if (ids.length === 0) return;
      const clampIndex = Math.max(0, Math.min(index, ids.length - 1));
      setFocusIndex(clampIndex);
      const targetId = ids[clampIndex];
      const targetEl = messagesRef.current.get(targetId);
      if (targetEl) {
        try {
          targetEl.focus();
          targetEl.scrollIntoView({ block: "nearest" });
        } catch (_err) {
          // ignore
        }
      }
    },
    [getOrderedIds],
  );

  return {
    focusIndex,
    setFocusIndex,
    registerMessage,
    unregisterMessage,
    containerRef,
    handleKeyDown,
    activeId,
    getIndexById,
    getTotal,
    focusAtIndex,
  };
}
