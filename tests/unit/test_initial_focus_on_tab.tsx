import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";

// Import the hook directly from the package source. The test assumes the project's TS/alias config
// allows resolving this relative path in the test runner environment. If your CI uses path mapping
// you may need to adjust this import.
import { useThreadKeyboardNavigation } from "../../packages/react/src/primitives/thread/useThreadKeyboardNavigation";

function TestHarness() {
  const keyboardNav = useThreadKeyboardNavigation({
    initialFocus: "last" as any,
  });

  return (
    <div
      data-testid="thread-container"
      ref={keyboardNav.containerRef as any}
      onKeyDown={(e) => keyboardNav.handleKeyDown(e)}
    >
      <div
        data-testid="msg-1"
        id="thread-message-1"
        ref={(el) => {
          if (el) keyboardNav.registerMessage("1", el);
        }}
        tabIndex={-1}
      >
        Message 1
      </div>
      <div
        data-testid="msg-2"
        id="thread-message-2"
        ref={(el) => {
          if (el) keyboardNav.registerMessage("2", el);
        }}
        tabIndex={-1}
      >
        Message 2
      </div>
    </div>
  );
}

test("tabbing into container focuses most-recent message (initialFocus=last)", async () => {
  const { getByTestId } = render(<TestHarness />);
  const container = getByTestId("thread-container");
  // Simulate tabbing into the container by focusing it
  fireEvent.focus(container);

  // The hook should set focus to the most-recent (last) message element.
  // Use waitFor to allow any microtask scheduling the hook might do.
  await waitFor(() => {
    const active = document.activeElement as HTMLElement | null;
    const last = getByTestId("msg-2");
    expect(active).toBe(last);
  });
});

// TODO: If this test flakes in CI due to registration ordering (virtualized lists register after
// focus), consider a small microtask retry in ThreadViewport.onFocus (queueMicrotask) or
// in this test wait for keyboardNav.getTotal() to be > 0 before focusing the container.
