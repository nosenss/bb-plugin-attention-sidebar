import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import {
  buildSidebarModel,
  classifyThread,
  collapsedStorageKey,
  folderOfThread,
  freezeThread,
  isFolderCollapsed,
  listedThreadIds,
  type SidebarModel,
} from "../lib/model";
import { makeProject, makeThread, T0 } from "./fixtures";

const projects = [
  makeProject({ id: "proj_a", name: "veber-writing" }),
  makeProject({ id: "proj_b", name: "book-smm" }),
  makeProject({ id: "proj_c", name: "Редзапал" }),
];

const ids = (rows: { thread: PluginSidebarThread }[]) => rows.map((row) => row.thread.id);

function build(threads: PluginSidebarThread[], frozen = null as ReturnType<typeof freezeThread> | null) {
  return buildSidebarModel({ threads, projects, frozen });
}

function expectEachVisibleOnce(model: SidebarModel<PluginSidebarThread>, threads: PluginSidebarThread[]) {
  const listed = listedThreadIds(model);
  expect(new Set(listed).size).toBe(listed.length);
  const visible = threads.filter((t) => !t.isHidden && !t.isArchived).map((t) => t.id);
  expect([...listed].sort()).toEqual([...visible].sort());
}

describe("classifyThread", () => {
  it("puts pending interactions and waiting-for-input first, as questions", () => {
    expect(classifyThread(makeThread({ hasPendingInteraction: true }))).toEqual({
      group: "attention",
      reason: "question",
    });
    expect(classifyThread(makeThread({ indicator: "waiting-for-input" })).reason).toBe("question");
    // A question outranks an error and unread.
    expect(
      classifyThread(
        makeThread({ hasPendingInteraction: true, indicator: "unread-error", isUnread: true }),
      ).reason,
    ).toBe("question");
  });

  it("treats unread-error, queued-failed and failed queued work as errors", () => {
    expect(classifyThread(makeThread({ indicator: "unread-error" })).reason).toBe("error");
    expect(classifyThread(makeThread({ indicator: "queued-failed" })).reason).toBe("error");
    expect(classifyThread(makeThread({ queuedWork: "failed" })).reason).toBe("error");
    expect(classifyThread(makeThread({ queuedWork: "failed", isUnread: true })).reason).toBe(
      "error",
    );
  });

  it("treats unread-success and isUnread as done", () => {
    expect(classifyThread(makeThread({ indicator: "unread-success" })).reason).toBe("done");
    expect(classifyThread(makeThread({ isUnread: true })).reason).toBe("done");
  });

  it("puts busy threads in working", () => {
    for (const status of ["starting", "active", "stopping"] as const) {
      expect(classifyThread(makeThread({ status })).group).toBe("working");
    }
    for (const runtimeStatus of ["provisioning", "waiting-for-host"] as const) {
      expect(classifyThread(makeThread({ runtimeStatus })).group).toBe("working");
    }
    for (const indicator of [
      "runtime",
      "workflow",
      "background-agent",
      "background-command",
      "plan-mode",
      "queued-waiting",
    ] as const) {
      expect(classifyThread(makeThread({ indicator })).group).toBe("working");
    }
  });

  it("ranks attention above work", () => {
    expect(classifyThread(makeThread({ status: "active", isUnread: true })).group).toBe(
      "attention",
    );
  });

  it("treats unknown indicator, status and runtimeStatus as none / not busy", () => {
    const unknown = makeThread({
      indicator: "future-kind" as never,
      status: "hibernating" as never,
      runtimeStatus: "teleporting" as never,
    });
    expect(classifyThread(unknown)).toEqual({ group: "folder", reason: null });
  });

  it("does not count idle error status, drafts or pending status as work", () => {
    expect(classifyThread(makeThread({ status: "error" })).group).toBe("folder");
    expect(classifyThread(makeThread({ status: "pending" })).group).toBe("folder");
    expect(classifyThread(makeThread({ indicator: "draft" })).group).toBe("folder");
  });

  it("sends pinned threads to pinned only when nothing outranks them", () => {
    expect(classifyThread(makeThread({ isPinned: true })).group).toBe("pinned");
    expect(classifyThread(makeThread({ isPinned: true, isUnread: true })).group).toBe("attention");
    expect(classifyThread(makeThread({ isPinned: true, status: "active" })).group).toBe("working");
  });
});

describe("buildSidebarModel", () => {
  it("orders «Ждут вас» by reason, then newest attention first, across projects", () => {
    const threads = [
      makeThread({ id: "done-old", projectId: "proj_a", isUnread: true, latestAttentionAt: T0 - 500 }),
      makeThread({ id: "err", projectId: "proj_b", indicator: "unread-error", latestAttentionAt: T0 - 900 }),
      makeThread({ id: "q-old", projectId: "proj_c", hasPendingInteraction: true, latestAttentionAt: T0 - 800 }),
      makeThread({ id: "done-new", projectId: "proj_b", indicator: "unread-success", latestAttentionAt: T0 - 100 }),
      makeThread({ id: "q-new", projectId: "proj_a", indicator: "waiting-for-input", latestAttentionAt: T0 - 200 }),
      makeThread({ id: "quiet", projectId: "proj_a" }),
    ];
    const model = build(threads);
    expect(ids(model.attention)).toEqual(["q-new", "q-old", "err", "done-new", "done-old"]);
    expect(model.attention.map((row) => row.reason)).toEqual([
      "question",
      "question",
      "error",
      "done",
      "done",
    ]);
    expect(ids(model.folders[0]!.rows)).toEqual(["quiet"]);
    expectEachVisibleOnce(model, threads);
  });

  it("orders «В работе» newest first and pinned by pinSortKey", () => {
    const threads = [
      makeThread({ id: "w1", status: "active", updatedAt: T0 - 300 }),
      makeThread({ id: "w2", runtimeStatus: "provisioning", updatedAt: T0 - 100 }),
      makeThread({ id: "p-b", isPinned: true, pinSortKey: "b", pinnedAt: T0 - 50 }),
      makeThread({ id: "p-a", isPinned: true, pinSortKey: "a", pinnedAt: T0 - 10 }),
      makeThread({ id: "p-none-old", isPinned: true, pinSortKey: null, pinnedAt: T0 - 900 }),
      makeThread({ id: "p-none-new", isPinned: true, pinSortKey: null, pinnedAt: T0 - 5 }),
    ];
    const model = build(threads);
    expect(ids(model.working)).toEqual(["w2", "w1"]);
    expect(ids(model.pinned)).toEqual(["p-a", "p-b", "p-none-new", "p-none-old"]);
    expect(model.folders).toEqual([]);
    expectEachVisibleOnce(model, threads);
  });

  it("drops hidden and archived threads", () => {
    const threads = [
      makeThread({ id: "hidden", isHidden: true, isUnread: true }),
      makeThread({ id: "archived", isArchived: true, archivedAt: T0 }),
      makeThread({ id: "shown" }),
    ];
    const model = build(threads);
    expect(listedThreadIds(model)).toEqual(["shown"]);
    expect(model.visibleCount).toBe(1);
  });

  it("groups the rest into folders ordered by last activity, skipping empty projects", () => {
    const threads = [
      makeThread({ id: "a1", projectId: "proj_a", updatedAt: T0 - 5000 }),
      makeThread({ id: "a2", projectId: "proj_a", updatedAt: T0 - 4000 }),
      makeThread({ id: "b1", projectId: "proj_b", updatedAt: T0 - 1000 }),
      // proj_c only has a thread at the top, so its folder is empty.
      makeThread({ id: "c1", projectId: "proj_c", isUnread: true, updatedAt: T0 }),
    ];
    const model = build(threads);
    expect(model.folders.map((folder) => folder.projectId)).toEqual(["proj_b", "proj_a"]);
    expect(model.folders[1]!.name).toBe("veber-writing");
    expect(ids(model.folders[1]!.rows)).toEqual(["a2", "a1"]);
    // The count is the threads in the folder only.
    expect(model.folders[1]!.rows).toHaveLength(2);
    expectEachVisibleOnce(model, threads);
  });

  it("orders folders by the threads left in them, not by threads moved to the top", () => {
    const threads = [
      makeThread({ id: "a-top", projectId: "proj_a", isUnread: true, updatedAt: T0 }),
      makeThread({ id: "a1", projectId: "proj_a", updatedAt: T0 - 9000 }),
      makeThread({ id: "b1", projectId: "proj_b", updatedAt: T0 - 1000 }),
    ];
    expect(build(threads).folders.map((folder) => folder.projectId)).toEqual(["proj_b", "proj_a"]);
  });

  it("ignores user sections", () => {
    const threads = [
      makeThread({ id: "s1", sectionId: "sec_later", updatedAt: T0 - 10 }),
      makeThread({ id: "s2", sectionId: null, updatedAt: T0 - 20 }),
    ];
    expect(ids(build(threads).folders[0]!.rows)).toEqual(["s1", "s2"]);
  });

  it("nests children under their parent in a folder, newest first at each level", () => {
    const threads = [
      makeThread({ id: "parent", updatedAt: T0 - 5000 }),
      makeThread({ id: "child-old", parentThreadId: "parent", updatedAt: T0 - 4000 }),
      makeThread({ id: "child-new", parentThreadId: "parent", updatedAt: T0 - 3000 }),
      makeThread({ id: "grandchild", parentThreadId: "child-old", updatedAt: T0 - 100 }),
      makeThread({ id: "other-root", updatedAt: T0 - 4500 }),
    ];
    const model = build(threads);
    const rows = model.folders[0]!.rows;
    expect(rows.map((row) => [row.thread.id, row.depth])).toEqual([
      ["other-root", 0],
      ["parent", 0],
      ["child-new", 1],
      ["child-old", 1],
      ["grandchild", 2],
    ]);
    expect(rows.every((row) => row.parentTitle === null)).toBe(true);
    expectEachVisibleOnce(model, threads);
  });

  it("lifts a child that needs attention to the top with a parent caption", () => {
    const threads = [
      makeThread({ id: "parent", title: "Родитель" }),
      makeThread({ id: "child", parentThreadId: "parent", hasPendingInteraction: true }),
    ];
    const model = build(threads);
    expect(model.attention).toEqual([
      expect.objectContaining({ thread: expect.objectContaining({ id: "child" }), parentTitle: "Родитель" }),
    ]);
    expect(ids(model.folders[0]!.rows)).toEqual(["parent"]);
    expectEachVisibleOnce(model, threads);
  });

  it("shows a child as a root when its parent is hidden, archived, or in another group", () => {
    const threads = [
      makeThread({ id: "hidden-parent", isHidden: true }),
      makeThread({ id: "c-hidden", parentThreadId: "hidden-parent", updatedAt: T0 - 10 }),
      makeThread({ id: "archived-parent", isArchived: true }),
      makeThread({ id: "c-archived", parentThreadId: "archived-parent", updatedAt: T0 - 20 }),
      makeThread({ id: "busy-parent", title: "Занятой", status: "active" }),
      makeThread({ id: "c-busy", parentThreadId: "busy-parent", updatedAt: T0 - 30 }),
      makeThread({ id: "c-missing", parentThreadId: "thr_gone", updatedAt: T0 - 40 }),
    ];
    const model = build(threads);
    const rows = model.folders[0]!.rows;
    expect(rows.map((row) => [row.thread.id, row.depth, row.parentTitle])).toEqual([
      ["c-hidden", 0, null],
      ["c-archived", 0, null],
      ["c-busy", 0, "Занятой"],
      ["c-missing", 0, null],
    ]);
    expectEachVisibleOnce(model, threads);
  });

  it("shows a child as a root when its parent is in another project", () => {
    const threads = [
      makeThread({ id: "parent", projectId: "proj_a" }),
      makeThread({ id: "child", projectId: "proj_b", parentThreadId: "parent" }),
    ];
    const model = build(threads);
    const b = model.folders.find((folder) => folder.projectId === "proj_b")!;
    expect(b.rows.map((row) => [row.thread.id, row.depth])).toEqual([["child", 0]]);
    expectEachVisibleOnce(model, threads);
  });

  it("survives parent cycles and lists every thread once", () => {
    const threads = [
      makeThread({ id: "x", parentThreadId: "y" }),
      makeThread({ id: "y", parentThreadId: "x" }),
      makeThread({ id: "self", parentThreadId: "self" }),
    ];
    const model = build(threads);
    expectEachVisibleOnce(model, threads);
  });

  it("names folders of unknown projects", () => {
    const model = build([makeThread({ projectId: "proj_unknown" })]);
    expect(model.folders[0]!.name).toBe("Без проекта");
  });

  it("lists every visible thread exactly once in a mixed list", () => {
    const threads: PluginSidebarThread[] = [];
    const projectIds = ["proj_a", "proj_b", "proj_c", "proj_x"];
    for (let index = 0; index < 120; index += 1) {
      const parent = index > 3 && index % 3 === 0 ? `thr_mix_${index - 3}` : null;
      threads.push(
        makeThread({
          id: `thr_mix_${index}`,
          projectId: projectIds[index % projectIds.length]!,
          parentThreadId: parent,
          isUnread: index % 7 === 0,
          hasPendingInteraction: index % 11 === 0,
          queuedWork: index % 13 === 0 ? "failed" : "none",
          status: index % 5 === 0 ? "active" : "idle",
          isPinned: index % 4 === 0,
          pinSortKey: index % 8 === 0 ? `k${index}` : null,
          pinnedAt: index % 4 === 0 ? T0 - index : null,
          isHidden: index % 17 === 0,
          isArchived: index % 19 === 0,
          updatedAt: T0 - index * 1000,
          latestAttentionAt: T0 - index * 500,
        }),
      );
    }
    const model = build(threads);
    expectEachVisibleOnce(model, threads);
  });
});

describe("frozen active thread", () => {
  it("keeps the active thread in its group after it is read, until it changes", () => {
    const unread = makeThread({ id: "t", isUnread: true, updatedAt: T0 - 10, latestAttentionAt: T0 - 10 });
    const frozen = freezeThread(unread);
    const read = { ...unread, isUnread: false };

    const other = makeThread({ id: "other" });
    const whileOpen = build([read, other], frozen);
    expect(ids(whileOpen.attention)).toEqual(["t"]);
    expect(whileOpen.attention[0]!.reason).toBe("done");
    expectEachVisibleOnce(whileOpen, [read, other]);

    const afterLeaving = build([read, makeThread({ id: "other" })], null);
    expect(afterLeaving.attention).toEqual([]);
    expect(folderOfThread(afterLeaving, "t")).toBe("proj_a");
  });

  it("keeps a folder thread in place when it starts working while open", () => {
    const idle = makeThread({ id: "t", updatedAt: T0 - 5000 });
    const frozen = freezeThread(idle);
    const busy = { ...idle, status: "active" as const, updatedAt: T0 };
    const model = build([busy, makeThread({ id: "newer", updatedAt: T0 - 100 })], frozen);
    expect(model.working).toEqual([]);
    expect(ids(model.folders[0]!.rows)).toEqual(["newer", "t"]);
  });

  it("ignores a frozen snapshot for a thread that is no longer visible", () => {
    const thread = makeThread({ id: "t", isUnread: true });
    const model = build([{ ...thread, isArchived: true }], freezeThread(thread));
    expect(listedThreadIds(model)).toEqual([]);
  });
});

describe("folder collapse", () => {
  it("defaults to collapsed except the active project", () => {
    expect(isFolderCollapsed(null, "proj_a", "proj_b")).toBe(true);
    expect(isFolderCollapsed(null, "proj_a", "proj_a")).toBe(false);
    expect(isFolderCollapsed(null, "proj_a", null)).toBe(true);
  });

  it("prefers the stored value", () => {
    expect(isFolderCollapsed(false, "proj_a", "proj_b")).toBe(false);
    expect(isFolderCollapsed(true, "proj_a", "proj_a")).toBe(true);
  });

  it("uses the bb-sidebar:collapsed:<projectId> key", () => {
    expect(collapsedStorageKey("proj_a")).toBe("bb-sidebar:collapsed:proj_a");
  });

  it("finds the folder of a thread, or null for top blocks", () => {
    const model = build([
      makeThread({ id: "top", isUnread: true }),
      makeThread({ id: "in-b", projectId: "proj_b" }),
    ]);
    expect(folderOfThread(model, "in-b")).toBe("proj_b");
    expect(folderOfThread(model, "top")).toBeNull();
    expect(folderOfThread(model, null)).toBeNull();
  });
});
