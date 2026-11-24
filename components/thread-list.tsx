import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  experimental_Icon as Icon,
  experimental_useSidebarThreads as useSidebarThreads,
  type PluginSidebarThread,
  type PluginThreadListProps,
} from "@get-bb/plugin-sdk/app";
import { t } from "../lib/i18n";
import {
  buildSidebarModel,
  collapsedStorageKey,
  folderOfThread,
  isFolderCollapsed,
  isProjectSort,
  visibleFolderRows,
  PROJECT_SORTS,
  projectSortLabel,
  type ProjectFolder,
  type TopRow,
} from "../lib/model";
import { useFrozenActiveThread, useProjectSorting, useStoredFlags } from "./hooks";
import { ProjectAvatar } from "./project-avatar";
import { useThreadNesting } from "./thread-nesting";
import { ThreadRow } from "./thread-row";

type BlockId = "attention" | "working" | "pinned";

type TopRowProject = { id: string; name: string; isPersonal: boolean };

const threadStorageKey = (threadId: string) => `attention-sidebar:collapsed:thread:${threadId}`;

const blockStorageKey = (block: BlockId) => `attention-sidebar:collapsed:block:${block}`;

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <Icon
      name="ChevronRight"
      aria-hidden
      className={`size-3 shrink-0 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
    />
  );
}

const headerButtonClass =
  "flex h-7 w-full min-w-0 select-none items-center gap-1.5 rounded-md px-2 text-xs font-medium text-sidebar-foreground/75 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring max-md:pointer-coarse:h-9";

function Block({
  id,
  count,
  collapsed,
  onToggle,
  children,
}: {
  id: BlockId;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const listId = `attention-sidebar-block-${id}`;
  return (
    <section aria-label={t().blocks[id]} data-block={id} className="flex flex-col">
      <button
        type="button"
        className={headerButtonClass}
        aria-expanded={!collapsed}
        aria-controls={listId}
        onClick={onToggle}
      >
        <Chevron expanded={!collapsed} />
        <span className="truncate">{t().blocks[id]}</span>
        <span className="ml-auto tabular-nums text-muted-foreground">{count}</span>
      </button>
      {collapsed ? null : (
        <div id={listId} role="list" className="flex flex-col gap-px">
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * Dot in a collapsed folder's header: the project has threads in "Waiting for you"
 * (accent) or "In progress" (muted) — counted over the whole project, not only the
 * threads left in the folder.
 */
function FolderIndicator({ folder }: { folder: ProjectFolder<PluginSidebarThread> }) {
  const kind =
    folder.attentionCount > 0 ? "attention" : folder.workingCount > 0 ? "working" : null;
  if (kind === null) return null;
  const label = t().folderIndicator(
    kind,
    kind === "attention" ? folder.attentionCount : folder.workingCount,
  );
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-folder-indicator={kind}
      className="flex size-4 shrink-0 items-center justify-center"
    >
      <span
        className={
          kind === "attention"
            ? "size-2 rounded-full bg-[var(--warning)]"
            : "size-2 animate-pulse rounded-full bg-muted-foreground"
        }
      />
    </span>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label={t().loadingThreads} className="flex flex-col gap-px px-2 pt-1">
      {[72, 55, 64, 48].map((width) => (
        <div key={width} className="flex h-[var(--bb-sidebar-row-height)] items-center gap-2">
          <span className="size-[18px] shrink-0 animate-pulse rounded-full bg-sidebar-accent" />
          <span
            className="h-3 animate-pulse rounded bg-sidebar-accent"
            style={{ width: `${width}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function Message({ children }: { children: ReactNode }) {
  return <p className="px-3 py-2 text-xs text-muted-foreground">{children}</p>;
}

export function AttentionThreadList({
  activeThreadId,
  activeProjectId,
  onNavigate,
}: PluginThreadListProps) {
  const { status, threads, projects } = useSidebarThreads();
  const frozen = useFrozenActiveThread(activeThreadId, threads);
  const flags = useStoredFlags();
  const { get, set } = flags;
  const isBranchCollapsed = (threadId: string) => get(threadStorageKey(threadId)) ?? false;
  const toggleBranch = useCallback((threadId: string, collapsed: boolean) => {
    set(threadStorageKey(threadId), collapsed);
  }, [set]);
  const { sortForProject, setProjectSort, openedAt } = useProjectSorting(activeThreadId);
  const nesting = useThreadNesting(threads);

  // Rows are memoized; keep the callback identity stable across host renders.
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const handleNavigate = useCallback(() => onNavigateRef.current(), []);

  const model = useMemo(
    () => buildSidebarModel<PluginSidebarThread>({ threads, projects, frozen, sortForProject, openedAt }),
    [threads, projects, frozen, sortForProject, openedAt],
  );
  // Stable per-project objects, so memoized rows are not re-rendered by a new
  // `project` prop on every list render.
  const projectLookup = useMemo(() => {
    const byId = new Map<string, TopRowProject>();
    for (const project of projects) {
      byId.set(project.id, { id: project.id, name: project.name, isPersonal: project.isPersonal });
    }
    return (projectId: string): TopRowProject => {
      let entry = byId.get(projectId);
      if (entry === undefined) {
        entry = { id: projectId, name: "", isPersonal: false };
        byId.set(projectId, entry);
      }
      return entry;
    };
  }, [projects]);

  // Open the folder that holds the active thread when it becomes active. The
  // opening is temporary: it is not written to localStorage.
  const activeFolder = folderOfThread(model, activeThreadId);
  const revealed = useRef<string | null>(null);
  useEffect(() => {
    if (activeThreadId === null || activeFolder === null) return;
    if (revealed.current === activeThreadId) return;
    revealed.current = activeThreadId;
    const key = collapsedStorageKey(activeFolder);
    if (isFolderCollapsed(flags.get(key), activeFolder, activeProjectId)) {
      flags.setTemporary(key, false);
    }
  }, [activeThreadId, activeFolder, activeProjectId, flags]);

  if (status === "loading" && threads.length === 0) return <Skeleton />;
  if (status === "error" && threads.length === 0) {
    return <Message>{t().loadError}</Message>;
  }
  if (model.visibleCount === 0) return <Message>{t().noThreads}</Message>;

  const renderTopRows = (rows: TopRow<PluginSidebarThread>[]) =>
    rows.map((row) => {
      return (
        <div role="listitem" key={row.thread.id}>
          <ThreadRow
            thread={row.thread}
            isActive={row.thread.id === activeThreadId}
            depth={0}
            reason={row.reason}
            parentTitle={row.parentTitle}
            project={projectLookup(row.thread.projectId)}
            onNavigate={handleNavigate}
            startNesting={nesting.start}
            isDropTarget={nesting.target?.kind === "thread" && nesting.target.id === row.thread.id}
          />
        </div>
      );
    });

  const blocks: { id: BlockId; rows: TopRow<PluginSidebarThread>[] }[] = [
    { id: "attention", rows: model.attention },
    { id: "working", rows: model.working },
    { id: "pinned", rows: model.pinned },
  ];

  return (
    <nav aria-label={t().threadsLabel} data-attention-thread-list="" className="flex flex-col gap-2 px-2 pb-2">
      {nesting.error === null ? null : <p role="alert" className="px-2 text-xs text-destructive">{nesting.error}</p>}
      {blocks.map(({ id, rows }) =>
        rows.length === 0 ? null : (
          <Block
            key={id}
            id={id}
            count={rows.length}
            collapsed={flags.get(blockStorageKey(id)) ?? false}
            onToggle={() =>
              flags.set(blockStorageKey(id), !(flags.get(blockStorageKey(id)) ?? false))
            }
          >
            {renderTopRows(rows)}
          </Block>
        ),
      )}
      {model.folders.length > 0 ? (
        <section aria-label={t().projectsLabel} data-block="folders" className="flex flex-col gap-px">
          {model.folders.map((folder) => {
            const key = collapsedStorageKey(folder.projectId);
            const collapsed = isFolderCollapsed(flags.get(key), folder.projectId, activeProjectId);
            const listId = `attention-sidebar-folder-${folder.projectId}`;
            const isDropTarget = nesting.target?.kind === "project" && nesting.target.id === folder.projectId;
            return (
              <div key={folder.projectId} data-folder={folder.projectId} className="flex flex-col">
                <div className="flex items-center">
                  <button
                    type="button"
                    className={isDropTarget ? `${headerButtonClass} ring-2 ring-inset ring-sidebar-ring` : headerButtonClass}
                    data-project-drop-target={folder.projectId}
                    data-nest-target={isDropTarget ? "" : undefined}
                    aria-expanded={!collapsed}
                    aria-controls={listId}
                    onClick={() => flags.set(key, !collapsed)}
                  >
                    <Chevron expanded={!collapsed} />
                    <ProjectAvatar
                      projectId={folder.projectId}
                      name={folder.name}
                      isPersonal={folder.isPersonal}
                    />
                    <span className="truncate text-sidebar-foreground">{folder.name}</span>
                    <span className="tabular-nums text-muted-foreground">{folder.rows.length}</span>
                    <span className="ml-auto flex shrink-0 items-center">
                      {collapsed ? <FolderIndicator folder={folder} /> : null}
                    </span>
                  </button>
                  {collapsed ? null : (
                    <label className="relative flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent focus-within:ring-2 focus-within:ring-sidebar-ring">
                      <span aria-hidden className="text-sm">↕</span>
                      <select
                        aria-label={t().sortThreadsLabel(folder.name)}
                        title={projectSortLabel(sortForProject(folder.projectId))}
                        value={sortForProject(folder.projectId)}
                        onChange={(event) => {
                          const sort = event.currentTarget.value;
                          if (isProjectSort(sort)) setProjectSort(folder.projectId, sort);
                        }}
                        className="absolute inset-0 w-full cursor-pointer opacity-0"
                      >
                        {PROJECT_SORTS.map((sort) => (
                          <option key={sort} value={sort}>{projectSortLabel(sort)}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                {collapsed ? null : (
                  <div id={listId} role="list" className="flex flex-col gap-px">
                    {visibleFolderRows(folder.rows, isBranchCollapsed).map((row) => (
                      <div role="listitem" key={row.thread.id}>
                        <ThreadRow
                          thread={row.thread}
                          isActive={row.thread.id === activeThreadId}
                          depth={row.depth + 1}
                          reason={null}
                          parentTitle={row.parentTitle}
                          project={null}
                          onNavigate={handleNavigate}
                          startNesting={nesting.start}
                          isDropTarget={nesting.target?.kind === "thread" && nesting.target.id === row.thread.id}
                          branchCollapsed={row.hasChildren ? isBranchCollapsed(row.thread.id) : undefined}
                          onToggleBranch={toggleBranch}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ) : null}
    </nav>
  );
}
