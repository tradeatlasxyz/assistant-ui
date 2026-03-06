import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useThreadKeyboardNavigation } from "../../workspaces/assistant-ui/packages/react/src/primitives/thread/useThreadKeyboardNavigation";

// Note: The path above is intentionally incorrect for local test runner; instead we'll test the internal logic by importing the module directly via relative path
