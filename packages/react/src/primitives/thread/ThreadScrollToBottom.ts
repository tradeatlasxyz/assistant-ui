"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAuiState } from "@assistant-ui/store";
import {
  useThreadViewport,
  useThreadViewportStore,
} from "../../context/react/ThreadViewportContext";

export namespace useThreadScrollToBottom {
  export type Options = {
    behavior?: ScrollBehavior | undefined;
  };
}

const useThreadScrollToBottom = ({
  behavior,
}: useThreadScrollToBottom.Options = {}) => {
  const isAtBottom = useThreadViewport((s) => s.isAtBottom);
  const threadId = useAuiState((s) => s.threadListItem.id);

  const threadViewportStore = useThreadViewportStore();

  const handleScrollToBottom = useCallback(() => {
    threadViewportStore.getState().clearThreadScrollPosition(threadId);
    threadViewportStore.getState().scrollToBottom({ behavior });
  }, [threadViewportStore, behavior, threadId]);

  if (isAtBottom) return null;
  return handleScrollToBottom;
};

export namespace ThreadPrimitiveScrollToBottom {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadScrollToBottom>;
}

export const ThreadPrimitiveScrollToBottom = createActionButton(
  "ThreadPrimitive.ScrollToBottom",
  useThreadScrollToBottom,
  ["behavior"],
);
