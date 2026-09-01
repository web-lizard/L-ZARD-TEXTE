import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {COLORS} from '../theme';
import {BigButton} from '../components/BigButton';
import {Toast} from '../components/Toast';
import {WysiwygText} from '../editor/WysiwygText';
import type {FormatType, TextEntity} from '../types';
import {toClipboardHtml} from '../services/telegramExport';
import {copyRich} from '../services/clipboard';
import {makeId} from '../utils/text';

const SAMPLE_LINES: {type: FormatType; text: string}[] = [
  {type: 'bold', text: 'Жирный фрагмент'},
  {type: 'italic', text: 'Курсивный фрагмент'},
  {type: 'underline', text: 'Подчёркнутый фрагмент'},
  {type: 'strikethrough', text: 'Зачёркнутый фрагмент'},
  {type: 'spoiler', text: 'Спойлер спрятан под пятном'},
  {type: 'blockquote', text: 'Цитата оформляется отдельным блоком'},
];

function buildSample(): {text: string; entities: TextEntity[]} {
  const text = SAMPLE_LINES.map(l => l.text).join('\n');
  const entities: TextEntity[] = [];
  let offset = 0;
  for (const line of SAMPLE_LINES) {
    const idx = text.indexOf(line.text, offset);
    entities.push({id: makeId(), type: line.type, start: idx, end: idx + line.text.length});
    offset = idx + line.text.length + 1;
  }
  return {text, entities};
}

interface Props {
  onBack: () => void;
}

export function TestTelegramScreen({onBack}: Props) {
  const sample = useMemo(buildSample, []);
  const [toast, setToast] = useState<string | null>(null);

  const copyTest = useCallback(async () => {
    try {
      await copyRich(toClipboardHtml(sample.text, sample.entities), sample.text);
      setToast('Тест скопирован. Вставь в Telegram и проверь, что сохранилось.');
    } catch {
      setToast('Не удалось скопировать.');
    }
  }, [sample]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>TEST TELEGRAM</Text>
          <Text style={styles.subtitle}>ПРОВЕРКА RICH CLIPBOARD</Text>
        </View>

        <View style={styles.previewBox}>
          <WysiwygText text={sample.text} entities={sample.entities} />
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Как проверять</Text>
          <Text style={styles.noteText}>
            Нажми COPY TEST и вставь текст в поле ввода Telegram обычным образом.
          </Text>
          <Text style={styles.noteText}>
            Должны сохраниться жирный, курсив, подчёркивание, зачёркивание, цитата и спойлер.
            Если Telegram сбрасывает какой-то стиль при вставке — это особенность Telegram,
            приложение не ломается.
          </Text>
        </View>

        <BigButton title="COPY TEST" caption="TEST COPIE" onPress={copyTest} />
      </ScrollView>

      <Pressable style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← НАЗАД</Text>
      </Pressable>

      <Toast message={toast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
  },
  subtitle: {
    color: COLORS.textDim,
    fontSize: 10,
    letterSpacing: 4,
    marginTop: 6,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    padding: 14,
    marginBottom: 16,
  },
  noteBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceAlt,
    padding: 14,
    marginBottom: 20,
  },
  noteTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  noteText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    top: 40,
  },
  backText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
