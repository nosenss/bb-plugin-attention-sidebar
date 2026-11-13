/**
 * Pure grouping and sorting for the sidebar. The React layer only renders
 * what `buildSidebarModel` returns; every rule about which thread goes where
 * lives here and is unit-tested.
 */

/** The fields of bb's `PluginSidebarThread` this module reads. */
export interface SidebarThreadInput {
  id: string;
  projectId: string;
  displayTitle: string;
  parentThreadId: string | null;
  status: string;
  runtimeStatus: string;
  queuedWork: string;
  hasPendingInteraction: boolean;
  indicator: string;
  isUnread: boolean;
  isPinned: boolean;
  pinnedAt: number | null;
  pinSortKey: string | null;
  isArchived: boolean;
  isHidden: boolean;
  updatedAt: number;
  latestAttentionAt: number;
}

export interface SidebarProjectInput {
  id: string;
  name: string;
  isPersonal: boolean;
}

export type AttentionReason = "question" | "error" | "done";
export type ThreadGroup = "attention" | "working" | "pinned" | "folder";

export interface Placement {
  group: ThreadGroup;
  /** Set only for the "attention" group. */
  reason: AttentionReason | null;
}

const KNOWN_INDICATORS = new Set([
  "background-agent",
  "background-command",
  "draft",
  "none",
  "plan-mode",
  "queued-failed",
  "queued-waiting",
  "runtime",
  "unread-error",
  "unread-success",
  "waiting-for-input",
  "workflow",
  "working-draft",
]);
const BUSY_STATUSES = new Set(["starting", "active", "stopping"]);
const BUSY_RUNTIME_STATUSES = new Set(["provisioning", "waiting-for-host"]);
const WORKING_INDICATORS = new Set([
  "runtime",
  "workflow",
  "background-agent",
  "background-command",
  "plan-mode",
  "queued-waiting",
]);

/** Unknown indicator values (bb adds kinds over time) count as "none". */
export function normalizeIndicator(indicator: string): string {
  return KNOWN_INDICATORS.has(indicator) ? indicator : "none";
}

export function isThreadWorking(thread: SidebarThreadInput): boolean {
  return (
    BUSY_STATUSES.has(thread.status) ||
    BUSY_RUNTIME_STATUSES.has(thread.runtimeStatus) ||
    WORKING_INDICATORS.has(normalizeIndicator(thread.indicator))
  );
}

/** Where a thread goes, by its own state only (rules 1–6 of the spec). */
export function classifyThread(thread: SidebarThreadInput): Placement {
  const indicator = normalizeIndicator(thread.indicator);
  if (thread.hasPendingInteraction || indicator === "waiting-for-input") {
    return { group: "attention", reason: "question" };
  }
  if (
    indicator === "unread-error" ||
    indicator === "queued-failed" ||
    thread.queuedWork === "failed"
  ) {
    return { group: "attention", reason: "error" };
  }
  if (indicator === "unread-success" || thread.isUnread) {
    return { group: "attention", reason: "done" };
  }
  if (isThreadWorking(thread)) return { group: "working", reason: null };
  if (thread.isPinned) return { group: "pinned", reason: null };
  return { group: "folder", reason: null };
}

/**
 * The active thread's group and sort keys, captured when it became active. It
 * keeps the thread in that group (and position) until the user opens another
 * one. The reason glyph is not frozen: it always follows the live thread.
 */
export interface FrozenThread {
  threadId: string;
  placement: Placement;
  updatedAt: number;
  latestAttentionAt: number;
}

export function freezeThread(thread: SidebarThreadInput): FrozenThread {
  return {
    threadId: thread.id,
    placement: classifyThread(thread),
    updatedAt: thread.updatedAt,
    latestAttentionAt: thread.latestAttentionAt,
  };
}

/** The active-thread freeze as kept by the `useFrozenActiveThread` hook. */
export interface FrozenState {
  id: string | null;
  frozen: FrozenThread | null;
}

/**
 * Pure step of the freeze: given the previous state, the active thread, the
 * current threads and the threads as the list last rendered them (before the
 * open marked the thread read), returns the next state — the same object when
 * nothing changes.
 */
export function nextFrozenState(
  state: FrozenState,
  activeThreadId: string | null,
  threads: readonly SidebarThreadInput[],
  previousThreads: readonly SidebarThreadInput[],
): FrozenState {
  if (state.id !== activeThreadId) {
    const seen = previousThreads.find((thread) => thread.id === activeThreadId);
    return {
      id: activeThreadId,
      frozen: seen !== undefined && isThreadVisible(seen) ? freezeThread(seen) : null,
    };
  }
  if (activeThreadId !== null && state.frozen === null) {
    const current = threads.find((thread) => thread.id === activeThreadId);
    if (current !== undefined && isThreadVisible(current)) {
      return { id: activeThreadId, frozen: freezeThread(current) };
    }
  }
  return state;
}

export interface TopRow<T extends SidebarThreadInput> {
  thread: T;
  /**
   * Live reason, set only for rows in «Ждут вас». A frozen active thread that
   * no longer needs attention (a question was answered) sits in the block
   * with `reason: null`.
   */
  reason: AttentionReason | null;
  /** Title of the parent thread, for the "↳ parent" caption; null at the root. */
  parentTitle: string | null;
}

export interface FolderRow<T extends SidebarThreadInput> {
  thread: T;
  /** Indentation level: 0 for a root, 1 for its child, and so on. */
  depth: number;
  /** Set when the thread is a child shown as a root (its parent is elsewhere). */
  parentTitle: string | null;
}

export interface ProjectFolder<T extends SidebarThreadInput> {
  projectId: string;
  name: string;
  isPersonal: boolean;
  /** Rows in display order (parents before their indented children). */
  rows: FolderRow<T>[];
  /** max(updatedAt) of the folder's threads. */
  lastActivityAt: number;
  /** Threads of the whole project currently in «Ждут вас». */
  attentionCount: number;
  /** Threads of the whole project currently in «В работе». */
  workingCount: number;
}

export interface SidebarModel<T extends SidebarThreadInput> {
  attention: TopRow<T>[];
  working: TopRow<T>[];
  pinned: TopRow<T>[];
  folders: ProjectFolder<T>[];
  /** Number of visible threads; 0 means "Тредов пока нет". */
  visibleCount: number;
}

export interface BuildSidebarModelInput<T extends SidebarThreadInput> {
  threads: readonly T[];
  projects: readonly SidebarProjectInput[];
  frozen?: FrozenThread | null;
}

const REASON_ORDER: Record<AttentionReason, number> = {
  question: 0,
  error: 1,
  done: 2,
};

const byDesc = (a: number, b: number) => b - a;

export function isThreadVisible(thread: SidebarThreadInput): boolean {
  return !thread.isHidden && !thread.isArchived;
}

/** bb's pin order: keyed pins by key, then unkeyed pins newest first. */
function comparePinned(a: SidebarThreadInput, b: SidebarThreadInput): number {
  if (a.pinSortKey !== null && b.pinSortKey !== null) {
    if (a.pinSortKey !== b.pinSortKey) return a.pinSortKey < b.pinSortKey ? -1 : 1;
  } else if (a.pinSortKey !== null) {
    return -1;
  } else if (b.pinSortKey !== null) {
    return 1;
  }
  const byPinnedAt = byDesc(a.pinnedAt ?? 0, b.pinnedAt ?? 0);
  return byPinnedAt !== 0 ? byPinnedAt : a.id.localeCompare(b.id);
}

export function buildSidebarModel<T extends SidebarThreadInput>({
  threads,
  projects,
  frozen = null,
}: BuildSidebarModelInput<T>): SidebarModel<T> {
  const visible = threads.filter(isThreadVisible);
  const byId = new Map(visible.map((thread) => [thread.id, thread]));

  // Effective placement and sort keys (the frozen active thread keeps its own).
  const placement = new Map<string, Placement>();
  const liveReason = new Map<string, AttentionReason | null>();
  const updatedAt = new Map<string, number>();
  const attentionAt = new Map<string, number>();
  for (const thread of visible) {
    const isFrozen = frozen?.threadId === thread.id;
    const live = classifyThread(thread);
    placement.set(thread.id, isFrozen ? frozen.placement : live);
    liveReason.set(thread.id, live.group === "attention" ? live.reason : null);
    updatedAt.set(thread.id, isFrozen ? frozen.updatedAt : thread.updatedAt);
    attentionAt.set(
      thread.id,
      isFrozen ? frozen.latestAttentionAt : thread.latestAttentionAt,
    );
  }
  const groupOf = (thread: T) => placement.get(thread.id)!.group;
  const updated = (thread: T) => updatedAt.get(thread.id)!;
  const parentOf = (thread: T): T | null =>
    thread.parentThreadId === null ? null : (byId.get(thread.parentThreadId) ?? null);

  const topRow = (thread: T): TopRow<T> => ({
    thread,
    reason: groupOf(thread) === "attention" ? liveReason.get(thread.id)! : null,
    parentTitle: parentOf(thread)?.displayTitle ?? null,
  });

  const attention = visible
    .filter((thread) => groupOf(thread) === "attention")
    .sort((a, b) => {
      const reasonA = REASON_ORDER[placement.get(a.id)!.reason!];
      const reasonB = REASON_ORDER[placement.get(b.id)!.reason!];
      if (reasonA !== reasonB) return reasonA - reasonB;
      const byTime = byDesc(attentionAt.get(a.id)!, attentionAt.get(b.id)!);
      return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
    })
    .map(topRow);

  const working = visible
    .filter((thread) => groupOf(thread) === "working")
    .sort((a, b) => byDesc(updated(a), updated(b)) || a.id.localeCompare(b.id))
    .map(topRow);

  const pinned = visible
    .filter((thread) => groupOf(thread) === "pinned")
    .sort(comparePinned)
    .map(topRow);

  // Folders: everything left, grouped by project, children under parents.
  const folderThreads = visible.filter((thread) => groupOf(thread) === "folder");
  // A child nests only under a parent in the same folder; a parent chain that
  // loops back on itself is broken up and its threads show as roots.
  const nestsUnder = (thread: T): T | null => {
    const parent = parentOf(thread);
    if (parent === null || groupOf(parent) !== "folder" || parent.projectId !== thread.projectId) {
      return null;
    }
    const seen = new Set([thread.id]);
    for (let cursor: T | null = parent; cursor !== null; cursor = parentOf(cursor)) {
      if (seen.has(cursor.id)) return null;
      seen.add(cursor.id);
    }
    return parent;
  };
  const childrenOf = new Map<string, T[]>();
  const rootsByProject = new Map<string, T[]>();
  for (const thread of folderThreads) {
    const parent = nestsUnder(thread);
    const key = parent?.id ?? thread.projectId;
    const bucket = parent !== null ? childrenOf : rootsByProject;
    const list = bucket.get(key) ?? [];
    list.push(thread);
    bucket.set(key, list);
  }
  const newestFirst = (a: T, b: T) =>
    byDesc(updated(a), updated(b)) || a.id.localeCompare(b.id);

  const lastActivityByProject = new Map<string, number>();
  const attentionByProject = new Map<string, number>();
  const workingByProject = new Map<string, number>();
  const bump = (counts: Map<string, number>, projectId: string) =>
    counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
  for (const thread of visible) {
    const previous = lastActivityByProject.get(thread.projectId) ?? 0;
    lastActivityByProject.set(thread.projectId, Math.max(previous, updated(thread)));
    const group = groupOf(thread);
    if (group === "attention") bump(attentionByProject, thread.projectId);
    if (group === "working") bump(workingByProject, thread.projectId);
  }

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const folders: ProjectFolder<T>[] = [];
  for (const [projectId, roots] of rootsByProject) {
    const rows: FolderRow<T>[] = [];
    const emit = (thread: T, depth: number) => {
      rows.push({
        thread,
        depth,
        parentTitle: depth === 0 ? (parentOf(thread)?.displayTitle ?? null) : null,
      });
      for (const child of (childrenOf.get(thread.id) ?? []).sort(newestFirst)) {
        emit(child, depth + 1);
      }
    };
    for (const root of roots.sort(newestFirst)) emit(root, 0);

    const project = projectById.get(projectId);
    folders.push({
      projectId,
      name: project?.name ?? "Без проекта",
      isPersonal: project?.isPersonal ?? false,
      rows,
      lastActivityAt:
        rows.length > 0
          ? Math.max(...rows.map((row) => updated(row.thread)))
          : (lastActivityByProject.get(projectId) ?? 0),
      attentionCount: attentionByProject.get(projectId) ?? 0,
      workingCount: workingByProject.get(projectId) ?? 0,
    });
  }

  folders.sort(
    (a, b) => byDesc(a.lastActivityAt, b.lastActivityAt) || a.projectId.localeCompare(b.projectId),
  );

  return { attention, working, pinned, folders, visibleCount: visible.length };
}

/** Every thread id in display order, for checking the "exactly once" rule. */
export function listedThreadIds(model: SidebarModel<SidebarThreadInput>): string[] {
  return [
    ...model.attention.map((row) => row.thread.id),
    ...model.working.map((row) => row.thread.id),
    ...model.pinned.map((row) => row.thread.id),
    ...model.folders.flatMap((folder) => folder.rows.map((row) => row.thread.id)),
  ];
}

/** Folders start collapsed, except the active project's. */
export function isFolderCollapsed(
  stored: boolean | null,
  projectId: string,
  activeProjectId: string | null,
): boolean {
  return stored ?? projectId !== activeProjectId;
}

export function collapsedStorageKey(projectId: string): string {
  return `attention-sidebar:collapsed:${projectId}`;
}

/** The folder that holds a thread, or null when it sits in a top block. */
export function folderOfThread<T extends SidebarThreadInput>(
  model: SidebarModel<T>,
  threadId: string | null,
): string | null {
  if (threadId === null) return null;
  const folder = model.folders.find((candidate) =>
    candidate.rows.some((row) => row.thread.id === threadId),
  );
  return folder?.projectId ?? null;
}
