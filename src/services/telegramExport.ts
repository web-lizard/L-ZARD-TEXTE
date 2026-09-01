import type {FormatType, TextEntity} from '../types';
import {buildSegments} from './formatter';
import {clamp} from '../utils/text';

interface Line {
  start: number;
  end: number;
  content: string;
}

function splitLines(text: string): Line[] {
  const lines: Line[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      lines.push({start, end: i, content: text.slice(start, i)});
      start = i + 1;
    }
  }
  lines.push({start, end: text.length, content: text.slice(start)});
  return lines;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeMarkdownV2(s: string): string {
  return s.replace(/[\\_*[\]()~`>#+\-=|{}.!]/g, m => `\\${m}`);
}

const SPOILER_OPEN: Record<'export' | 'clipboard', string> = {
  export: '<tg-spoiler>',
  clipboard: '<spoiler>',
};
const SPOILER_CLOSE: Record<'export' | 'clipboard', string> = {
  export: '</tg-spoiler>',
  clipboard: '</spoiler>',
};

const INLINE_TAGS: Record<'bold' | 'italic' | 'underline' | 'strikethrough', [string, string]> = {
  bold: ['<b>', '</b>'],
  italic: ['<i>', '</i>'],
  underline: ['<u>', '</u>'],
  strikethrough: ['<s>', '</s>'],
};

const MD_MARK: Record<Exclude<FormatType, 'blockquote'>, [string, string]> = {
  bold: ['*', '*'],
  italic: ['_', '_'],
  underline: ['__', '__'],
  strikethrough: ['~', '~'],
  spoiler: ['||', '||'],
};

const INLINE_ORDER: FormatType[] = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'spoiler',
];

function isLineQuoted(entities: TextEntity[], line: Line): boolean {
  return entities.some(
    en => en.type === 'blockquote' && en.start <= line.start && en.end >= line.end,
  );
}

function buildInlineHtml(
  line: Line,
  entities: TextEntity[],
  variant: 'export' | 'clipboard',
): string {
  const local = entities
    .filter(en => en.type !== 'blockquote')
    .map(en => ({
      type: en.type,
      start: clamp(en.start - line.start, 0, line.content.length),
      end: clamp(en.end - line.start, 0, line.content.length),
    }));
  const segments = buildSegments(line.content, local as TextEntity[]);
  let out = '';
  for (const seg of segments) {
    const raw = line.content.slice(seg.start, seg.end);
    if (!raw) {
      continue;
    }
    let html = escapeHtml(raw);
    for (const type of INLINE_ORDER) {
      if (seg.styles.includes(type)) {
        if (type === 'spoiler') {
          html = `${SPOILER_OPEN[variant]}${html}${SPOILER_CLOSE[variant]}`;
        } else {
          const [open, close] = INLINE_TAGS[type as 'bold' | 'italic' | 'underline' | 'strikethrough'];
          html = `${open}${html}${close}`;
        }
      }
    }
    out += html;
  }
  return out || escapeHtml(line.content);
}

function buildInlineMd(line: Line, entities: TextEntity[]): string {
  const local = entities
    .filter(en => en.type !== 'blockquote')
    .map(en => ({
      type: en.type,
      start: clamp(en.start - line.start, 0, line.content.length),
      end: clamp(en.end - line.start, 0, line.content.length),
    }));
  const segments = buildSegments(line.content, local as TextEntity[]);
  let out = '';
  for (const seg of segments) {
    const raw = line.content.slice(seg.start, seg.end);
    if (!raw) {
      continue;
    }
    let md = escapeMarkdownV2(raw);
    for (const type of INLINE_ORDER) {
      if (seg.styles.includes(type)) {
        const [open, close] = MD_MARK[type as Exclude<FormatType, 'blockquote'>];
        md = `${open}${md}${close}`;
      }
    }
    out += md;
  }
  return out || escapeMarkdownV2(line.content);
}

/** HTML в формате разметки Telegram (spoiler = <tg-spoiler>). */
export function toTelegramHtml(text: string, entities: TextEntity[]): string {
  const lines = splitLines(text);
  return lines
    .map(line => {
      const inner = buildInlineHtml(line, entities, 'export');
      return isLineQuoted(entities, line) ? `<blockquote>${inner}</blockquote>` : inner;
    })
    .join('\n');
}

/**
 * HTML для Android rich clipboard в РОДНОМ формате Telegram
 * (формат CustomHtml: b/i/u/s, blockquote, spoiler, br вместо \n).
 * Именно его Telegram читает через RichHtml.parse при вставке.
 */
export function toClipboardHtml(text: string, entities: TextEntity[]): string {
  const lines = splitLines(text);
  const parts: string[] = [];
  let run: Line[] = [];
  const flushRun = () => {
    if (run.length > 0) {
      parts.push(run.map(l => buildInlineHtml(l, entities, 'clipboard')).join('<br>'));
      run = [];
    }
  };
  for (const line of lines) {
    if (isLineQuoted(entities, line)) {
      flushRun();
      parts.push(`<blockquote>${buildInlineHtml(line, entities, 'clipboard')}</blockquote>`);
    } else {
      run.push(line);
    }
  }
  flushRun();
  return parts.join('');
}

/** Telegram MarkdownV2 — генерируется только локально, ИИ его не видит. */
export function toMarkdownV2(text: string, entities: TextEntity[]): string {
  const lines = splitLines(text);
  return lines
    .map(line => {
      const inner = buildInlineMd(line, entities);
      return isLineQuoted(entities, line) ? `> ${inner}` : inner;
    })
    .join('\n');
}
