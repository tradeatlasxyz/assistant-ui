"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import { useThreadViewportAutoScroll } from "./useThreadViewportAutoScroll";
import { ThreadPrimitiveViewportProvider } from "../../context/providers/ThreadViewportProvider";
import { useSizeHandle } from "../../utils/hooks/useSizeHandle";
import { useThreadViewport } from "../../context/react/ThreadViewportContext";
import {
  useThreadKeyboardNavigation,
  type UseThreadKeyboardNavigationAPI,
} from "./useThreadKeyboardNavigation";

// Context to expose the keyboard navigation hook instance to message roots
export const ThreadKeyboardNavContext =
  createContext<UseThreadKeyboardNavigationAPI | null>(null);
export const useThreadKeyboardNav = () => useContext(ThreadKeyboardNavContext);

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
    const { onFocus: userOnFocus, ...restProps } = rest as any;
    const autoScrollRef = useThreadViewportAutoScroll<HTMLDivElement>({
      autoScroll,
      scrollToBottomOnRunStart,
      scrollToBottomOnInitialize,
      scrollToBottomOnThreadSwitch,
    });
    const viewportSizeRef = useViewportSizeRef();
    const ref = useComposedRefs(forwardedRef, autoScrollRef, viewportSizeRef);

    // instantiate keyboard navigation hook and expose via context
    const keyboardNav = useThreadKeyboardNavigation();

    // compose the container ref so hook.containerRef is attached alongside existing refs
    const composedRef = useComposedRefs(ref, keyboardNav.containerRef as any);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      // forward keyboard events to hook
      keyboardNav.handleKeyDown(e as unknown as KeyboardEvent);
    };

    // Defensive onFocus: when the container receives focus via keyboard (tab), and the
    // hook has not yet set a focusIndex (still null), apply the hook's initialFocus.
    // This makes tab-into-list focus deterministic even if registrations happen earlier/later.
    // We schedule a single microtask retry if nothing is registered yet to handle the case where
    // virtualized lists register items shortly after the container receives focus.
    const handleFocus = (e: React.FocusEvent) => {
      // call user's onFocus if present
      if (typeof userOnFocus === "function") {
        try {
          userOnFocus(e);
        } catch (_err) {
          // swallow user onFocus errors to avoid breaking keyboard nav
        }
      }

      try {
        const tryApplyInitial = () => {
          if (keyboardNav.focusIndex === null) {
            const total = keyboardNav.getTotal();
            if (total === 0) return false; // nothing registered yet — signal caller to retry

            let idx: number;
            const initial = (keyboardNav as any).initialFocus ?? undefined;
            if (initial === "first") idx = 0;
            else if (typeof initial === "number")
              idx = Math.max(0, Math.min(initial, total - 1));
            else idx = total - 1;

            if (typeof keyboardNav.focusAtIndex === "function") {
              (keyboardNav as any).focusAtIndex(idx);
            } else if (typeof keyboardNav.setFocusIndex === "function") {
              keyboardNav.setFocusIndex(idx);
            }
          }
          return true;
        };

        // First attempt: try to apply initial focus immediately.
        const applied = tryApplyInitial();
        if (!applied) {
          // If there were no registrations yet, retry once in a microtask to allow late
          // registrations to occur without introducing a loop or longer delays.
          queueMicrotask(() => {
            try {
              tryApplyInitial();
            } catch (_err) {
              // swallow
            }
          });
        }
      } catch (_err) {
        // defensive: do not throw during focus
      }
    };

    return (
      <ThreadKeyboardNavContext.Provider value={keyboardNav}>
        <Primitive.div
          {...restProps}
          ref={composedRef}
          role="listbox"
          tabIndex={0}
          aria-activedescendant={keyboardNav.activeId ?? undefined}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
        >
          {children}
        </Primitive.div>
      </ThreadKeyboardNavContext.Provider>
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
