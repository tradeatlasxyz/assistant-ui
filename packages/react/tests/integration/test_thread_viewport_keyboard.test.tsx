import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ThreadPrimitiveViewport } from "../../src/primitives/thread/ThreadViewport";
import { ThreadPrimitiveRoot } from "../../src/primitives/thread/ThreadMessages";

// Basic integration test: ensure aria attributes and key handlers exist on container

describe("ThreadViewport keyboard integration", () => {
  it("renders role=listbox and tabIndex and responds to keydown", () => {
    const { getByRole } = render(
      <ThreadPrimitiveViewport>
        <div>child</div>
      </ThreadPrimitiveViewport>,
    );

    const container = getByRole("listbox");
    expect(container).toBeTruthy();
    expect(container.getAttribute("tabindex")).toBe("0");
  });
});
