// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type FC } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ThreadKeyboardNavigationProvider,
  useThreadKeyboardNavigation,
  useThreadKeyboardNavigationContext,
} from "./useThreadKeyboardNavigation";

let mockMessageIds = ["message-1", "message-2", "message-3"];
const mockUseAuiState = vi.fn();

type UseAuiStateSelector = Parameters<
  typeof import("@assistant-ui/store")["useAuiState"]
>[0];

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

const ThreadMessageOption: FC<{ id: string; index: number }> = ({ id, index }) => {
  const keyboardNavigation = useThreadKeyboardNavigationContext();
  const isActive = keyboardNavigation.activeMessageId === id;

  return (
    <div
      id={keyboardNavigation.getMessageOptionId(id)}
      role="option"
      tabIndex={isActive ? 0 : -1}
      data-thread-message-index={index}
      onFocus={() => keyboardNavigation.onMessageFocus(id)}
    >
      {id}
    </div>
  );
};

const KeyboardNavigationHarness = () => {
  const keyboardNavigation = useThreadKeyboardNavigation();

  return (
    <ThreadKeyboardNavigationProvider value={keyboardNavigation.contextValue}>
      <div {...keyboardNavigation.listboxProps}>
        {mockMessageIds.map((id, index) => (
          <ThreadMessageOption key={id} id={id} index={index} />
        ))}
      </div>
    </ThreadKeyboardNavigationProvider>
  );
};

describe("useThreadKeyboardNavigation", () => {
  it("focuses the latest message when entering the list", async () => {
    mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
      selector({
        thread: {
          messages: mockMessageIds.map((id) => ({ id })),
        },
      } as never),
    );

    render(<KeyboardNavigationHarness />);
    const listbox = screen.getByRole("listbox");

    listbox.focus();
    fireEvent.focus(listbox);

    const lastOption = screen.getByText("message-3");
    await waitFor(() => {
      expect(document.activeElement).toBe(lastOption);
      expect(listbox.getAttribute("aria-activedescendant")).toBe(lastOption.id);
    });
  });

  it("handles Arrow/Home/End/Page keys", async () => {
    mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
      selector({
        thread: {
          messages: mockMessageIds.map((id) => ({ id })),
        },
      } as never),
    );

    render(<KeyboardNavigationHarness />);
    const listbox = screen.getByRole("listbox");

    listbox.focus();
    fireEvent.focus(listbox);

    fireEvent.keyDown(listbox, { key: "Home" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText("message-1")));

    fireEvent.keyDown(listbox, { key: "PageDown" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText("message-3")));

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText("message-2")));

    fireEvent.keyDown(listbox, { key: "End" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText("message-3")));
  });
});
