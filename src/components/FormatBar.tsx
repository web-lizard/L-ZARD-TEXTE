import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {COLORS} from '../theme';
import type {FormatType} from '../types';

interface FormatButtonProps {
  symbol: string;
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FormatButton({symbol, label, active, onPress}: FormatButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.btn, active && styles.btnActive]}
      android_ripple={{color: 'rgba(167,226,46,0.15)'}}>
      <Text style={[styles.symbol, active && styles.symbolActive]}>{symbol}</Text>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const STYLE_ORDER: {type: FormatType; symbol: string; label: string}[] = [
  {type: 'bold', symbol: 'B', label: 'жирный'},
  {type: 'italic', symbol: 'I', label: 'курсив'},
  {type: 'underline', symbol: 'U', label: 'подчёрк.'},
  {type: 'strikethrough', symbol: 'S', label: 'зачёрк.'},
];

interface Props {
  active: FormatType[];
  hasSelection: boolean;
  onToggle: (type: FormatType) => void;
  onQuote: () => void;
  onSpoiler: () => void;
  onReset: () => void;
}

export function FormatBar({
  active,
  hasSelection,
  onToggle,
  onQuote,
  onSpoiler,
  onReset,
}: Props) {
  const enabled = hasSelection;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {STYLE_ORDER.map(s => (
          <FormatButton
            key={s.type}
            symbol={s.symbol}
            label={s.label}
            active={active.includes(s.type)}
            onPress={() => enabled && onToggle(s.type)}
          />
        ))}
        <FormatButton
          symbol="❝"
          label="цитата"
          active={active.includes('blockquote')}
          onPress={() => enabled && onQuote()}
        />
        <FormatButton
          symbol="◉"
          label="спойлер"
          active={active.includes('spoiler')}
          onPress={() => enabled && onSpoiler()}
        />
      </View>
      <Pressable
        onPress={() => enabled && onReset()}
        style={[styles.reset, !enabled && styles.resetDisabled]}
        android_ripple={{color: 'rgba(226,99,92,0.15)'}}>
        <Text style={[styles.resetText, !enabled && styles.resetTextDisabled]}>СБРОСИТЬ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.oliveDark,
  },
  symbol: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  symbolActive: {
    color: COLORS.accent,
  },
  label: {
    color: COLORS.textDim,
    fontSize: 9,
    marginTop: 2,
  },
  labelActive: {
    color: COLORS.textMuted,
  },
  reset: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resetDisabled: {
    opacity: 0.4,
  },
  resetText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resetTextDisabled: {
    color: COLORS.textDim,
  },
});
