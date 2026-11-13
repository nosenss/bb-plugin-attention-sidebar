---
name: attention-sidebar
description: Explains the "Attention sidebar" thread list (plugin id attention-sidebar) — the «Ждут вас» / «В работе» / pinned blocks above collapsible project folders — and how to switch back to bb's standard sidebar list. Use when the user asks about this sidebar, why a thread sits where it does, or how to return the default thread list.
---

# Attention sidebar (`attention-sidebar`)

The plugin replaces bb's sidebar thread list (slot `experimental_threadList`,
provider key `attention-sidebar/attention`). It is frontend-only and has no
settings, commands, or storage beyond the browser's localStorage.

## Layout, top to bottom

1. **Ждут вас** — threads from every project that need the user, with a
   badge: `?` question or approval (`hasPendingInteraction`,
   `waiting-for-input`), `!` error (`unread-error`, `queued-failed`, a failed
   queued message), `✓` finished and unread. Questions first, then errors,
   then finished; newest attention first inside each kind.
2. **В работе** — threads whose agent is running (starting, active,
   stopping, provisioning, waiting for host, workflows, background agents or
   commands, plan mode, a queued message waiting).
3. **Закреплённые** — pinned threads in bb's pin order.
4. **Project folders** — everything else, grouped by project, ordered by
   the latest activity. Children sit indented under their parent. Folders
   start collapsed except the current project's; the state is kept per
   browser under `attention-sidebar:collapsed:<projectId>`.

Each thread appears once. A thread that needs attention or is working shows
in the top blocks even when it is pinned or a child (with a `↳ parent`
caption). The open thread stays in the group it was in when it was opened
until the user opens another thread; its ✓ / ? / ! glyph is live, so the «?»
disappears as soon as the question is answered. A collapsed folder shows a
small dot when its project has threads in «Ждут вас» (accent) or «В работе».
The folder of the open thread is expanded for the session only; it is not
saved. Rows in the top blocks show the project avatar
(letters and color from the project); provider icons are not shown.
Right-click a row, or use its `⋯` button, for bb's own thread menu (pin,
rename, archive, …).

## Return to the standard list

Any one of these:

- **Settings → Appearance → Sidebar thread list** ("Which plugin draws your
  threads in the sidebar") → choose bb's **Thread list**.
- Disable or uninstall the plugin: **Plugins** → *Attention sidebar* →
  disable, or `bb plugin disable attention-sidebar` / `bb plugin uninstall attention-sidebar`.
  bb then falls back to its bundled list.
- From the CLI, pin the bundled list without touching the plugin:
  `bb settings ui set sidebar.threadListProvider '"thread-list/thread-list"'`
  (`bb settings ui reset sidebar.threadListProvider` restores automatic
  selection).

Only change these settings when the user asks.
