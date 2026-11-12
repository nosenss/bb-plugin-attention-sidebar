// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFrozenActiveThread } from "../components/hooks";
import { makeThread } from "./fixtures";

describe("useFrozenActiveThread", () => {
  it("freezes the thread as last rendered, before the open marked it read", () => {
    const unread = makeThread({ id: "t", isUnread: true });
    const read = { ...unread, isUnread: false };
    const { result, rerender } = renderHook(
      ({ activeId, threads }) => useFrozenActiveThread(activeId, threads),
      { initialProps: { activeId: null as string | null, threads: [unread] } },
    );
    expect(result.current).toBeNull();

    // Opening the thread and marking it read happen in the same render.
    rerender({ activeId: "t", threads: [read] });
    expect(result.current?.placement).toEqual({ group: "attention", reason: "done" });

    // The freeze survives further updates of the list.
    rerender({ activeId: "t", threads: [{ ...read, updatedAt: read.updatedAt + 1 }] });
    expect(result.current?.placement.group).toBe("attention");
  });

  it("re-freezes when another thread becomes active and releases for none", () => {
    const a = makeThread({ id: "a", isUnread: true });
    const b = makeThread({ id: "b" });
    const { result, rerender } = renderHook(
      ({ activeId }) => useFrozenActiveThread(activeId, [a, b]),
      { initialProps: { activeId: "a" as string | null } },
    );
    expect(result.current?.threadId).toBe("a");
    rerender({ activeId: "b" });
    expect(result.current?.threadId).toBe("b");
    expect(result.current?.placement.group).toBe("folder");
    rerender({ activeId: null });
    expect(result.current).toBeNull();
  });

  it("freezes a thread that appears after the switch", () => {
    const thread = makeThread({ id: "t", isUnread: true });
    const { result, rerender } = renderHook(
      ({ threads }) => useFrozenActiveThread("t", threads),
      { initialProps: { threads: [] as ReturnType<typeof makeThread>[] } },
    );
    expect(result.current).toBeNull();
    rerender({ threads: [thread] });
    expect(result.current?.threadId).toBe("t");
  });

  it("does not write refs while rendering (renders are repeatable)", () => {
    const thread = makeThread({ id: "t", isUnread: true });
    const hook = (activeId: string | null) =>
      renderHook(({ id }) => useFrozenActiveThread(id, [thread]), { initialProps: { id: activeId } });
    // Two independent mounts give the same answer; no module or shared state.
    expect(hook("t").result.current).toEqual(hook("t").result.current);
  });
});
