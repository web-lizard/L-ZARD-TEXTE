import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Document, HistoryRecord} from '../types';
import {makeId} from '../utils/text';

const CURRENT_KEY = '@lezard/current';
const HISTORY_KEY = '@lezard/history';

export const MAX_HISTORY = 20;

export async function loadCurrent(): Promise<Document | null> {
  try {
    const raw = await AsyncStorage.getItem(CURRENT_KEY);
    if (!raw) {
      return null;
    }
    const doc = JSON.parse(raw) as Document;
    if (typeof doc?.text !== 'string' || !Array.isArray(doc?.entities)) {
      return null;
    }
    return doc;
  } catch {
    return null;
  }
}

export async function saveCurrent(doc: Document): Promise<void> {
  try {
    await AsyncStorage.setItem(CURRENT_KEY, JSON.stringify(doc));
  } catch {
    /* автосохранение не должно ронять приложение */
  }
}

export async function loadHistory(): Promise<HistoryRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const list = JSON.parse(raw) as HistoryRecord[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function toHistoryRecord(doc: Document): HistoryRecord {
  return {
    id: doc.id,
    preview: doc.text.slice(0, 80).replace(/\s+/g, ' '),
    entitiesCount: doc.entities.length,
    style: doc.style,
    createdAt: doc.createdAt,
    document: doc,
  };
}

/** Добавляет документ в историю (max 20, свежие сверху, без дублей). */
export async function pushHistory(doc: Document): Promise<HistoryRecord[]> {
  const list = await loadHistory();
  const record = toHistoryRecord(doc);
  const next = [record, ...list.filter(r => r.id !== doc.id)].slice(0, MAX_HISTORY);
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export async function removeFromHistory(id: string): Promise<HistoryRecord[]> {
  const list = await loadHistory();
  const next = list.filter(r => r.id !== id);
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function emptyDocument(): Document {
  const now = Date.now();
  return {
    id: makeId(),
    text: '',
    entities: [],
    style: 'classique',
    createdAt: now,
    updatedAt: now,
  };
}
