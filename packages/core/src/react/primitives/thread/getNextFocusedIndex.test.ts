import { describe, expect, it } from "vitest";

import { getNextFocusedIndex } from "./getNextFocusedIndex";

describe("getNextFocusedIndex", () => {
  it("returns null when length <= 0", () => {
    expect(
      getNextFocusedIndex({ key: "ArrowDown", current: null, length: 0 }),
    ).toBe(null);
  });

  it("returns null for non-navigation keys", () => {
    expect(getNextFocusedIndex({ key: "a", current: 0, length: 3 })).toBe(null);
  });

  it("defaults current to last index when current is null", () => {
    expect(
      getNextFocusedIndex({ key: "ArrowUp", current: null, length: 3 }),
    ).toBe(1);
  });

  it("ArrowUp clamps at 0", () => {
    expect(getNextFocusedIndex({ key: "ArrowUp", current: 0, length: 3 })).toBe(
      0,
    );
  });

  it("ArrowDown clamps at last", () => {
    expect(
      getNextFocusedIndex({ key: "ArrowDown", current: 2, length: 3 }),
    ).toBe(2);
  });

  it("Home jumps to first", () => {
    expect(getNextFocusedIndex({ key: "Home", current: 2, length: 3 })).toBe(0);
  });

  it("End jumps to last", () => {
    expect(getNextFocusedIndex({ key: "End", current: 0, length: 3 })).toBe(2);
  });

  it("PageUp/PageDown move by pageSize and clamp", () => {
    expect(
      getNextFocusedIndex({
        key: "PageUp",
        current: 1,
        length: 10,
        pageSize: 5,
      }),
    ).toBe(0);

    expect(
      getNextFocusedIndex({
        key: "PageDown",
        current: 8,
        length: 10,
        pageSize: 5,
      }),
    ).toBe(9);
  });
});
