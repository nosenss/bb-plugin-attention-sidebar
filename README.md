# Attention sidebar

Свой список тредов для сайдбара bb (плагин `attention-sidebar`, слот
`app.slots.experimental_threadList`).

Сверху вниз: **Ждут вас** (вопросы `?`, ошибки `!`, готовые `✓` из всех
проектов), **В работе**, **Закреплённые**, затем папки проектов с аватаром,
названием и счётчиком. Иконок провайдеров нет: в верхних блоках у строки
аватар проекта (буквы из названия, цвет из FNV-1a от `projectId`).

## Структура

- `app.tsx` — регистрация слота.
- `components/` — React: список, строка, аватар, хуки (таймер, заморозка
  активного треда, свёрнутость в localStorage).
- `lib/` — чистая логика: `model.ts` (классификация и группировка),
  `avatar.ts`, `time.ts`.
- `server.ts` — пустой бэкенд: манифест bb требует `bb.server`.
- `skills/attention-sidebar/SKILL.md` — что делает плагин и как вернуть стандартный
  список.

## Команды

```sh
npm install --include=dev
npm test               # vitest: lib + смоук renderSlot
npx tsc --noEmit
bb plugin build
bb plugin install . --yes
```

Вернуть стандартный список: Settings → Appearance → Sidebar thread list →
Thread list, или `bb plugin disable attention-sidebar`.
