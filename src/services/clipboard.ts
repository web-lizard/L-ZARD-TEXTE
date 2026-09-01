import {NativeModules, Platform} from 'react-native';

/**
 * Обёртка над Android native module RichClipboard (Kotlin).
 * Копирует одновременно plain text и styled HTML (ClipData.newHtmlText).
 */
const RichClipboard = NativeModules.RichClipboard as
  | {
      copyRich?: (html: string, plain: string) => Promise<boolean>;
      copyText?: (plain: string) => Promise<boolean>;
      readClipboardHtml?: () => Promise<{present: boolean; html: string; mimes: string}>;
    }
  | undefined;

function noNative(): never {
  throw new Error('Native clipboard unavailable');
}

/** Одновременно: plain text + HTML. Основной путь для Telegram. */
export function copyRich(html: string, plain: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !RichClipboard?.copyRich) {
    return Promise.reject(new Error('no native'));
  }
  return RichClipboard.copyRich(html, plain).then(
    () => true,
    () => {
      throw new Error('clipboard failed');
    },
  );
}

/** Только plain text. */
export function copyText(plain: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !RichClipboard?.copyText) {
    return Promise.reject(new Error('no native'));
  }
  return RichClipboard.copyText(plain).then(
    () => true,
    () => {
      throw new Error('clipboard failed');
    },
  );
}

/** Диагностика: что реально лежит в буфере (HTML, MIME). */
export function readClipboardHtml(): Promise<{present: boolean; html: string; mimes: string}> {
  if (Platform.OS !== 'android' || !RichClipboard?.readClipboardHtml) {
    return Promise.reject(new Error('no native'));
  }
  return RichClipboard.readClipboardHtml();
}

void noNative;
