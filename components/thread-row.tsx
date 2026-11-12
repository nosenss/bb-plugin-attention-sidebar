import { memo, useMemo } from "react";
import {
  experimental_Icon as Icon,
  experimental_resolveThreadStatus as resolveThreadStatus,
  experimental_ThreadActionsContextMenu as ThreadActionsContextMenu,
  experimental_ThreadActionsMenu as ThreadActionsMenu,
  experimental_ThreadStatusGlyph as ThreadStatusGlyph,
  experimental_useSidebarThreadSplit as useSidebarThreadSplit,
  useSidebarThreadDraft,
  useSidebarThreadRowStatus,
  useSidebarThreadShortcut,
  type PluginSidebarThread,
  type PluginThreadActionTarget,
} from "@get-bb/plugin-sdk/app";
import type { AttentionReason } from "../lib/model";
import { formatRelativeTime } from "../lib/time";
import { useNow } from "./hooks";
import { ProjectAvatar } from "./project-avatar";

const REASON_GLYPH: Record<
  AttentionReason,
  { symbol: string; label: string; className: string }
> = {
  question: {
    symbol: "?",
    label: "Ждёт ответа: вопрос или подтверждение",
    className: "text-[var(--warning-text)] bg-[color-mix(in_oklab,var(--warning)_22%,transparent)]",
  },
  error: {
    symbol: "!",
    label: "Ошибка",
    className: "text-destructive bg-[color-mix(in_oklab,var(--destructive)_18%,transparent)]",
  },
  done: {
    symbol: "✓",
    label: "Готово, не прочитано",
    className:
      "text-[var(--success-foreground)] bg-[color-mix(in_oklab,var(--success)_20%,transparent)]",
  },
};

function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

export interface ThreadRowProps {
  thread: PluginSidebarThread;
  isActive: boolean;
  /** Indentation level inside a project folder; 0 elsewhere. */
  depth: number;
  /** Set in «Ждут вас»: draws ✓ ? ! instead of bb's status glyph. */
  reason: AttentionReason | null;
  /** "↳ parent" caption for a child shown outside its parent. */
  parentTitle: string | null;
  /** Project avatar for top-block rows; null in project folders. */
  project: { id: string; name: string; isPersonal: boolean } | null;
  onNavigate: () => void;
}

/** The fields bb's thread menu reads, from a sidebar thread. */
function toActionTarget(thread: PluginSidebarThread): PluginThreadActionTarget {
  const environmentId = thread.environment?.id ?? null;
  return {
    id: thread.id,
    projectId: thread.projectId,
    parentThreadId: thread.parentThreadId,
    parentNotifications: thread.parentNotifications,
    archivedAt: thread.archivedAt,
    pinnedAt: thread.pinnedAt,
    sectionId: thread.sectionId,
    isUnread: thread.isUnread,
    status: thread.status,
    environment:
      environmentId === null
        ? null
        : { id: environmentId, path: thread.environment?.path ?? null },
  };
}

function ReasonGlyph({ reason }: { reason: AttentionReason }) {
  const glyph = REASON_GLYPH[reason];
  return (
    <span
      role="img"
      aria-label={glyph.label}
      title={glyph.label}
      data-attention-reason={reason}
      className={cx(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none",
        glyph.className,
      )}
    >
      {glyph.symbol}
    </span>
  );
}

/**
 * bb's own status for the row, plus a status another plugin set on it. In
 * «Ждут вас» the reason glyph replaces bb's indicator (it is the same
 * information), but another plugin's row status stays beside it.
 */
function StatusGlyphs({
  thread,
  reason,
}: {
  thread: PluginSidebarThread;
  reason: AttentionReason | null;
}) {
  const { hasUnsubmittedDraft } = useSidebarThreadDraft(thread.id);
  const rowStatus = useSidebarThreadRowStatus(thread.id);
  const status = resolveThreadStatus({
    thread,
    hiddenThreads: [],
    hasUnsubmittedDraft,
    rowStatus,
  });

  if (reason !== null) {
    return (
      <>
        {rowStatus !== null ? (
          <span
            className="flex size-4 shrink-0 items-center justify-center"
            data-row-status=""
            title={rowStatus.label}
          >
            <ThreadStatusGlyph indicator="none" rowStatus={rowStatus} size="compact" />
          </span>
        ) : null}
        <ReasonGlyph reason={reason} />
      </>
    );
  }
  if (status.indicator === "none" && status.rowStatus === null) return null;
  return (
    <span className="flex size-4 shrink-0 items-center justify-center" title={status.label ?? undefined}>
      <ThreadStatusGlyph indicator={status.indicator} rowStatus={status.rowStatus} size="compact" />
    </span>
  );
}

export const ThreadRow = memo(function ThreadRow({
  thread,
  isActive,
  depth,
  reason,
  parentTitle,
  project,
  onNavigate,
}: ThreadRowProps) {
  const now = useNow();
  const shortcut = useSidebarThreadShortcut(thread.id);
  const { splitProps } = useSidebarThreadSplit(thread.id);
  const title = thread.displayTitle || thread.titleFallback || "Без названия";
  const time = formatRelativeTime(thread.updatedAt, now);
  const actionTarget = useMemo(() => toActionTarget(thread), [thread]);

  return (
    <ThreadActionsContextMenu thread={actionTarget}>
      <div
        data-thread-row={thread.id}
        data-active={isActive ? "true" : undefined}
        className={cx(
          "group/row relative flex w-full items-center rounded-md text-sm text-sidebar-foreground transition-colors",
          "h-[var(--bb-sidebar-row-height)] max-md:pointer-coarse:h-[var(--bb-sidebar-row-height-coarse)]",
          "has-[[data-state=open]]:bg-sidebar-accent",
          isActive
            ? "bg-state-active"
            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <a
          {...splitProps}
          href={thread.href}
          data-sidebar-thread-shortcut-target=""
          data-sidebar-thread-id={thread.id}
          aria-current={isActive ? "page" : undefined}
          aria-keyshortcuts={shortcut?.ariaKeyshortcuts}
          onClick={() => onNavigate()}
          className="flex min-w-0 flex-1 items-center gap-2 self-stretch rounded-md pr-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {project !== null ? (
            <ProjectAvatar projectId={project.id} name={project.name} isPersonal={project.isPersonal} />
          ) : null}
          <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
            <span className="min-w-0 shrink truncate">{title}</span>
            {parentTitle !== null ? (
              <span
                className="min-w-0 max-w-[45%] shrink-[2] truncate text-xs text-muted-foreground"
                title={`Дочерний тред: ${parentTitle}`}
              >
                ↳ {parentTitle}
              </span>
            ) : null}
          </span>
          {/* Shifts left on hover/focus/open to make room for the «⋯» button. */}
          <span className="flex shrink-0 items-center gap-2 group-hover/row:mr-6 group-focus-within/row:mr-6 group-has-[[data-state=open]]/row:mr-6">
            {shortcut !== null ? (
              <kbd className="pointer-events-none shrink-0 rounded-sm bg-state-hover px-1.5 py-0.5 font-sans text-xs leading-none text-subtle-foreground">
                {shortcut.label}
              </kbd>
            ) : (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{time}</span>
            )}
            <StatusGlyphs thread={thread} reason={reason} />
          </span>
        </a>
        <ThreadActionsMenu
          thread={actionTarget}
          align="start"
          side="right"
          trigger={(props) => (
            <button
              {...props}
              type="button"
              aria-label={`Действия с тредом «${title}»`}
              className={cx(
                props.className,
                "absolute top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground",
                "opacity-0 hover:text-sidebar-foreground focus-visible:opacity-100 group-hover/row:opacity-100 data-[state=open]:opacity-100",
                "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                "right-2",
              )}
            >
              <Icon name="MoreHorizontal" className="size-3.5" aria-hidden />
            </button>
          )}
        />
      </div>
    </ThreadActionsContextMenu>
  );
});
