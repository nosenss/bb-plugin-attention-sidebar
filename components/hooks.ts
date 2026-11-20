import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  isProjectSort,
  nextFrozenState,
  type ProjectSort,
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
  const value = readStorage(key);
  return value === "1" ? true : value === "0" ? false : null;
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
    writeStorage(key, value ? "1" : "0");
  }, []);
  // A temporary value for this session only; localStorage is left untouched.
  const setTemporary = useCallback((key: string, value: boolean) => {
    setFlags((previous) => ({ ...previous, [key]: value }));
  }, []);
  return { get, set, setTemporary };
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the session state when browser storage is unavailable.
  }
}

const sortKey = (projectId: string) => `attention-sidebar:sort:${projectId}`;
const openedKey = (threadId: string) => `attention-sidebar:opened:${threadId}`;

export function useProjectSorting(activeThreadId: string | null) {
  const [sorts, setSorts] = useState<Partial<Record<string, ProjectSort>>>({});
  const [openedThreads, setOpenedThreads] = useState<Partial<Record<string, number>>>({});

  useEffect(() => {
    if (activeThreadId === null) return;
    const openedAt = Date.now();
    setOpenedThreads((previous) => ({ ...previous, [activeThreadId]: openedAt }));
    writeStorage(openedKey(activeThreadId), String(openedAt));
  }, [activeThreadId]);

  const sortForProject = useCallback((projectId: string): ProjectSort => {
    const saved = sorts[projectId] ?? readStorage(sortKey(projectId));
    return isProjectSort(saved) ? saved : "updated";
  }, [sorts]);

  const setProjectSort = useCallback((projectId: string, sort: ProjectSort) => {
    setSorts((previous) => ({ ...previous, [projectId]: sort }));
    writeStorage(sortKey(projectId), sort);
  }, []);

  const openedAt = useCallback((threadId: string) => {
    return openedThreads[threadId] ?? (Number(readStorage(openedKey(threadId))) || 0);
  }, [openedThreads]);

  return { sortForProject, setProjectSort, openedAt };
}
