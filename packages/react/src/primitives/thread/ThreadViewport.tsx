"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { useThreadViewportAutoScroll } from "./useThreadViewportAutoScroll";
import { ThreadPrimitiveViewportProvider } from "../../context/providers/ThreadViewportProvider";
import { useSizeHandle } from "../../utils/hooks/useSizeHandle";
import { useThreadViewport } from "../../context/react/ThreadViewportContext";
import { useAuiState } from "@assistant-ui/store";
import { useThreadKeyboardNavigation } from "./useThreadKeyboardNavigation";

export namespace ThreadPrimitiveViewport {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    /**
     * Whether to automatically scroll to the bottom when new messages are added.
     * When enabled, the viewport will automatically scroll to show the latest content.
     *
     * Default false if `turnAnchor` is "top", otherwise defaults to true.
     */
    autoScroll?: boolean | undefined;

    /**
     * Controls scroll anchoring behavior for new messages.
     * - "bottom" (default): Messages anchor at the bottom, classic chat behavior.
     * - "top": New user messages anchor at the top of the viewport for a focused reading experience.
     */
    turnAnchor?: "top" | "bottom" | undefined;

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
  };
}

const useViewportSizeRef = () => {
  const register = useThreadViewport((s) => s.registerViewport);
  const getHeight = useCallback((el: HTMLElement) => el.clientHeight, []);
  return useSizeHandle(register, getHeight);
};

const ThreadPrimitiveViewportScrollable = forwardRef<
  ThreadPrimitiveViewport.Element,
  ThreadPrimitiveViewport.Props
>(
  (
    {
      autoScroll,
      scrollToBottomOnRunStart,
      scrollToBottomOnInitialize,
      scrollToBottomOnThreadSwitch,
      children,
      ...rest
    },
    forwardedRef,
  ) => {
    const messagesLength = useAuiState((s) => s.thread.messages.length);
    const nav = useThreadKeyboardNavigation({ messageCount: messagesLength });

    const autoScrollRef = useThreadViewportAutoScroll<HTMLDivElement>({
      autoScroll,
      scrollToBottomOnRunStart,
      scrollToBottomOnInitialize,
      scrollToBottomOnThreadSwitch,
      focusedId: nav.getActiveId(),
      focusBlock: "nearest",
    });
    const viewportSizeRef = useViewportSizeRef();
    const ref = useComposedRefs(forwardedRef, autoScrollRef, viewportSizeRef);

    return (
      <Primitive.div
        {...rest}
        ref={ref}
        role={"listbox"}
        tabIndex={0}
        aria-label={rest["aria-label"] ?? "Thread messages"}
        aria-activedescendant={nav.getActiveId() ?? undefined}
        onFocus={nav.onContainerFocus}
        onKeyDown={(e) => nav.keyDownHandler(e)}
      >
        <span
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(1px, 1px, 1px, 1px)",
            whiteSpace: "nowrap",
          }}
          aria-live="polite"
        >{`Message ${nav.currentIndex + 1} of ${messagesLength}`}</span>
        {children}
      </Primitive.div>
    );
  },
);

ThreadPrimitiveViewportScrollable.displayName =
  "ThreadPrimitive.ViewportScrollable";

/**
 * A scrollable viewport container for thread messages.
 *
 * This component provides a scrollable area for displaying thread messages with
 * automatic scrolling capabilities. It manages the viewport state and provides
 * context for child components to access viewport-related functionality.
 *
 * @example
 * ```tsx
 * <ThreadPrimitive.Viewport turnAnchor="top">
 *   <ThreadPrimitive.Messages components={{ Message: MyMessage }} />
 * </ThreadPrimitive.Viewport>
 * ```
 */
export const ThreadPrimitiveViewport = forwardRef<
  ThreadPrimitiveViewport.Element,
  ThreadPrimitiveViewport.Props
>(({ turnAnchor, ...props }, ref) => {
  return (
    <ThreadPrimitiveViewportProvider options={{ turnAnchor }}>
      <ThreadPrimitiveViewportScrollable {...props} ref={ref} />
    </ThreadPrimitiveViewportProvider>
  );
});

ThreadPrimitiveViewport.displayName = "ThreadPrimitive.Viewport";
