/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import type { FC, ReactNode } from "react";

const mockState = {
  thread: {
    messages: Array.from({ length: 3 }, () => ({ role: "assistant" })),
    length: 3,
  },
  message: { role: "assistant", composer: { isEditing: false } },
} as const;

type MockState = typeof mockState;

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: <T,>(selector: (s: MockState) => T) => selector(mockState),
  };
});

import { ThreadPrimitiveMessagesImpl } from "./ThreadMessages";

const MessageRoot: FC<{ id: string; children: ReactNode }> = ({
  id,
  children,
}) => {
  return (
    <div tabIndex={-1} data-message-root id={id}>
      {children}
    </div>
  );
};

const TestMessage: FC<{ index: number }> = ({ index }) => {
  return <MessageRoot id={`m-${index}`}>msg {index}</MessageRoot>;
};

type MessageComponentProps = { index: number };

describe("ThreadMessages keyboard navigation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("ArrowDown moves focus to next message", () => {
    const { container } = render(
      <ThreadPrimitiveMessagesImpl
        components={{
          Message: ({ index }: MessageComponentProps) => (
            <TestMessage index={index} />
          ),
        }}
      />,
    );

    const list = container.querySelector("[tabindex='0']") as HTMLElement;
    const m0 = container.querySelector("#aui-message-0") as HTMLElement;
    const m1 = container.querySelector("#aui-message-1") as HTMLElement;

    m0.focus();
    expect(document.activeElement).toBe(m0);

    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(document.activeElement).toBe(m1);
  });
});
