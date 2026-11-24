# Attention sidebar

English · [Русский](README.ru.md)

A custom thread list for the bb sidebar (plugin `attention-sidebar`, slot
`app.slots.experimental_threadList`).

From top to bottom: **Waiting for you** (questions `?`, errors `!`, finished
threads `✓` from all projects), **In progress**, **Pinned**, then project
folders with an avatar, a name and a counter. There are no provider icons: rows
in the top blocks carry a project avatar (letters from the project name, a
colour from the FNV-1a hash of `projectId`).

## Language

The interface is available in English and Russian. The language is picked
automatically: if the client's language is Russian (`navigator.languages` /
`navigator.language` starts with `ru`) the plugin shows Russian, otherwise
English. It is detected once, when the plugin loads, so reload the app after
changing the language. There is no language setting. Block titles, tooltips,
accessibility labels, the loading and empty states and relative times
("now", "5m", "yesterday" / "сейчас", "5 мин", "вчера") follow the language.

## Nesting and sorting

- Drag a thread row with the mouse onto the row of the future parent. The link
  is saved in bb, but the parent's notifications about the child thread are
  turned off, so the parent's agent is not woken by it. If both threads are in
  the same folder, the child appears indented. In the top blocks, and when the
  two are in different folders, the parent's title is shown next to the child.
- To move a child thread back to the top level, drop it on the header of its
  project's folder.
- The arrow next to a parent thread in a folder collapses or expands its
  branch. bb remembers the state of each branch in the current client.
- Open a project folder and press ↕ to choose the thread order. By default the
  most recently updated threads come first. You can also sort by last opened,
  creation time or title. A parent always stays before its child threads.
- The sort of each folder and the history of opened threads are kept in the
  storage of the current browser or bb app. In the "By last opened" order,
  threads with no recorded opening go below, ordered by latest activity.

## Structure

- `app.tsx` — slot registration.
- `components/` — React: the list, the row, the avatar, hooks (timer, freezing
  the active thread, collapsed state in localStorage).
- `lib/` — pure logic: `model.ts` (classification and grouping), `avatar.ts`,
  `time.ts`, `i18n.ts` (English and Russian dictionaries, locale detection).
- `server.ts` — an empty backend: the bb manifest requires `bb.server`.
- `skills/attention-sidebar/SKILL.md` — what the plugin does and how to get the
  standard list back.

## Commands

```sh
npm install --include=dev
npm test               # vitest: lib + renderSlot smoke tests
npx tsc --noEmit
bb plugin build
bb plugin install . --yes
```

To get the standard list back: Settings → Appearance → Sidebar thread list →
Thread list, or `bb plugin disable attention-sidebar`.
