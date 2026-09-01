# LÉZARD TEXTE

Минималистичный интеллектуальный редактор Telegram-постов для Android.

**ТЕКСТ → STYLE → COPIE → TELEGRAM**

Вставил текст → Оформил → Скопировал → Опубликовал.

ИИ не пишет текст за вас. ИИ оформляет уже написанный текст: bold, italic,
underline, strikethrough, spoiler, blockquote. Вы видите настоящий WYSIWYG
и можете поправить оформление вручную.

## Стек

- React Native 0.78 + TypeScript
- Нативный Kotlin-модуль rich clipboard (`ClipData.newHtmlText`)
- DeepSeek через существующий PHP-proxy (ключ только на сервере)

## Структура

```text
src/
  components/        UI-компоненты
  editor/            WYSIWYG-рендер
  screens/           MainScreen, TestTelegramScreen
  services/
    ai.ts            запрос к PHP-proxy
    formatter.ts     фрагменты AI -> диапазоны, лимиты
    telegramExport.ts  HTML / MarkdownV2 / clipboard HTML
  storage/           история (AsyncStorage, 20 последних)
  config/
    api.ts           PROXY_URL — домен меняется одной строкой
  types/
  utils/
android/
  RichClipboardModule.kt
```

## AI

- App общается только с `https://cv038824.tw1.ru/deep-seek/deep-seek.php`
  (адрес в `src/config/api.ts`).
- Секрет DeepSeek живёт на сервере в `.seferometer-secrets/deepseek.key`
  и никогда не попадает в APK.
- Один текст = один stateless запрос. Модель возвращает только JSON со
  списком фрагментов — никакого повторного вывода исходного текста.

## Сборка APK

```powershell
npm install
cd android
.\gradlew.bat assembleRelease
```

Готовый APK: `android/app/build/outputs/apk/release/app-release.apk`.

## Тест Telegram

Экран `TEST TELEGRAM` (⌘ в шапке) копирует образец всех стилей в rich
clipboard. Вставьте его в Telegram и проверьте, что сохранилось.

## Конфигурация

| Что | Где |
|---|---|
| Домен AI-proxy | `src/config/api.ts` |
| Лимиты AI-разметки | `src/services/formatter.ts` (MAX_ENTITIES и т.д.) |
| Палитра | `src/theme.ts` |
| Иконки | `scripts/generate_icons.py` |
