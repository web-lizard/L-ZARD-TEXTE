export type FormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'spoiler'
  | 'blockquote';

export interface TextEntity {
  id: string;
  type: FormatType;
  start: number;
  end: number;
}

export type StyleKey = 'minimal' | 'classique' | 'accent' | 'brutal';

export interface Document {
  id: string;
  text: string;
  entities: TextEntity[];
  style: StyleKey;
  createdAt: number;
  updatedAt: number;
}

/** Ответ AI: только список фрагментов, без повтора исходного текста. */
export interface AiEntity {
  type: FormatType;
  text: string;
  occurrence?: number;
}

export interface AiResponse {
  entities: AiEntity[];
}

export interface HistoryRecord {
  id: string;
  preview: string;
  entitiesCount: number;
  style: StyleKey;
  createdAt: number;
  document: Document;
}
