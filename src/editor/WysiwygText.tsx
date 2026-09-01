import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {COLORS} from '../theme';
import type {FormatType, TextEntity} from '../types';
import {buildSegments} from '../services/formatter';
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

function isLineQuoted(entities: TextEntity[], line: Line): boolean {
  return entities.some(
    en => en.type === 'blockquote' && en.start <= line.start && en.end >= line.end,
  );
}

function segmentStyle(styles: FormatType[]) {
  const style: Record<string, string | number> = {};
  if (styles.includes('bold')) {
    style.fontWeight = '700';
  }
  if (styles.includes('italic')) {
    style.fontStyle = 'italic';
  }
  const decorations: string[] = [];
  if (styles.includes('underline')) {
    decorations.push('underline');
  }
  if (styles.includes('strikethrough')) {
    decorations.push('line-through');
  }
  if (decorations.length) {
    style.textDecorationLine = decorations.join(' ');
  }
  if (styles.includes('spoiler')) {
    style.backgroundColor = COLORS.oliveDark;
    style.color = COLORS.oliveDark;
  }
  return style;
}

function Inline({line, entities}: {line: Line; entities: TextEntity[]}) {
  const local = entities
    .filter(en => en.type !== 'blockquote')
    .map(en => ({
      id: en.id,
      type: en.type,
      start: clamp(en.start - line.start, 0, line.content.length),
      end: clamp(en.end - line.start, 0, line.content.length),
    }));
  const segments = buildSegments(line.content, local as TextEntity[]);
  if (segments.length === 0) {
    return <Text style={styles.baseText}>{line.content}</Text>;
  }
  return (
    <Text style={styles.baseText}>
      {segments.map(seg => (
        <Text key={`${seg.start}-${seg.end}`} style={segmentStyle(seg.styles)}>
          {line.content.slice(seg.start, seg.end)}
        </Text>
      ))}
    </Text>
  );
}

interface Props {
  text: string;
  entities: TextEntity[];
}

/**
 * WYSIWYG-рендер: bold, italic, underline, strikethrough, spoiler, blockquote.
 * Без звёздочек и подчёркиваний в основном интерфейсе.
 */
export function WysiwygText({text, entities}: Props) {
  if (!text) {
    return (
      <Text style={[styles.baseText, styles.placeholder]}>
        Вставь текст сюда...
      </Text>
    );
  }
  const lines = splitLines(text);
  return (
    <View>
      {lines.map((line, idx) => {
        if (isLineQuoted(entities, line)) {
          return (
            <View key={idx} style={styles.quote}>
              <Inline line={line} entities={entities} />
            </View>
          );
        }
        return <Inline key={idx} line={line} entities={entities} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  baseText: {
    color: COLORS.text,
    fontSize: 17,
    lineHeight: 26,
  },
  placeholder: {
    color: COLORS.textDim,
    fontStyle: 'italic',
  },
  quote: {
    backgroundColor: COLORS.surfaceAlt,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.olive,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 4,
  },
});
