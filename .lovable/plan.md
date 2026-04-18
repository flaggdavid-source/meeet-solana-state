

## Проблема

Страница `/sectors` падает в ErrorBoundary («Oops! Something went wrong»). БД в порядке (12 секторов засеяно), типы Supabase сгенерированы, роут зарегистрирован. Скорее всего runtime-ошибка в `src/pages/Sectors.tsx`:

1. `React.ReactNode` используется в типе пропа `Stat` без `import React` — в strict-режиме это NPE при чтении свойства `ReactNode` у `undefined`.
2. Возможна вторичная проблема с эмодзи-иконками (`🏛`, `⚖️`) при инициализации `BRANCH_META`.

## План исправления

1. **Добавить `import React`** в `src/pages/Sectors.tsx` (или заменить `React.ReactNode` на импортируемый `ReactNode` из `react`).
2. **Защитить fetch**: добавить `error` обработку в `useEffect` и логировать в консоль, чтобы при следующем падении был видимый лог.
3. **Sanity-check рендера**: убедиться что `Stat` принимает корректные ноды и что `BRANCH_META[branch]` всегда существует.
4. После фикса — открыть `/sectors` и проверить, что страница показывает все 12 министерств в 4 ветвях.

## Файлы

- `src/pages/Sectors.tsx` — поправить импорт и добавить try/catch в загрузке.

