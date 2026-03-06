Implementation plan: Keyboard navigation for Thread messages

Target: Add keyboard navigation to the Thread message list (arrow up/down, Home, End, PageUp/PageDown).

Files inspected and verified present in repo:
- /workspaces/assistant-ui/packages/react/src/primitives/message/MessageRoot.tsx
- /workspaces/assistant-ui/packages/react/src/primitives/thread/ThreadViewport.tsx
- /workspaces/assistant-ui/packages/react/src/primitives/thread/ThreadMessages.tsx (re-exports core implementation)
- /workspaces/assistant-ui/packages/core/src/react/primitives/thread/ThreadMessages.tsx

Summary of required changes (per-file, exact edits or insertion points):

1) packages/react/src/primitives/message/MessageRoot.tsx
- Current state: MessagePrimitiveRoot renders <Primitive.div {...props} ref={ref} data-message-id={messageId} />
- Required edits (concrete):
  a) Add role and id attributes so each message is an option and has a stable id consumed by aria-activedescendant.
     Replace the returned element with:
     <ThreadPrimitiveViewportSlack>
       <Primitive.div
         {...props}
         ref={ref}
         id={`thread-message-${messageId}`}
         data-message-id={messageId}
         role="option"
         aria-selected={props["data-focused"] ? "true" : "false"}
       />
     </ThreadPrimitiveViewportSlack>
  b) Expose a focused prop (boolean) on MessagePrimitiveRoot so consumers (ThreadMessages/hook) can mark which item should receive tabIndex=0 and focus styling.
     - Signature: export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & { focused?: boolean };
     - Add tabIndex logic: tabIndex={focused ? 0 : -1}
     - When focused is true, the component should call ref.focus() in an effect (or consumer can call .focus()). We will prefer consumer calling element.focus() via registration API; keep an effect optional.
  c) Add className when focused for visible focus ring (class: thread-message--focused). Avoid adding CSS file yet — plan for CSS token usage.

Notes/Assumptions/TODOs for MessageRoot:
- There are already inner interactive elements. We must ensure tabIndex on the message container does not trap focus and that child interactive controls remain reachable. This is an implementation detail for Phase 2 (tests will validate)
- Use id="thread-message-${messageId}" to ensure uniqueness across threads. If messageId may contain unsafe chars, sanitize with encodeURIComponent or replace non-alphanum with "-".


2) packages/core/src/react/primitives/thread/ThreadMessages.tsx (core implementation)
- Current state: ThreadPrimitiveMessagesImpl renders an array of ThreadPrimitiveMessageByIndex.
- Required edits (concrete):
  a) Ensure each message item registers with navigation hook via a provider or prop. Add data attributes / stable index id on the root provider or MessageByIndexProvider so MessageRoot receives index and id.
  b) Update ThreadPrimitiveMessageByIndex render to pass registration props to Message component. Example insertion point inside ThreadPrimitiveMessageByIndex (index available):
     - Provide data-message-index attribute to the rendered Message root container: data-message-index={index}
     - Provide aria-posinset and aria-setsize: aria-posinset={index + 1} aria-setsize={messagesLength}
     - Pass focused prop when navigation state indicates this index is active (the hook will provide activeIndex via context — see hook design)
  c) Add small stable id generation: id={`thread-message-${threadId}-${index}`} or use message.id if available (prefer message.id).

Notes:
- ThreadPrimitiveMessagesImpl uses useAuiState to get messagesLength but does not pass index-specific props — we'll modify ThreadPrimitiveMessageByIndex to receive registration callbacks from hook via context (see hook design) in Phase 2.


3) packages/react/src/primitives/thread/ThreadViewport.tsx
- Current state: ThreadPrimitiveViewportScrollable renders <Primitive.div {...rest} ref={ref}>{children}</Primitive.div>
- Required edits (concrete):
  a) Add role="listbox" and aria-label (configurable via prop) on the scroll container: <Primitive.div role="listbox" aria-label={props["aria-label"] ?? "Messages"} {...rest} ref={ref} onKeyDown={handleKeyDown} aria-activedescendant={activeId} tabIndex={0}>{children}</Primitive.div>
  b) Attach onKeyDown handler which forwards events to useThreadKeyboardNavigation handler (container-level keydown). The handler should be attached on the scrollable root so keyboard events are captured when the user tabs into the container.
  c) Expose containerRef from hook to combine with existing refs: useComposedRefs(forwardedRef, autoScrollRef, viewportSizeRef, containerRefFromHook)

Notes:
- Avoid preventDefault on arrow keys except where necessary. PageUp/PageDown may preventDefault to avoid browser page scroll while navigating.


4) New hook: packages/react/src/primitives/thread/useThreadKeyboardNavigation.tsx
- Create a new file exporting a hook and types. Place under packages/react/src/primitives/thread/ to be used by ThreadViewport and ThreadMessages.

Hook API sketch (TypeScript) — include as part of plan file and later create actual TS file in Phase 2.

export type KeyboardNavOptions = {
  initialFocus?: 'last' | 'first' | number; // default 'last'
  pageStep?: number; // default 5
  smoothScroll?: boolean; // default true
};

export type UseThreadKeyboardNavigationAPI = {
  containerRef: React.RefCallback<HTMLElement> | React.RefObject<HTMLElement>;
  activeIndex: number | null; // current focused message index
  activeId: string | null; // id string for aria-activedescendant
  setActiveIndex: (index: number) => void;
  registerMessage: (index: number, el: HTMLElement | null, messageId?: string) => void;
  unregisterMessage: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void; // attach to container
};

export function useThreadKeyboardNavigation(opts?: KeyboardNavOptions): UseThreadKeyboardNavigationAPI {
  // responsibilities:
  // - maintain ordered registry: Map<number, HTMLElement>
  // - maintain activeIndex (init per opts.initialFocus)
  // - implement handleKeyDown: ArrowUp/Down, Home, End, PageUp/PageDown
  // - when activeIndex changes: call element.focus() and scrollIntoView({ block: 'nearest', behavior: opts.smoothScroll ? 'smooth' : 'auto' })
  // - expose activeId for aria-activedescendant (prefer message DOM id if provided or generated id by index)
}

Key semantics (documented):
- ArrowDown: move to min(activeIndex + 1, lastIndex)
- ArrowUp: move to max(activeIndex - 1, 0)
- Home: setActiveIndex(0)
- End: setActiveIndex(lastIndex)
- PageDown: setActiveIndex(min(activeIndex + pageStep, lastIndex))
- PageUp: setActiveIndex(max(activeIndex - pageStep, 0))
- If activeIndex is null on first Tab into container, resolve to default initialFocus (last by default)

Edge cases:
- When list length changes (new messages), policy: default resets activeIndex to last message (configurable). This will be option in the hook (preserveOnAppend?: boolean)
- Message heights vary; PageUp/PageDown uses pageStep by default (5). Future enhancement: compute step based on container height and average item height.


5) Tests (planned locations and purpose):
- Unit tests (key handling & index arithmetic): tests/unit/test_keyboard_keyhandler.py
- Integration tests (end-to-end): tests/integration/test_thread_integration.py::test_keyboard_navigation_in_thread
- Unit tests for aria attributes and tabindex: tests/unit/test_message_root_tabindex.py
- Add test fixtures for rendering Thread components: tests/unit/fixtures/thread_fixture.py


Task mapping to task-tree nodes (this plan addresses design/planning nodes):
- kn-001-a (Design keyboard handling API and key-mapping behavior): satisfied by this document and hook API sketch in this file.
- kn-001-a-i (Write TypeScript definition for useThreadKeyboardNavigation hook): satisfied at design-level; TS definitions are included as sketch in this file and will be converted into actual .ts(x) in Phase 2.

Remaining nodes (next-phase implementation):
- kn-001-b (Implement useThreadKeyboardNavigation hook) -> Phase 2
- kn-001-c (Integrate hook into ThreadMessages and ThreadViewport) -> Phase 2
- kn-002 (MessageRoot tabIndex & focus styles) -> Phase 2
- kn-003 (ARIA attributes & screen reader semantics) -> Phase 2
- kn-005 (Tests) -> Phase 2/3

Assumptions / TODOs requiring clarification before Phase 2:
- Choice: use message.id (useAuiState((s) => s.message.id)) for stable id or compute from thread id+index. Confirm that message.id is stable and URL-safe.
- Decide default pageStep size (we propose default 5). Record as configurable.
- Decide whether MessageRoot will call element.focus() itself when focused prop toggles or whether the hook will call focus() on registered elements. Plan: hook will call focus() via stored HTMLElement references (prefer explicit focus orchestration in hook).
- Styling: define class thread-message--focused and map to design tokens. Exact CSS location TBD; minimal class name planning included.

Validation steps for Phase 2 (what to run when implementing):
- Run unit tests: pytest tests/unit/test_keyboard_keyhandler.py
- Run integration tests: pytest tests/integration/test_thread_integration.py::test_keyboard_navigation_in_thread
- Validate docs: manual verification with VoiceOver/NVDA as noted in kn-006

Next concrete actions for Phase 2 (implementation):
1) Create packages/react/src/primitives/thread/useThreadKeyboardNavigation.tsx with typed API, registry, key handling, and scroll & focus behavior. (kn-001-b)
2) Modify packages/core/src/react/primitives/thread/ThreadMessages.tsx ThreadPrimitiveMessageByIndex to call registerMessage/unregisterMessage with the element ref during mounting/unmounting, and pass focused attribute to MessageRoot (kn-001-c-i).
3) Modify packages/react/src/primitives/thread/ThreadViewport.tsx to compose containerRef from hook, add onKeyDown={handleKeyDown}, role=listbox, aria-activedescendant bound to activeId. (kn-001-c-ii)
4) Modify MessageRoot to accept focused?: boolean, set tabIndex appropriately and apply focused class, id attribute and role="option" (kn-002-a).
5) Add tests as described.

Plan file location (this file):
- /workspaces/assistant-ui/packages/react/src/primitives/thread/KEYBOARD_NAVIGATION_PLAN.md


End of plan.
