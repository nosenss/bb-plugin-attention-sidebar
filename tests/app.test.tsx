// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, within } from "@testing-library/react";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import type { PluginThreadListProps } from "@get-bb/plugin-sdk/app";
import { makeProject, makeThread, T0 } from "./fixtures";

const projects = [
  makeProject({ id: "proj_a", name: "veber-writing" }),
  makeProject({ id: "proj_b", name: "book-smm" }),
];

const threads = [
  makeThread({ id: "q", projectId: "proj_b", title: "Вопрос", hasPendingInteraction: true, updatedAt: T0 }),
  makeThread({ id: "done", projectId: "proj_a", title: "Готово", isUnread: true, updatedAt: T0 }),
  makeThread({ id: "busy", projectId: "proj_a", title: "Работает", status: "active", updatedAt: T0 }),
  makeThread({ id: "pin", projectId: "proj_b", title: "Закреп", isPinned: true, pinnedAt: T0 }),
  makeThread({ id: "a-root", projectId: "proj_a", title: "Корень", updatedAt: T0 - 50_000 }),
  makeThread({ id: "a-child", projectId: "proj_a", title: "Ребёнок", parentThreadId: "a-root", updatedAt: T0 - 60_000 }),
  makeThread({ id: "b-old", projectId: "proj_b", title: "Старый", updatedAt: T0 - 90_000 }),
  makeThread({ id: "secret", projectId: "proj_b", title: "Скрытый", isHidden: true }),
];

function props(overrides: Partial<PluginThreadListProps> = {}): PluginThreadListProps {
  return {
    activeThreadId: null,
    activeProjectId: "proj_a",
    isCompactViewport: false,
    onNavigate: vi.fn(),
    searchQuery: "",
    ...overrides,
  };
}

async function threadList() {
  const app = await loadPluginApp(() => import("../app"));
  expect(app.threadLists).toHaveLength(1);
  return app.threadLists[0]!;
}

afterEach(() => {
  window.localStorage.clear();
});

describe("thread list slot", () => {
  it("renders the blocks above project folders without provider icons", async () => {
    const slot = renderSlot(await threadList(), props(), {
      sidebarThreads: { status: "ready", threads, projects },
    });

    const blocks = Array.from(slot.container.querySelectorAll("[data-block]")).map((node) =>
      node.getAttribute("data-block"),
    );
    expect(blocks).toEqual(["attention", "working", "pinned", "folders"]);

    const attention = slot.container.querySelector('[data-block="attention"]') as HTMLElement;
    const anchors = within(attention).getAllByRole("link");
    expect(anchors.map((a) => a.getAttribute("data-sidebar-thread-id"))).toEqual(["q", "done"]);
    expect(anchors[0]!.getAttribute("href")).toBe("/projects/proj_b/threads/q");
    expect(anchors[0]!.hasAttribute("data-sidebar-thread-shortcut-target")).toBe(true);
    expect(
      Array.from(attention.querySelectorAll("[data-attention-reason]")).map((node) => [
        node.getAttribute("data-attention-reason"),
        node.textContent,
        node.getAttribute("aria-label"),
      ]),
    ).toEqual([
      ["question", "?", expect.stringContaining("Ждёт ответа")],
      ["done", "✓", expect.stringContaining("Готово")],
    ]);
    // Top-block rows carry the project avatar.
    expect(attention.querySelector('[data-project-avatar="proj_b"]')?.textContent).toBe("BS");

    // Folders: the active project's is open, the other one is collapsed.
    const folderA = slot.container.querySelector('[data-folder="proj_a"]') as HTMLElement;
    const folderB = slot.container.querySelector('[data-folder="proj_b"]') as HTMLElement;
    expect(within(folderA).getByRole("button", { expanded: true })).toBeTruthy();
    expect(within(folderB).getByRole("button", { expanded: false })).toBeTruthy();
    expect(within(folderA).getAllByRole("link").map((a) => a.textContent)).toEqual([
      expect.stringContaining("Корень"),
      expect.stringContaining("Ребёнок"),
    ]);
    // Folder rows have no avatar; only the header has one.
    expect(folderA.querySelectorAll("[data-project-avatar]")).toHaveLength(1);

    // Hidden threads never render; each thread anchors once.
    const ids = Array.from(slot.container.querySelectorAll("[data-sidebar-thread-id]")).map((node) =>
      node.getAttribute("data-sidebar-thread-id"),
    );
    expect(ids).not.toContain("secret");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("expands a folder and remembers it in localStorage", async () => {
    const slot = renderSlot(await threadList(), props(), {
      sidebarThreads: { status: "ready", threads, projects },
    });
    const folderB = slot.container.querySelector('[data-folder="proj_b"]') as HTMLElement;
    fireEvent.click(within(folderB).getByRole("button", { expanded: false }));
    expect(within(folderB).getAllByRole("link").map((a) => a.getAttribute("data-sidebar-thread-id"))).toEqual([
      "b-old",
    ]);
    expect(window.localStorage.getItem("bb-sidebar:collapsed:proj_b")).toBe("0");
  });

  it("calls onNavigate after a row click", async () => {
    const onNavigate = vi.fn();
    const slot = renderSlot(await threadList(), props({ onNavigate }), {
      sidebarThreads: { status: "ready", threads, projects },
    });
    const anchor = slot.container.querySelector('[data-sidebar-thread-id="busy"]') as HTMLElement;
    // jsdom cannot navigate; the host routes the plain click in bb.
    const block = (event: Event) => event.preventDefault();
    window.addEventListener("click", block);
    fireEvent.click(anchor);
    window.removeEventListener("click", block);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("shows a skeleton while loading and a message when empty", async () => {
    const list = await threadList();
    const loading = renderSlot(list, props(), { sidebarThreads: { status: "loading", threads: [], projects: [] } });
    expect(loading.getByLabelText("Загрузка тредов")).toBeTruthy();
    loading.lifecycle.unmount();

    const empty = renderSlot(list, props(), { sidebarThreads: { status: "ready", threads: [], projects } });
    expect(empty.getByText("Тредов пока нет")).toBeTruthy();
  });

  it("marks a collapsed folder when its project has threads in the top blocks", async () => {
    const slot = renderSlot(await threadList(), props({ activeProjectId: "proj_a" }), {
      sidebarThreads: { status: "ready", threads, projects },
    });
    const folderB = slot.container.querySelector('[data-folder="proj_b"]') as HTMLElement;
    // proj_b has a question in «Ждут вас»; its folder is collapsed.
    expect(
      folderB.querySelector('[data-folder-indicator="attention"]')?.getAttribute("aria-label"),
    ).toContain("Ждут вас");

    // Expanded folders show no indicator; neither do projects without activity.
    const folderA = slot.container.querySelector('[data-folder="proj_a"]') as HTMLElement;
    expect(folderA.querySelector("[data-folder-indicator]")).toBeNull();
  });

  it("marks a collapsed folder with working threads, attention taking priority", async () => {
    const onlyBusy = [
      makeThread({ id: "busy", projectId: "proj_b", status: "active" }),
      makeThread({ id: "rest", projectId: "proj_b", title: "Покой" }),
    ];
    const slot = renderSlot(await threadList(), props({ activeProjectId: "proj_a" }), {
      sidebarThreads: { status: "ready", threads: onlyBusy, projects },
    });
    const folderB = slot.container.querySelector('[data-folder="proj_b"]') as HTMLElement;
    expect(folderB.querySelector('[data-folder-indicator="working"]')).toBeTruthy();
    expect(folderB.querySelector('[data-folder-indicator="attention"]')).toBeNull();
  });

  it("keeps another plugin's row status next to the reason glyph", async () => {
    const slot = renderSlot(await threadList(), props(), {
      sidebarThreads: { status: "ready", threads, projects },
      sidebarRowStatuses: { done: { icon: "Sparkles", label: "Проверяется ревью", tone: "running" } },
    });
    const row = slot.container.querySelector('[data-thread-row="done"]') as HTMLElement;
    expect(row.querySelector('[data-attention-reason="done"]')).toBeTruthy();
    expect(row.querySelector("[data-row-status]")?.getAttribute("title")).toBe("Проверяется ревью");
    const plain = slot.container.querySelector('[data-thread-row="q"]') as HTMLElement;
    expect(plain.querySelector("[data-row-status]")).toBeNull();
  });

  it("opens the active thread's folder temporarily, without writing localStorage", async () => {
    const slot = renderSlot(await threadList(), props({ activeThreadId: "b-old", activeProjectId: "proj_a" }), {
      sidebarThreads: { status: "ready", threads, projects },
    });
    const folderB = slot.container.querySelector('[data-folder="proj_b"]') as HTMLElement;
    expect(within(folderB).getByRole("button", { expanded: true })).toBeTruthy();
    expect(window.localStorage.getItem("bb-sidebar:collapsed:proj_b")).toBeNull();
  });

  it("keeps the time and the parent caption in the link's accessible content", async () => {
    const child = makeThread({
      id: "kid",
      projectId: "proj_a",
      title: "Дочерний",
      parentThreadId: "dad",
      isUnread: true,
    });
    const dad = makeThread({ id: "dad", projectId: "proj_b", title: "Родитель" });
    const slot = renderSlot(await threadList(), props(), {
      sidebarThreads: { status: "ready", threads: [child, dad], projects },
    });
    const anchor = slot.container.querySelector('[data-sidebar-thread-id="kid"]') as HTMLElement;
    expect(anchor.hasAttribute("aria-label")).toBe(false);
    expect(anchor.textContent).toContain("Дочерний");
    expect(anchor.textContent).toContain("↳ Родитель");
    expect(anchor.textContent).toMatch(/\d/);
  });

  it("keeps the shortcut badge and the «⋯» button apart", async () => {
    const slot = renderSlot(await threadList(), props(), {
      sidebarThreads: { status: "ready", threads, projects },
      sidebarShortcuts: { q: { label: "⌘1", ariaKeyshortcuts: "Meta+1" } },
    });
    const row = slot.container.querySelector('[data-thread-row="q"]') as HTMLElement;
    const trailing = row.querySelector("kbd")!.parentElement!;
    // The trailing group shifts away from the button on hover/focus/open.
    expect(trailing.className).toContain("group-hover/row:mr-6");
    expect(trailing.className).toContain("group-focus-within/row:mr-6");
    expect(trailing.className).toContain("group-has-[[data-state=open]]/row:mr-6");
    expect(trailing.className).not.toContain("invisible");
    expect(row.querySelector("kbd")!.textContent).toBe("⌘1");
  });
});
