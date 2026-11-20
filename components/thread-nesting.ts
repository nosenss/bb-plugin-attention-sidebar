import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useSdk, type PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { canReparentThread, isThreadVisible } from "../lib/model";

const DRAG_DISTANCE = 6;

type ThreadDropTarget = { kind: "thread" | "project"; id: string };

function suppressDragClick() {
  const guard = new AbortController();
  const options = { capture: true, signal: guard.signal };
  window.addEventListener("click", (event) => {
    if (event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    guard.abort();
  }, options);
  window.addEventListener("pointerdown", () => guard.abort(), options);
  window.setTimeout(() => guard.abort(), 300);
}

export function useThreadNesting(threads: readonly PluginSidebarThread[]) {
  const sdk = useSdk();
  const byId = useMemo(() => new Map(threads.map((thread) => [thread.id, thread])), [threads]);
  const threadsById = useRef(byId);
  const gesture = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const [target, setTarget] = useState<ThreadDropTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    threadsById.current = byId;
  }, [byId]);

  useEffect(() => () => gesture.current?.abort(), []);

  const reparent = useCallback(async (threadId: string, parentThreadId: string | null) => {
    saving.current = true;
    try {
      // Nesting here only groups rows in the sidebar: keep the new parent's
      // agent from being woken by the child's turns.
      await sdk.threads.update(
        parentThreadId === null
          ? { threadId, parentThreadId }
          : { threadId, parentThreadId, parentNotifications: "off" },
      );
    } catch {
      setError("Не удалось изменить вложенность треда. Попробуйте ещё раз.");
    } finally {
      saving.current = false;
    }
  }, [sdk]);

  const start = useCallback((event: ReactPointerEvent<HTMLElement>, threadId: string) => {
    if (
      event.defaultPrevented || event.button !== 0 || event.pointerType !== "mouse" ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      saving.current || gesture.current
    ) return;

    const list = event.currentTarget.closest("[data-attention-thread-list]");
    if (list === null) return;

    const { pointerId, clientX, clientY } = event;
    const drag = new AbortController();
    gesture.current = drag;
    const options = { signal: drag.signal };
    let moved = false;

    const resolveTarget = (element: EventTarget | null): ThreadDropTarget | null => {
      if (!(element instanceof Element) || !list.contains(element)) return null;
      const threads = threadsById.current;
      const parentId = element.closest<HTMLElement>("[data-thread-row]")?.dataset.threadRow;
      if (parentId && canReparentThread(threads, threadId, parentId)) {
        return { kind: "thread", id: parentId };
      }

      const projectId = element.closest<HTMLElement>("[data-project-drop-target]")?.dataset.projectDropTarget;
      const source = threads.get(threadId);
      if (source && source.parentThreadId !== null && source.projectId === projectId && isThreadVisible(source)) {
        return { kind: "project", id: projectId };
      }
      return null;
    };

    const end = () => {
      drag.abort();
      gesture.current = null;
      setTarget(null);
      if (moved) suppressDragClick();
    };

    window.addEventListener("pointermove", (move) => {
      if (move.pointerId !== pointerId) return;
      if (!moved && Math.hypot(move.clientX - clientX, move.clientY - clientY) < DRAG_DISTANCE) {
        return;
      }
      if (!moved) setError(null);
      moved = true;
      const next = resolveTarget(move.target);
      setTarget((current) => current?.kind === next?.kind && current?.id === next?.id ? current : next);
    }, options);
    window.addEventListener("pointerup", (up) => {
      if (up.pointerId !== pointerId) return;
      const destination = moved ? resolveTarget(up.target) : null;
      end();
      if (destination !== null) {
        void reparent(threadId, destination.kind === "thread" ? destination.id : null);
      }
    }, options);
    window.addEventListener("pointercancel", (cancel) => {
      if (cancel.pointerId === pointerId) end();
    }, options);
    window.addEventListener("keydown", (key) => {
      // BB also dispatches Escape when it takes over a drag into the main pane.
      if (key.key === "Escape") end();
    }, options);
    window.addEventListener("blur", end, options);
  }, [reparent]);

  return { start, target, error };
}

export type StartThreadNesting = ReturnType<typeof useThreadNesting>["start"];
