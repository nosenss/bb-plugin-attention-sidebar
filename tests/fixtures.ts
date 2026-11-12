import type { PluginSidebarProject, PluginSidebarThread } from "@get-bb/plugin-sdk/app";

export const T0 = Date.UTC(2026, 10, 12, 12, 0, 0);

let counter = 0;

/** A complete idle, read, unpinned sidebar thread with overrides. */
export function makeThread(overrides: Partial<PluginSidebarThread> = {}): PluginSidebarThread {
  counter += 1;
  const id = overrides.id ?? `thr_${counter}`;
  const projectId = overrides.projectId ?? "proj_a";
  return {
    id,
    projectId,
    title: id,
    titleFallback: null,
    displayTitle: overrides.title ?? id,
    parentThreadId: null,
    lifecycleOwnerThreadId: null,
    parentNotifications: "auto",
    sourceThreadId: null,
    sectionId: null,
    originKind: null,
    originPluginId: null,
    providerId: "claude-code",
    status: "idle",
    runtimeStatus: "idle",
    queuedWork: "none",
    hasPendingInteraction: false,
    activity: { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 0 },
    indicator: "none",
    indicatorLabel: null,
    isUnread: false,
    isPinned: false,
    pinnedAt: null,
    pinSortKey: null,
    isArchived: false,
    archivedAt: null,
    href: `/projects/${projectId}/threads/${id}`,
    isHidden: false,
    environment: null,
    host: null,
    createdAt: T0 - 10_000_000,
    updatedAt: T0 - 1_000_000,
    lastReadAt: null,
    latestAttentionAt: T0 - 1_000_000,
    ...overrides,
  };
}

export function makeProject(overrides: Partial<PluginSidebarProject> & { id: string }): PluginSidebarProject {
  return {
    name: overrides.id,
    isPersonal: false,
    href: `/projects/${overrides.id}`,
    settingsHref: `/projects/${overrides.id}/settings`,
    ...overrides,
  };
}
