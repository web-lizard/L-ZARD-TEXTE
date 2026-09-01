import {AI_TIMEOUT_MS, PROXY_URL} from '../config/api';
import type {AiResponse, StyleKey} from '../types';

export class AiError extends Error {
  userMessage: string;
  constructor(message: string, userMessage: string) {
    super(message);
    this.name = 'AiError';
    this.userMessage = userMessage;
  }
}

const STYLE_HINTS: Record<StyleKey, string> = {
  minimal: 'Очень мало форматирования. Только самые важные смысловые точки.',
  classique: 'Умеренное количество акцентов. Основной режим.',
  accent: 'Больше визуальных акцентов. Активнее используются bold, italic и underline.',
  brutal: 'Выразительное оформление для эмоциональных постов. Но не превращай весь текст в сплошной жирный курсив.',
};

/**
 * Системный промпт — короткий, без лишнего. Экономия токенов принципиальна.
 */
export function buildSystemPrompt(style: StyleKey): string {
  return [
    'Ты редактор Telegram-разметки.',
    'Не меняй текст.',
    'Выбери только смысловые фрагменты для форматирования.',
    'Допустимо: bold, italic, underline, strikethrough, spoiler, blockquote.',
    `Стиль: ${style}. ${STYLE_HINTS[style]}`,
    'blockquote оформляй только целиком строку или абзац.',
    'Не оформляй всё подряд.',
    'Верни только JSON.',
  ].join('\n');
}

export function buildUserPrompt(text: string): string {
  return [
    'Верни:',
    '{"entities":[{"type":"bold","text":"точный фрагмент текста","occurrence":1}]}',
    '',
    'Исходный текст:',
    '',
    '<<<',
    text,
    '>>>',
  ].join('\n');
}

function extractJson(content: string): unknown {
  let candidate = content.trim();
  // Снимаем markdown-обёртки ```json ... ``` если модель их прилепила.
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) {
    candidate = fence[1].trim();
  }
  try {
    return JSON.parse(candidate);
  } catch {
    // Пробуем вытащить первый {...} блок.
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error('JSON parse failed');
  }
}

/**
 * Один текст = один stateless запрос. Никакой истории и предыдущих версий.
 * Ответ: choices[0].message.content → JSON с entities.
 */
export async function requestFormatting(text: string, style: StyleKey): Promise<AiResponse> {
  if (!text || !text.trim()) {
    throw new AiError('empty', 'Нечего оформлять. Вставь текст.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        messages: [
          {role: 'system', content: buildSystemPrompt(style)},
          {role: 'user', content: buildUserPrompt(text)},
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = (err as Error).name === 'AbortError';
    throw new AiError(
      'network',
      timedOut
        ? 'AI не ответил вовремя. Попробуй ещё раз.'
        : 'Не удалось связаться с AI. Проверь интернет.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = (body as {error?: string}).error ?? '';
    } catch {
      /* ignore */
    }
    throw new AiError(
      `http_${response.status}`,
      detail
        ? `AI-сервер: ${detail}`
        : `AI-сервер ответил ошибкой ${response.status}. Попробуй позже.`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AiError('invalid_json', 'AI вернул повреждённый ответ. Попробуй ещё раз.');
  }

  const content = (data as {choices?: Array<{message?: {content?: unknown}}>})
    ?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new AiError('empty_content', 'AI вернул пустой ответ. Попробуй ещё раз.');
  }

  let parsed: unknown;
  try {
    parsed = extractJson(content);
  } catch {
    throw new AiError('bad_json', 'AI вернул неразборчивый ответ. Попробуй ещё раз.');
  }

  const entities = (parsed as AiResponse | null)?.entities;
  if (!Array.isArray(entities)) {
    throw new AiError('no_entities', 'AI не нашёл фрагменты для оформления.');
  }

  return {entities};
}
