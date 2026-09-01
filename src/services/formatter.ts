import type {AiEntity, FormatType, TextEntity} from '../types';
import {clamp, makeId} from '../utils/text';

/**
 * Ограничения AI-разметки. Меняются здесь.
 */
export const MAX_ENTITIES = 30;
/** Максимум текста под активным форматированием (0.30 = 30%). */
export const MAX_FORMATTED_RATIO = 0.3;
/** Минимальная длина форматируемого фрагмента. */
export const MIN_FRAGMENT_LENGTH = 2;
/** Одна entity не должна занимать больше доли поста. */
export const MAX_FRAGMENT_RATIO = 0.5;

const VALID_TYPES: ReadonlySet<FormatType> = new Set([
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'spoiler',
  'blockquote',
]);

function findOccurrences(haystack: string, needle: string): number[] {
  const positions: number[] = [];
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    positions.push(idx);
    idx = haystack.indexOf(needle, idx + 1);
  }
  return positions;
}

/** Расширяет диапазон до границ строки (для blockquote). */
function snapToLines(text: string, start: number, end: number): {start: number; end: number} {
  const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextNl = text.indexOf('\n', end);
  const lineEnd = nextNl === -1 ? text.length : nextNl;
  return {start: lineStart, end: lineEnd};
}

function measureCovered(textLength: number, entities: TextEntity[]): number {
  const flags = new Uint8Array(textLength);
  for (const e of entities) {
    for (let i = e.start; i < Math.min(e.end, textLength); i++) {
      flags[i] = 1;
    }
  }
  let count = 0;
  for (let i = 0; i < textLength; i++) {
    count += flags[i];
  }
  return count;
}

/**
 * Превращает ответ AI (фрагменты текста + occurrence) в реальные диапазоны.
 * Ненайденные/некорректные entity молча игнорируются — документ не ломаем.
 */
export function aiEntitiesToRanges(text: string, aiEntities: AiEntity[]): TextEntity[] {
  if (!text) {
    return [];
  }
  const result: TextEntity[] = [];
  const seen = new Set<string>();

  for (const ai of aiEntities) {
    if (result.length >= MAX_ENTITIES) {
      break;
    }
    if (!ai || typeof ai.type !== 'string' || !VALID_TYPES.has(ai.type)) {
      continue;
    }
    let needle = typeof ai.text === 'string' ? ai.text : '';
    if (!needle) {
      continue;
    }
    if (needle.trim().length < MIN_FRAGMENT_LENGTH) {
      continue;
    }
    if (needle.length / text.length > MAX_FRAGMENT_RATIO && ai.type !== 'blockquote') {
      continue;
    }

    let positions = findOccurrences(text, needle);
    if (positions.length === 0) {
      // AI иногда присылает фрагмент с лишними пробелами/переносами по краям.
      const trimmed = needle.trim();
      if (trimmed.length >= MIN_FRAGMENT_LENGTH && trimmed !== needle) {
        positions = findOccurrences(text, trimmed);
        if (positions.length > 0) {
          needle = trimmed;
        }
      }
    }
    if (positions.length === 0) {
      continue;
    }

    const occurrence = typeof ai.occurrence === 'number' && ai.occurrence >= 1 ? ai.occurrence : 1;
    const idx = occurrence - 1;
    if (idx >= positions.length) {
      continue;
    }

    let start = positions[idx];
    let end = start + needle.length;
    if (ai.type === 'blockquote') {
      const snapped = snapToLines(text, start, end);
      start = snapped.start;
      end = snapped.end;
    }
    if (end <= start) {
      continue;
    }

    const key = `${ai.type}:${start}:${end}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    result.push({id: makeId(), type: ai.type, start, end});

    // Проверка суммарного лимита покрытия.
    const covered = measureCovered(text.length, result);
    if (covered > MAX_FORMATTED_RATIO * text.length) {
      result.pop();
      // Дальше только больше — прекращаем.
      break;
    }
  }

  return result;
}

export interface Segment {
  start: number;
  end: number;
  styles: FormatType[];
}

/** Разбивает текст на непересекающиеся сегменты с набором активных стилей. */
export function buildSegments(text: string, entities: TextEntity[]): Segment[] {
  const len = text.length;
  const boundaries = new Set<number>([0, len]);
  for (const e of entities) {
    const s = clamp(e.start, 0, len);
    const e2 = clamp(e.end, s, len);
    if (e2 > s) {
      boundaries.add(s);
      boundaries.add(e2);
    }
  }
  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const segments: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i];
    const e = sorted[i + 1];
    if (e <= s) {
      continue;
    }
    const styles = new Set<FormatType>();
    for (const en of entities) {
      if (en.type !== 'blockquote' && en.start <= s && en.end >= e) {
        styles.add(en.type);
      }
    }
    segments.push({start: s, end: e, styles: Array.from(styles)});
  }
  return segments;
}

/** Стили активны на всём диапазоне выбора. */
function isRangeFullyCovered(entities: TextEntity[], type: FormatType, start: number, end: number): boolean {
  return entities.some(
    en => en.type === type && en.start <= start && en.end >= end && en.end > en.start,
  );
}

/**
 * Ручное форматирование: добавить/снять стиль на выделении.
 */
export function toggleFormat(
  entities: TextEntity[],
  start: number,
  end: number,
  type: FormatType,
): TextEntity[] {
  if (end <= start) {
    return entities;
  }
  if (isRangeFullyCovered(entities, type, start, end)) {
    return entities.filter(
      en => !(en.type === type && en.start < end && en.end > start),
    );
  }
  return [...entities, {id: makeId(), type, start, end}];
}

/** Снять всё форматирование с диапазона. */
export function removeFormat(entities: TextEntity[], start: number, end: number): TextEntity[] {
  if (end <= start) {
    return entities;
  }
  return entities.filter(en => !(en.start < end && en.end > start));
}

/** Покрыт ли диапазон хотя бы одним стилем (для подсветки кнопок). */
export function getActiveStyles(entities: TextEntity[], start: number, end: number): FormatType[] {
  if (end <= start) {
    return [];
  }
  const types = new Set<FormatType>();
  for (const en of entities) {
    if (en.start <= start && en.end >= end) {
      types.add(en.type);
    }
  }
  return Array.from(types);
}

