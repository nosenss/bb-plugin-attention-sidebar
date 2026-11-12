import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  freezeThread,
  isThreadVisible,
  type FrozenThread,
  type SidebarThreadInput,
} from "../lib/model";

// One shared minute timer for every row's relative time.
const MINUTE = 60_000;
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribeNow(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const notify of listeners) notify();
    }, MINUTE);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** The current time, refreshed once a minute by one timer for the whole list. */
export function useNow(): number {
  return useSyncExternalStore(subscribeNow, () => now, () => now);
}

/**
 * The active thread's frozen placement. It is captured from the thread as the
 * list last rendered it, before the open marked it read, and kept until the
 * active thread changes.
 */
export function useFrozenActiveThread(
  activeThreadId: string | null,
  threads: readonly SidebarThreadInput[],
): FrozenThread | null {
  const state = useRef<{ id: string | null; frozen: FrozenThread | null }>({
    id: null,
    frozen: null,
  });
  const previousThreads = useRef<readonly SidebarThreadInput[]>(threads);

  if (state.current.id !== activeThreadId) {
    const seen = previousThreads.current.find((thread) => thread.id === activeThreadId);
    state.current = {
      id: activeThreadId,
      frozen: seen !== undefined && isThreadVisible(seen) ? freezeThread(seen) : null,
    };
  }
  if (activeThreadId !== null && state.current.frozen === null) {
    const current = threads.find((thread) => thread.id === activeThreadId);
    if (current !== undefined && isThreadVisible(current)) {
      state.current.frozen = freezeThread(current);
    }
  }
  previousThreads.current = threads;
  return state.current.frozen;
}

function readStored(key: string): boolean | null {
  try {
    const value = window.localStorage.getItem(key);
    return value === "1" ? true : value === "0" ? false : null;
  } catch {
    return null;
  }
}

/** Collapsed flags persisted in localStorage; null means "never set". */
export function useStoredFlags(): {
  get(key: string): boolean | null;
  set(key: string, value: boolean): void;
} {
  const [flags, setFlags] = useState<Record<string, boolean | null>>({});
  const get = useCallback(
    (key: string) => (key in flags ? flags[key]! : readStored(key)),
    [flags],
  );
  const set = useCallback((key: string, value: boolean) => {
    setFlags((previous) => ({ ...previous, [key]: value }));
    try {
      window.localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // Storage can be unavailable (private mode, quota); keep the session value.
    }
  }, []);
  return { get, set };
}
