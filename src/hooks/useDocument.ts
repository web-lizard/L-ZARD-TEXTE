import {useCallback, useEffect, useRef, useState} from 'react';
import type {Document, StyleKey, TextEntity} from '../types';
import {emptyDocument, saveCurrent} from '../storage/history';

interface Snapshot {
  text: string;
  entities: TextEntity[];
}

const MAX_UNDO = 100;
/** Быстрые правки текста сливаются в одну операцию undo. */
const TYPING_COALESCE_MS = 800;

/**
 * Состояние документа + undo/redo.
 * AI-оформление — это одна операция undo.
 */
export function useDocument(initial: Document | null) {
  const [doc, setDoc] = useState<Document>(() => initial ?? emptyDocument());
  const docRef = useRef(doc);
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const lastEditRef = useRef(0);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  const update = useCallback(
    (mutator: (d: Document) => Document, coalesce = false) => {
      const prev = docRef.current;
      const snap: Snapshot = {text: prev.text, entities: prev.entities};
      const now = Date.now();
      const past = pastRef.current;
      if (coalesce && past.length > 0 && now - lastEditRef.current < TYPING_COALESCE_MS) {
        past[past.length - 1] = snap;
      } else {
        past.push(snap);
        if (past.length > MAX_UNDO) {
          past.shift();
        }
      }
      lastEditRef.current = now;
      futureRef.current = [];
      setDoc(mutator(prev));
    },
    [],
  );

  const setText = useCallback(
    (text: string) => {
      update(d => ({...d, text, updatedAt: Date.now()}), true);
    },
    [update],
  );

  const setEntities = useCallback(
    (entities: TextEntity[]) => {
      update(d => ({...d, entities, updatedAt: Date.now()}));
    },
    [update],
  );

  const setStyle = useCallback(
    (style: StyleKey) => {
      update(d => ({...d, style, updatedAt: Date.now()}));
    },
    [update],
  );

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) {
      return;
    }
    const snap = past.pop() as Snapshot;
    futureRef.current.push({text: docRef.current.text, entities: docRef.current.entities});
    setDoc(d => ({...d, text: snap.text, entities: snap.entities, updatedAt: Date.now()}));
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) {
      return;
    }
    const snap = future.pop() as Snapshot;
    pastRef.current.push({text: docRef.current.text, entities: docRef.current.entities});
    setDoc(d => ({...d, text: snap.text, entities: snap.entities, updatedAt: Date.now()}));
  }, []);

  const loadDocument = useCallback((next: Document) => {
    pastRef.current = [];
    futureRef.current = [];
    lastEditRef.current = 0;
    setDoc(next);
  }, []);

  const clearDocument = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastEditRef.current = 0;
    setDoc(emptyDocument());
  }, []);

  // Автосохранение текущего документа (deferred).
  useEffect(() => {
    const t = setTimeout(() => {
      void saveCurrent(doc);
    }, 600);
    return () => clearTimeout(t);
  }, [doc]);

  return {
    doc,
    setText,
    setEntities,
    setStyle,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    loadDocument,
    clearDocument,
  };
}
