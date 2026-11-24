/**
 * UI strings in English (the default) and Russian. The locale is detected
 * once, when the module loads: a client whose language starts with `ru` gets
 * Russian, everyone else gets English. Tests switch it with `setLocale`.
 */

export type Locale = "en" | "ru";

export type AttentionBlock = "attention" | "working" | "pinned";
export type ProjectSortKey = "updated" | "opened" | "created" | "title";
export type ReasonKey = "question" | "error" | "done";

/** Every string the UI shows. Parameterized strings are functions. */
export interface Messages {
  /** Slot title and description shown in bb's settings. */
  slotTitle: string;
  slotDescription: string;
  /** Block titles, in the order they appear in the list. */
  blocks: Record<AttentionBlock, string>;
  /** aria-label of the whole list and of the project folders section. */
  threadsLabel: string;
  projectsLabel: string;
  loadingThreads: string;
  loadError: string;
  noThreads: string;
  /** Dot in a collapsed folder: the project has threads in a top block. */
  folderIndicator: (block: "attention" | "working", count: number) => string;
  /** aria-label of the sort picker of a folder. */
  sortThreadsLabel: (projectName: string) => string;
  sortLabels: Record<ProjectSortKey, string>;
  noProject: string;
  /** Avatar text of the personal project. */
  personalInitials: string;
  untitled: string;
  /** Labels of the ? ! ✓ glyphs. */
  reasonLabels: Record<ReasonKey, string>;
  childThreadOf: (parentTitle: string) => string;
  toggleBranchLabel: (title: string, collapsed: boolean) => string;
  threadActionsLabel: (title: string) => string;
  nestingError: string;
  /** Relative time for under a minute (and for future timestamps). */
  timeNow: string;
  /** Words `Intl.RelativeTimeFormat` adds around a past time ("ago"); stripped from the short form. */
  timeSuffix: RegExp;
}

const en: Messages = {
  slotTitle: "Waiting for you + project folders",
  slotDescription:
    "“Waiting for you” and “In progress” from all projects above collapsible project folders; project avatars instead of provider icons.",
  blocks: {
    attention: "Waiting for you",
    working: "In progress",
    pinned: "Pinned",
  },
  threadsLabel: "Threads",
  projectsLabel: "Projects",
  loadingThreads: "Loading threads",
  loadError: "Couldn't load threads.",
  noThreads: "No threads yet",
  folderIndicator: (block, count) =>
    `Threads in “${en.blocks[block]}”: ${count}`,
  sortThreadsLabel: (projectName) => `Sort threads in “${projectName}”`,
  sortLabels: {
    updated: "By latest activity",
    opened: "By last opened",
    created: "By creation time",
    title: "By title",
  },
  noProject: "No project",
  personalInitials: "Me",
  untitled: "Untitled",
  reasonLabels: {
    question: "Waiting for your answer: a question or an approval",
    error: "Error",
    done: "Finished, unread",
  },
  childThreadOf: (parentTitle) => `Child of: ${parentTitle}`,
  toggleBranchLabel: (title, collapsed) =>
    `${collapsed ? "Expand" : "Collapse"} child threads of “${title}”`,
  threadActionsLabel: (title) => `Thread actions for “${title}”`,
  nestingError: "Couldn't change the thread's nesting. Try again.",
  timeNow: "now",
  timeSuffix: /\bago\b/giu,
};

const ru: Messages = {
  slotTitle: "Ждут вас + папки проектов",
  slotDescription:
    "«Ждут вас» и «В работе» из всех проектов над сворачиваемыми папками проектов; аватары проектов вместо иконок провайдеров.",
  blocks: {
    attention: "Ждут вас",
    working: "В работе",
    pinned: "Закреплённые",
  },
  threadsLabel: "Треды",
  projectsLabel: "Проекты",
  loadingThreads: "Загрузка тредов",
  loadError: "Не удалось загрузить треды.",
  noThreads: "Тредов пока нет",
  folderIndicator: (block, count) =>
    `Есть треды в «${ru.blocks[block]}»: ${count}`,
  sortThreadsLabel: (projectName) =>
    `Сортировка тредов проекта «${projectName}»`,
  sortLabels: {
    updated: "По последней активности",
    opened: "По последнему открытию",
    created: "По времени создания",
    title: "По названию",
  },
  noProject: "Без проекта",
  personalInitials: "Я",
  untitled: "Без названия",
  reasonLabels: {
    question: "Ждёт ответа: вопрос или подтверждение",
    error: "Ошибка",
    done: "Готово, не прочитано",
  },
  childThreadOf: (parentTitle) => `Дочерний тред: ${parentTitle}`,
  toggleBranchLabel: (title, collapsed) =>
    `${collapsed ? "Развернуть" : "Свернуть"} дочерние треды «${title}»`,
  threadActionsLabel: (title) => `Действия с тредом «${title}»`,
  nestingError: "Не удалось изменить вложенность треда. Попробуйте ещё раз.",
  timeNow: "сейчас",
  timeSuffix: /назад|тому/gu,
};

const DICTIONARIES: Record<Locale, Messages> = { en, ru };

/** `ru` if the client's preferred language is Russian, otherwise `en`. */
export function detectLocale(): Locale {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const languages = nav?.languages?.length ? nav.languages : [nav?.language];
  const preferred = languages[0];
  return typeof preferred === "string" && /^ru(?:[-_]|$)/i.test(preferred) ? "ru" : "en";
}

let current: Locale = detectLocale();

export function getLocale(): Locale {
  return current;
}

/** Overrides the detected locale; meant for tests. */
export function setLocale(locale: Locale): void {
  current = locale;
}

/** The dictionary of the current locale. Call it at render time, not at module load. */
export function t(): Messages {
  return DICTIONARIES[current];
}
