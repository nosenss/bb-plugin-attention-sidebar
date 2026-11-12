import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  nextFrozenState,
  type FrozenState,
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
 * The active thread's frozen group. It is captured from the thread as the list
 * last rendered it, before the open marked it read, and kept until the active
 * thread changes. The state is derived during render (React's "adjust state on
 * input change" pattern) and the previous list is remembered in an effect, so
 * no ref is written while rendering.
 */
export function useFrozenActiveThread(
  activeThreadId: string | null,
  threads: readonly SidebarThreadInput[],
): FrozenThread | null {
  const [state, setState] = useState<FrozenState>(() =>
    nextFrozenState({ id: null, frozen: null }, activeThreadId, threads, threads),
  );
  const renderedThreads = useRef<readonly SidebarThreadInput[]>(threads);

  const next = nextFrozenState(state, activeThreadId, threads, renderedThreads.current);
  if (next !== state) setState(next);

  useEffect(() => {
    renderedThreads.current = threads;
  }, [threads]);

  return next.frozen;
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
  setTemporary(key: string, value: boolean): void;
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
  // A temporary value for this session only; localStorage is left untouched.
  const setTemporary = useCallback((key: string, value: boolean) => {
    setFlags((previous) => ({ ...previous, [key]: value }));
  }, []);
  return { get, set, setTemporary };
}
