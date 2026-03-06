import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react-hooks";
import { useThreadKeyboardNavigation } from "../../../packages/react/src/primitives/thread/useThreadKeyboardNavigation";

describe("useThreadKeyboardNavigation key handling", () => {
  it("calculates next/previous indices and clamps at boundaries", () => {
    const { result } = renderHook(() =>
      useThreadKeyboardNavigation({ pageStep: 2 }),
    );

    // Simulate registration of 5 messages with ids 'm0'..'m4'
    for (let i = 0; i < 5; i++) {
      result.current.registerMessage(`m${i}`, {
        focus: () => {},
        scrollIntoView: () => {},
      } as unknown as HTMLElement);
    }

    // Initial focusIndex null -> defaults to last when navigating
    act(() => {
      result.current.handleKeyDown(
        new KeyboardEvent("keydown", { key: "ArrowDown" }) as unknown as any,
      );
    });
    expect(result.current.focusIndex).toBe(4);

    act(() => {
      result.current.handleKeyDown(
        new KeyboardEvent("keydown", { key: "ArrowUp" }) as unknown as any,
      );
    });
    expect(result.current.focusIndex).toBe(3);

    act(() => {
      result.current.handleKeyDown(
        new KeyboardEvent("keydown", { key: "Home" }) as unknown as any,
      );
    });
    expect(result.current.focusIndex).toBe(0);

    act(() => {
      result.current.handleKeyDown(
        new KeyboardEvent("keydown", { key: "End" }) as unknown as any,
      );
    });
    expect(result.current.focusIndex).toBe(4);

    act(() => {
      result.current.handleKeyDown(
        new KeyboardEvent("keydown", { key: "PageUp" }) as unknown as any,
      );
    });
    expect(result.current.focusIndex).toBe(2);

    act(() => {
      result.current.handleKeyDown(
        new KeyboardEvent("keydown", { key: "PageDown" }) as unknown as any,
      );
    });
    expect(result.current.focusIndex).toBe(4);
  });
});
