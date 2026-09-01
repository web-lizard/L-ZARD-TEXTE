# Отчёт: rich clipboard LÉZARD TEXTE → Telegram Android

## 1. Проблема

Приложение LÉZARD TEXTE (Android, React Native) копирует отформатированный
текст в системный буфер обмена. При вставке в Telegram Android форматирование
**не сохраняется** — вставляется plain text.

При этом: **копирование отформатированного текста из Telegram и вставка в другое
окно Telegram сохраняет разметку.** Значит, механизм в принципе работает, и надо
повторить формат, который Telegram сам кладёт в буфер.

## 2. Как сейчас работает копирование в LÉZARD TEXTE

### 2.1. JS: генерация HTML (`src/services/telegramExport.ts`)

```
toClipboardHtml(text, entities):
  - строки разделяются <br>  (НЕ \n)
  - жирный/курсив/подчёркивание/зачёркнутый: <b> <i> <u> <s>
  - цитата: <blockquote>...</blockquote> (блочный)
  - спойлер: <spoiler>...</spoiler>
  - экранирование: &lt; &gt; &amp;
  - фрагмент без <html>/<body>-обёртки
```

Пример вывода:
```
<b>Жирный фрагмент</b><br><i>Курсивный фрагмент</i><br><u>Подчёркнутый</u><br><s>Зачёркнутый</s><br><spoiler>Спойлер</spoiler><blockquote>Цитата</blockquote>
```

### 2.2. Native: Kotlin (`RichClipboardModule.kt`)

```kotlin
@ReactMethod
fun copyRich(html: String, plain: String, promise: Promise) {
    val clip = ClipData.newHtmlText("LÉZARD TEXTE", plain, html)
    cm.setPrimaryClip(clip)
    promise.resolve(true)
}
```

То есть на устройство уходит ClipData с MIME `text/html` + `text/plain` и
`item.getHtmlText()` = наш HTML.

### 2.3. Диагностика

Есть native-метод `readClipboardHtml()` — читает буфер обратно и показывает,
есть ли HTML, какие MIME и первые 120 символов. Экран TEST TELEGRAM умеет это
показывать, а также имеет вторую кнопку COPY DOC (вариант с обёрткой
`<!DOCTYPE html><html><body>...</body></html>`).

## 3. Что мы выяснили по исходникам Telegram (DrKLO/Telegram, master)

### 3.1. Как Telegram ЧИТАЕТ буфер при вставке

`ChatActivityEnterView.java` → `onTextContextMenuItem` → `handleRichHtmlPaste()`:

```java
final ClipData clip = cm.getPrimaryClip();
if (clip == null || clip.getItemCount() < 1
        || !clip.getDescription().hasMimeType("text/html")) {
    return false;                                // -> plain text paste
}
final String html = clip.getItemAt(0).getHtmlText();
if (TextUtils.isEmpty(html)) return false;       // -> plain text paste
final List<BlockRow> rows = RichHtml.parse(html, authors);
if (rows == null || rows.isEmpty()) return false;// -> plain text paste

if (RichMessageConvert.isLossy(rows, authors)) {
    if (!richEditorAvailable()) return false;    // -> plain text paste
    // открывает RichEditor
}

### 3.2. Какие теги понимает `RichHtml` (org/telegram/ui/iv/RichHtml.java)

Инлайн: `b, strong, i, em, u, s, strike, del, code, tt, spoiler, sub, sup,
a, br, span, animated-emoji, font, button`

Блочные: `p, div, h1-h6, blockquote, pre, ul, ol, li, hr, details, table,
img, video, audio, footer, summary`

Маппинг стилей: `b/strong → bold`, `i/em → italic`, `u → underline`,
`s/strike/del → strike`, `spoiler → spoiler`, `br → \n`.

### 3.3. Что считается «потеряшным» (`isLossy`)

`pageBlockParagraph`, `pageBlockPreformatted`, `pageBlockBlockquote` без caption
и без вложенных списков — НЕ lossy. То есть простые параграфы с инлайн-стилями
вставляются напрямую с форматированием (без RichEditor).

### 3.4. Как Telegram КОПИРУЕТ отформатированный текст (рабочий эталон)

`AndroidUtilities.java`:

```java
public static boolean addToClipboard(CharSequence str) {
    ...
    ClipData clip = ClipData.newHtmlText("label", str, CustomHtml.toHtml((Spanned) str));
    clipboard.setPrimaryClip(clip);
}
```

**Ключевой факт: Telegram использует ТОТ ЖЕ `ClipData.newHtmlText`, что и мы.**

`CustomHtml.toHtml()` генерирует:
- `<b>`, `<i>`, `<u>`, `<s>` для стилей;
- `<blockquote>` (и `<blockquote collapsed>`) для цитат;
- `<spoiler>` для спойлеров;
- `<pre>` для моноширинного;
- `<br>` для `\n`;
- экранирование `&lt;` `&gt;` `&amp;`;
- `&nbsp;` для повторяющихся пробелов;
- **все не-ASCII символы как числовые entity `&#N;`** (кириллица, эмодзи и т.д.);
- фрагмент без `<html>`-обёртки.

// иначе: вставляет Spannable с разметкой в композер
```

Выводы:
- Telegram требует MIME `text/html` в описании клипа — есть у `newHtmlText`.
- Telegram берёт `item.getHtmlText()` — это ровно та строка, что мы передаём.
- Дальше HTML парсится собственным парсером **`RichHtml`**.

## 4. Наша гипотеза и оставшиеся отличия

Мы уже привели формат к виду Telegram (теги b/i/u/s, `<spoiler>`, `<blockquote>`,
`<br>`, фрагмент без обёртки). Оставшиеся отличия от `CustomHtml.toHtml`:

| Аспект | LÉZARD TEXTE | Telegram CustomHtml |
|---|---|---|
| Не-ASCII (кириллица, эмодзи) | сырые UTF-8 символы | числовые entity `&#1087;` |
| Повторяющиеся пробелы | как есть | `&nbsp;` |
| Обёртка | фрагмент | фрагмент (совпадает) |
| Перенос строк | `<br>` | `<br>` (совпадает) |
| Спойлер | `<spoiler>` | `<spoiler>` (совпадает) |

## 5. Открытые вопросы / что нужно проверить

1. **Версия Telegram на устройстве**: `handleRichHtmlPaste` + `RichHtml` — это
   новая механика (связана с RichEditor / Instant View). Если Telegram старый —
   html вообще не читается при вставке. Как проверить: скопировать из Chrome
   любую страницу с жирным текстом и вставить в Telegram — если разметка
   пропадает, дело в версии Telegram, а не в нас.
2. **Не мешает ли `richEditorAvailable()`** (эксперимент на аккаунте): если
   `isLossy(...)` возвращает true для нашего HTML, а эксперимент не включён —
   Telegram молча откатывается к plain text.
3. **Числовые entity**: нужно проверить, обязательны ли они для `RichHtml.parse`
   или сырые UTF-8 тоже парсятся корректно.
4. **`getHtmlText()` на разных Android**: проверить на нашем устройстве через
   встроенную диагностику (TEST TELEGRAM → статус `✅ HTML в буфере`).

## 6. Запрос к ChatGPT

- Посмотри, что ещё отличает HTML Telegram от нашего и что может заставить
  `RichHtml.parse` вернуть пусто/уронить вставку в plain text.
- Стоит ли эмулировать `CustomHtml.toHtml` полностью (numeric entities,
  `&nbsp;`) или это не влияет.
- Есть ли способ гарантированно «притвориться» телеграмовской вставкой:
  например, правильная структура `<!DOCTYPE html><html>...` или дополнительный
  MIME-тип, или префикс в HTML.
- Как проверить на конкретной версии Telegram, читает ли она вообще
  `text/html` из чужого приложения (не только из самого Telegram).

## 7. Файлы проекта (для справки)

- `src/services/telegramExport.ts` — генерация HTML/MarkdownV2.
- `src/services/clipboard.ts` — JS-обёртка над native.
- `android/app/src/main/java/com/lezardtexte/RichClipboardModule.kt` — native
  копирование + диагностика.
- `src/screens/TestTelegramScreen.tsx` — тест-экран с проверкой буфера.

