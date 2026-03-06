"use client";

import {
  ThreadPrimitiveMessageByIndex,
  ThreadPrimitiveMessages as CoreThreadPrimitiveMessages,
  ThreadPrimitiveMessagesImpl as CoreThreadPrimitiveMessagesImpl,
} from "@assistant-ui/core/react";
import { type ComponentProps, memo } from "react";
import {
  ThreadKeyboardNavigationProvider,
  useThreadKeyboardNavigation,
} from "./useThreadKeyboardNavigation";

export namespace ThreadPrimitiveMessages {
  export type Props = ComponentProps<typeof CoreThreadPrimitiveMessages>;
}

export const ThreadPrimitiveMessagesImpl = ({
  components,
}: ThreadPrimitiveMessages.Props) => {
  const { listboxProps, contextValue } = useThreadKeyboardNavigation();

  return (
    <ThreadKeyboardNavigationProvider value={contextValue}>
      <div {...listboxProps}>
        <CoreThreadPrimitiveMessagesImpl components={components} />
      </div>
    </ThreadKeyboardNavigationProvider>
  );
};

ThreadPrimitiveMessagesImpl.displayName = "ThreadPrimitive.Messages";

export const ThreadPrimitiveMessages = memo(ThreadPrimitiveMessagesImpl);

export { ThreadPrimitiveMessageByIndex };
