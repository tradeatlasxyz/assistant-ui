"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
  useEffect,
} from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import "./message-root.css";
import { useSizeHandle } from "../../utils/hooks/useSizeHandle";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useThreadViewport } from "../../context/react/ThreadViewportContext";
import { ThreadPrimitiveViewportSlack } from "../thread/ThreadViewportSlack";
import { useThreadKeyboardNav } from "../thread/ThreadViewport";

const useIsHoveringRef = () => {
  const aui = useAui();
  const message = useAuiState(() => aui.message());

  const callbackRef = useCallback(
    (el: HTMLElement) => {
      const handleMouseEnter = () => {
        message.setIsHovering(true);
      };
      const handleMouseLeave = () => {
        message.setIsHovering(false);
      };

      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);

      if (el.matches(":hover")) {
        // TODO this is needed for SSR to work, figure out why
        queueMicrotask(() => message.setIsHovering(true));
      }

      return () => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
        message.setIsHovering(false);
      };
    },
    [message],
  );

  return useManagedRef(callbackRef);
};

/**
 * Hook that registers the anchor user message as a content inset.
 * Only registers if: user message, at index messages.length-2, and last message is assistant.
 */
const useMessageViewportRef = () => {
  const turnAnchor = useThreadViewport((s) => s.turnAnchor);
  const registerUserHeight = useThreadViewport(
    (s) => s.registerUserMessageHeight,
  );

  // inset rules:
  // - the previous user message before the last assistant message registers its full height
  const shouldRegisterAsInset = useAuiState(
    (s) =>
      turnAnchor === "top" &&
      s.message.role === "user" &&
      s.message.index === s.thread.messages.length - 2 &&
      s.thread.messages.at(-1)?.role === "assistant",
  );

  const getHeight = useCallback((el: HTMLElement) => el.offsetHeight, []);

  return useSizeHandle(
    shouldRegisterAsInset ? registerUserHeight : null,
    getHeight,
  );
};

export namespace MessagePrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  /**
   * Props for the MessagePrimitive.Root component.
   * Accepts all standard div element props.
   */
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * The root container component for a message.
 *
 * This component provides the foundational wrapper for message content and handles
 * hover state management for the message. It automatically tracks when the user
 * is hovering over the message, which can be used by child components like action bars.
 *
 * When `turnAnchor="top"` is set on the viewport, this component
 * registers itself as the scroll anchor if it's the last user message.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Root>
 *   <MessagePrimitive.Content />
 *   <ActionBarPrimitive.Root>
 *     <ActionBarPrimitive.Copy />
 *     <ActionBarPrimitive.Edit />
 *   </ActionBarPrimitive.Root>
 * </MessagePrimitive.Root>
 * ```
 */
export const MessagePrimitiveRoot = forwardRef<
  MessagePrimitiveRoot.Element,
  MessagePrimitiveRoot.Props
>((props, forwardRef) => {
  const isHoveringRef = useIsHoveringRef();
  const anchorUserMessageRef = useMessageViewportRef();
  const ref = useComposedRefs<HTMLDivElement>(
    forwardRef,
    isHoveringRef,
    anchorUserMessageRef,
  );
  const messageId = useAuiState((s) => s.message.id);

  // register/unregister with keyboard navigation hook if present
  const keyboardNav = useThreadKeyboardNav();

  useEffect(() => {
    const id = `thread-message-${messageId}`;
    const el = (ref as any)?.current ?? null;
    // If the keyboard nav context is available, register this message element on mount
    if (keyboardNav && el) {
      keyboardNav.registerMessage(id, el as HTMLElement | null);
    }
    return () => {
      if (keyboardNav) keyboardNav.unregisterMessage(id);
    };
    // note: ref is a composed ref function/MutableRef so we intentionally don't add it to deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, keyboardNav, (ref as any)?.current]);

  // compute stable id and accessibility attributes
  const id = `thread-message-${messageId}`;
  // derive index and total from thread state (fallbacks)
  const index = useAuiState((s) => s.message.index);
  const total = useAuiState((s) => s.thread.messages.length);

  // Prefer hook-provided index/total when available to support virtualization or filtered views.
  // We still call the aui state hooks (above) to preserve hook order, but prefer hook values when present.
  const hookIndex = keyboardNav?.getIndexById
    ? keyboardNav.getIndexById(id)
    : null;
  const hookTotal = keyboardNav?.getTotal ? keyboardNav.getTotal() : null;

  const displayedIndex = hookIndex ?? index;
  const displayedTotal = hookTotal ?? total;

  // tabIndex: if keyboard navigation is present, only the active item should be tabbable (0)
  // otherwise, fall back to tabbable (0) for keyboard-less consumers
  const isActive = keyboardNav ? keyboardNav.activeId === id : true;
  const tabIndex = keyboardNav ? (keyboardNav.activeId === id ? 0 : -1) : 0;

  // apply focused class when active
  const focusedClass = isActive ? "thread-message--focused" : "";
  const mergedClassName = [props.className, focusedClass]
    .filter(Boolean)
    .join(" ");

  // FIXME/TODO: We assume the hook's index/total reflect the visible list ordering.
  // If virtualization or filtering is applied upstream, confirm that getIndexById/getTotal
  // semantics match expectations. Adjust priority if different sources are authoritative.

  return (
    <ThreadPrimitiveViewportSlack>
      <Primitive.div
        {...props}
        ref={ref}
        data-message-id={messageId}
        id={id}
        role="option"
        tabIndex={tabIndex}
        aria-posinset={displayedIndex + 1}
        aria-setsize={displayedTotal}
        className={mergedClassName}
      />
    </ThreadPrimitiveViewportSlack>
  );
});

MessagePrimitiveRoot.displayName = "MessagePrimitive.Root";
