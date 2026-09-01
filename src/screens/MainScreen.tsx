import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {COLORS} from '../theme';
import {Logo} from '../components/Logo';
import {StyleSwitcher} from '../components/StyleSwitcher';
import {BigButton} from '../components/BigButton';
import {FormatBar} from '../components/FormatBar';
import {Toast} from '../components/Toast';
import {WysiwygText} from '../editor/WysiwygText';
import type {Document, FormatType, HistoryRecord} from '../types';
import {useDocument} from '../hooks/useDocument';
import {AiError, requestFormatting} from '../services/ai';
import {
  aiEntitiesToRanges,
  getActiveStyles,
  removeFormat,
  toggleFormat,
} from '../services/formatter';
import {toClipboardHtml, toMarkdownV2, toTelegramHtml} from '../services/telegramExport';
import {copyRich, copyText} from '../services/clipboard';
import {loadHistory, MAX_HISTORY, pushHistory, removeFromHistory} from '../storage/history';
import {countSymbols} from '../utils/text';

interface Props {
  initialDoc: Document | null;
  onOpenTest: () => void;
}

function snapSelectionToLines(text: string, start: number, end: number): {start: number; end: number} {
  const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextNl = text.indexOf('\n', end);
  const lineEnd = nextNl === -1 ? text.length : nextNl;
  return {start: lineStart, end: lineEnd};
}

export function MainScreen({initialDoc, onOpenTest}: Props) {
  const {
    doc,
    setText,
    setEntities,
    setStyle,
    undo,
    redo,
    loadDocument,
    clearDocument,
  } = useDocument(initialDoc);

  const [mode, setMode] = useState<'edit' | 'format'>('edit');
  const [selection, setSelection] = useState({start: 0, end: 0});
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const showToast = useCallback((m: string) => setToast(m), []);

  const hasSelection = selection.end > selection.start;
  const activeStyles = useMemo(
    () => getActiveStyles(doc.entities, selection.start, selection.end),
    [doc.entities, selection.start, selection.end],
  );
  const symbols = countSymbols(doc.text);

  const openHistory = useCallback(async () => {
    setHistory(await loadHistory());
    setHistoryOpen(true);
  }, []);

  const applyToggle = useCallback(
    (type: FormatType) => {
      if (!hasSelection) {
        return;
      }
      let start = selection.start;
      let end = selection.end;
      if (type === 'blockquote') {
        const snapped = snapSelectionToLines(doc.text, start, end);
        start = snapped.start;
        end = snapped.end;
      }
      setEntities(toggleFormat(doc.entities, start, end, type));
    },
    [hasSelection, selection.start, selection.end, doc.text, doc.entities, setEntities],
  );

  const applyQuote = useCallback(() => applyToggle('blockquote'), [applyToggle]);
  const applySpoiler = useCallback(() => applyToggle('spoiler'), [applyToggle]);

  const applyReset = useCallback(() => {
    if (!hasSelection) {
      return;
    }
    setEntities(removeFormat(doc.entities, selection.start, selection.end));
  }, [hasSelection, selection.start, selection.end, doc.entities, setEntities]);

  const runAi = useCallback(async () => {
    if (!doc.text.trim()) {
      showToast('Нечего оформлять. Вставь текст.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await requestFormatting(doc.text, doc.style);
      const ranges = aiEntitiesToRanges(doc.text, res.entities);
      if (ranges.length === 0) {
        showToast('AI не нашёл фрагменты для оформления.');
      } else {
        setEntities(ranges);
        showToast(`Оформлено: ${ranges.length} фрагмент(ов)`);
      }
    } catch (err) {
      const msg = err instanceof AiError ? err.userMessage : 'Не удалось оформить текст.';
      showToast(msg);
    } finally {
      setAiLoading(false);
    }
  }, [doc.text, doc.style, setEntities, showToast]);

  const copyTelegram = useCallback(async () => {
    if (!doc.text) {
      showToast('Нечего копировать.');
      return;
    }
    const html = toClipboardHtml(doc.text, doc.entities);
    try {
      await copyRich(html, doc.text);
      showToast('Скопировано. Вставь в Telegram.');
      void pushHistory(doc);
    } catch {
      showToast('Не удалось скопировать.');
    }
  }, [doc, showToast]);

  const copyHtml = useCallback(async () => {
    try {
      await copyText(toTelegramHtml(doc.text, doc.entities));
      showToast('HTML скопирован.');
    } catch {
      showToast('Не удалось скопировать.');
    }
  }, [doc.text, doc.entities, showToast]);

  const copyMarkdown = useCallback(async () => {
    try {
      await copyText(toMarkdownV2(doc.text, doc.entities));
      showToast('MarkdownV2 скопирован.');
    } catch {
      showToast('Не удалось скопировать.');
    }
  }, [doc.text, doc.entities, showToast]);

  const resetFormatting = useCallback(() => {
    if (doc.entities.length === 0) {
      return;
    }
    setEntities([]);
    showToast('Разметка сброшена.');
  }, [doc.entities.length, setEntities, showToast]);

  const confirmClear = useCallback(() => {
    if (!doc.text) {
      return;
    }
    Alert.alert('ОЧИСТИТЬ', 'Удалить весь документ?', [
      {text: 'Отмена', style: 'cancel'},
      {text: 'Удалить', style: 'destructive', onPress: clearDocument},
    ]);
  }, [doc.text, clearDocument]);
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.header}>
          <Logo small />
          <View style={styles.headerActions}>
            <Pressable onPress={undo} style={styles.iconBtn} android_ripple={{color: 'rgba(255,255,255,0.08)'}}>
              <Text style={styles.iconText}>↩</Text>
            </Pressable>
            <Pressable onPress={redo} style={styles.iconBtn} android_ripple={{color: 'rgba(255,255,255,0.08)'}}>
              <Text style={styles.iconText}>↪</Text>
            </Pressable>
            <Pressable onPress={openHistory} style={styles.iconBtn} android_ripple={{color: 'rgba(255,255,255,0.08)'}}>
              <Text style={styles.iconText}>▤</Text>
            </Pressable>
            <Pressable onPress={onOpenTest} style={styles.iconBtn} android_ripple={{color: 'rgba(255,255,255,0.08)'}}>
              <Text style={styles.iconText}>⌘</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.modeTabs}>
          {(['edit', 'format'] as const).map(m => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}>
              <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
                {m === 'edit' ? 'ТЕКСТ' : 'ФОРМАТ'}
              </Text>
              <Text style={styles.modeTabCaption}>{m === 'edit' ? 'TEXTE' : 'VUE'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.editorBox}>
          {mode === 'edit' ? (
            <TextInput
              ref={inputRef}
              style={styles.editorInput}
              multiline
              value={doc.text}
              onChangeText={setText}
              placeholder="Вставь текст сюда..."
              placeholderTextColor={COLORS.textDim}
              selection={selection}
              onSelectionChange={e =>
                setSelection({
                  start: e.nativeEvent.selection.start,
                  end: e.nativeEvent.selection.end,
                })
              }
              onFocus={() => setSelection({start: 0, end: 0})}
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
            />
          ) : (
            <ScrollView style={styles.previewBox} nestedScrollEnabled>
              <WysiwygText text={doc.text} entities={doc.entities} />
            </ScrollView>
          )}
        </View>

        <Text style={styles.counter}>{symbols} символа</Text>

        <Text style={styles.sectionLabel}>
          STYLE <Text style={styles.sectionLabelRu}>— режим</Text>
        </Text>
        <StyleSwitcher value={doc.style} onChange={setStyle} />

        <View style={styles.spacer} />

        <BigButton
          title={aiLoading ? 'Оформляем текст...' : 'ОФОРМИТЬ'}
          caption={aiLoading ? 'IA' : 'STYLE IA'}
          onPress={runAi}
          loading={aiLoading}
          disabled={!doc.text.trim()}
        />

        <View style={styles.spacer} />

        <FormatBar
          active={activeStyles}
          hasSelection={hasSelection}
          onToggle={applyToggle}
          onQuote={applyQuote}
          onSpoiler={applySpoiler}
          onReset={applyReset}
        />

        <View style={styles.spacer} />

        <BigButton title="КОПИРОВАТЬ" caption="COPIE" onPress={copyTelegram} disabled={!doc.text} />

        <View style={styles.exportRow}>
          <Pressable onPress={() => setExportOpen(v => !v)} style={styles.exportToggle}>
            <Text style={styles.exportToggleText}>EXPORT ▾</Text>
          </Pressable>
        </View>
        {exportOpen && (
          <View style={styles.exportMenu}>
            <Pressable style={styles.exportItem} onPress={copyTelegram}>
              <Text style={styles.exportItemTitle}>TELEGRAM</Text>
              <Text style={styles.exportItemCaption}>rich clipboard</Text>
            </Pressable>
            <Pressable style={styles.exportItem} onPress={copyHtml}>
              <Text style={styles.exportItemTitle}>HTML</Text>
              <Text style={styles.exportItemCaption}>разметка</Text>
            </Pressable>
            <Pressable style={styles.exportItem} onPress={copyMarkdown}>
              <Text style={styles.exportItemTitle}>MD</Text>
              <Text style={styles.exportItemCaption}>MarkdownV2</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.footerRow}>
          <Pressable onPress={resetFormatting} style={styles.footerBtn} android_ripple={{color: 'rgba(167,226,46,0.1)'}}>
            <Text style={styles.footerBtnTitle}>СБРОС</Text>
            <Text style={styles.footerBtnCaption}>RESET</Text>
          </Pressable>
          <Pressable onPress={confirmClear} style={styles.footerBtn} android_ripple={{color: 'rgba(226,99,92,0.12)'}}>
            <Text style={[styles.footerBtnTitle, {color: COLORS.danger}]}>ОЧИСТИТЬ</Text>
            <Text style={styles.footerBtnCaption}>VIDER</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Toast message={toast} />

      <HistoryModal
        visible={historyOpen}
        records={history}
        onClose={() => setHistoryOpen(false)}
        onLoad={r => {
          loadDocument(r.document);
          setHistoryOpen(false);
          setMode('edit');
        }}
        onRemove={async id => setHistory(await removeFromHistory(id))}
      />
    </View>
  );
}

function HistoryModal({
  visible,
  records,
  onClose,
  onLoad,
  onRemove,
}: {
  visible: boolean;
  records: HistoryRecord[];
  onClose: () => void;
  onLoad: (r: HistoryRecord) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>ИСТОРИЯ</Text>
          <Text style={styles.modalSubtitle}>ARCHIVE — последние {MAX_HISTORY}</Text>
          <ScrollView style={styles.modalList}>
            {records.length === 0 && (
              <Text style={styles.modalEmpty}>
                Пока пусто. Скопируй первый пост — он появится здесь.
              </Text>
            )}
            {records.map(r => (
              <Pressable key={r.id} style={styles.historyItem} onPress={() => onLoad(r)}>
                <Text style={styles.historyPreview} numberOfLines={2}>
                  {r.preview || '— пустой документ —'}
                </Text>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyMetaText}>{r.style.toUpperCase()}</Text>
                  <Text style={styles.historyMetaText}>{r.entitiesCount} ent</Text>
                  <Text style={styles.historyMetaText}>
                    {new Date(r.createdAt).toLocaleString('ru-RU')}
                  </Text>
                </View>
                <Pressable style={styles.historyDel} onPress={() => onRemove(r.id)} hitSlop={10}>
                  <Text style={styles.historyDelText}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>ЗАКРЫТЬ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: COLORS.textMuted,
    fontSize: 18,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  modeTab: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  modeTabActive: {
    borderColor: COLORS.accent,
  },
  modeTabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  modeTabTextActive: {
    color: COLORS.accent,
  },
  modeTabCaption: {
    color: COLORS.textDim,
    fontSize: 9,
    marginTop: 2,
  },
  editorBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    minHeight: 220,
    maxHeight: 320,
  },
  editorInput: {
    color: COLORS.text,
    fontSize: 17,
    lineHeight: 25,
    minHeight: 220,
    padding: 12,
    flexGrow: 1,
  },
  previewBox: {
    padding: 12,
  },
  counter: {
    marginTop: 8,
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'right',
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 8,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
  },
  sectionLabelRu: {
    color: COLORS.textDim,
    fontWeight: '400',
    letterSpacing: 0,
  },
  spacer: {
    height: 16,
  },
  exportRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  exportToggle: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exportToggleText: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 2,
  },
  exportMenu: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  exportItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exportItemTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
  exportItemCaption: {
    color: COLORS.textDim,
    fontSize: 10,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  footerBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerBtnTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  footerBtnCaption: {
    color: COLORS.textDim,
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,9,7,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  modalSubtitle: {
    color: COLORS.textDim,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 12,
  },
  modalList: {
    flexGrow: 0,
  },
  modalEmpty: {
    color: COLORS.textDim,
    fontSize: 13,
    paddingVertical: 16,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    marginBottom: 10,
  },
  historyPreview: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  historyMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  historyMetaText: {
    color: COLORS.textDim,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  historyDel: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  historyDelText: {
    color: COLORS.danger,
    fontSize: 14,
  },
  modalClose: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
