"use client";

import { useAuiState } from "@assistant-ui/store";
import {
  createContext,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

const PAGE_NAVIGATION_STEP = 5;
const MESSAGE_INDEX_ATTRIBUTE = "data-thread-message-index";

type ThreadKeyboardNavigationContextValue = {
  activeMessageId: string | undefined;
  getMessageOptionId: (messageId: string) => string;
  onMessageFocus: (messageId: string) => void;
};

const ThreadKeyboardNavigationContext =
  createContext<ThreadKeyboardNavigationContextValue | null>(null);

const clampIndex = (index: number, length: number) => {
  if (length <= 0) return -1;
  return Math.max(0, Math.min(index, length - 1));
};

export const getThreadMessageOptionId = (
  listboxId: string,
  messageId: string,
) => {
  return `${listboxId}-message-${encodeURIComponent(messageId)}`;
};

export type UseThreadKeyboardNavigationResult = {
  listboxProps: {
    ref: (element: HTMLDivElement | null) => void;
    role: "listbox";
    tabIndex: number;
    "aria-label": string;
    "aria-activedescendant": string | undefined;
    onKeyDown: KeyboardEventHandler<HTMLDivElement>;
    onFocusCapture: FocusEventHandler<HTMLDivElement>;
  };
  contextValue: ThreadKeyboardNavigationContextValue;
};

export const useThreadKeyboardNavigation = (): UseThreadKeyboardNavigationResult => {
  const messageIds = useAuiState((s) => s.thread.messages.map((m) => m.id));
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousLastMessageId = useRef<string | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(-1);

  const setContainerRef = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
  }, []);

  const focusIndex = useCallback(
    (nextIndex: number) => {
      const boundedIndex = clampIndex(nextIndex, messageIds.length);
      if (boundedIndex < 0) return;

      setActiveIndex(boundedIndex);
      const messageElement = containerRef.current?.querySelector<HTMLElement>(
        `[${MESSAGE_INDEX_ATTRIBUTE}="${boundedIndex}"]`,
      );
      if (!messageElement) return;

      messageElement.focus({ preventScroll: true });
      messageElement.scrollIntoView({ block: "nearest" });
    },
    [messageIds.length],
  );

  useEffect(() => {
    const messagesLength = messageIds.length;
    if (messagesLength === 0) {
      setActiveIndex(-1);
      previousLastMessageId.current = undefined;
      return;
    }

    const lastMessageId = messageIds[messagesLength - 1];
    const hasNewTailMessage = lastMessageId !== previousLastMessageId.current;
    const shouldResetToLatest =
      hasNewTailMessage || activeIndex < 0 || activeIndex >= messagesLength;

    if (shouldResetToLatest) {
      setActiveIndex(messagesLength - 1);
    }

    previousLastMessageId.current = lastMessageId;
  }, [activeIndex, messageIds]);

  const onKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (event) => {
      const currentIndex = clampIndex(activeIndex, messageIds.length);
      if (currentIndex < 0) return;

      let nextIndex: number | null = null;

      switch (event.key) {
        case "ArrowDown":
          nextIndex = currentIndex + 1;
          break;
        case "ArrowUp":
          nextIndex = currentIndex - 1;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = messageIds.length - 1;
          break;
        case "PageDown":
          nextIndex = currentIndex + PAGE_NAVIGATION_STEP;
          break;
        case "PageUp":
          nextIndex = currentIndex - PAGE_NAVIGATION_STEP;
          break;
        default:
          return;
      }

      event.preventDefault();
      focusIndex(nextIndex);
    },
    [activeIndex, focusIndex, messageIds.length],
  );

  const onFocusCapture = useCallback<FocusEventHandler<HTMLDivElement>>(
    (event) => {
      if (event.target !== event.currentTarget) return;

      const fallbackIndex = messageIds.length - 1;
      const nextIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
      focusIndex(nextIndex);
    },
    [activeIndex, focusIndex, messageIds.length],
  );

  const activeMessageId =
    activeIndex >= 0 && activeIndex < messageIds.length
      ? messageIds[activeIndex]
      : undefined;

  const getMessageOptionId = useCallback(
    (messageId: string) => getThreadMessageOptionId(listboxId, messageId),
    [listboxId],
  );

  const onMessageFocus = useCallback(
    (messageId: string) => {
      const index = messageIds.indexOf(messageId);
      if (index < 0) return;
      setActiveIndex(index);
    },
    [messageIds],
  );

  const contextValue = useMemo<ThreadKeyboardNavigationContextValue>(
    () => ({
      activeMessageId,
      getMessageOptionId,
      onMessageFocus,
    }),
    [activeMessageId, getMessageOptionId, onMessageFocus],
  );

  return {
    listboxProps: {
      ref: setContainerRef,
      role: "listbox",
      tabIndex: 0,
      "aria-label": "Thread messages",
      "aria-activedescendant": activeMessageId
        ? getMessageOptionId(activeMessageId)
        : undefined,
      onKeyDown,
      onFocusCapture,
    },
    contextValue,
  };
};

export const ThreadKeyboardNavigationProvider = ({
  value,
  children,
}: PropsWithChildren<{ value: ThreadKeyboardNavigationContextValue }>) => {
  return (
    <ThreadKeyboardNavigationContext.Provider value={value}>
      {children}
    </ThreadKeyboardNavigationContext.Provider>
  );
};

export const useThreadKeyboardNavigationContext = (
  options?: {
    optional?: boolean | undefined;
  },
) => {
  const context = useContext(ThreadKeyboardNavigationContext);
  if (!options?.optional && !context) {
    throw new Error("This component must be used within ThreadPrimitive.Messages.");
  }
  return context;
};
