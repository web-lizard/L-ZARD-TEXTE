import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {COLORS} from '../theme';
import type {StyleKey} from '../types';

const STYLES: {key: StyleKey; label: string; caption: string}[] = [
  {key: 'minimal', label: 'MINIMAL', caption: 'минимум'},
  {key: 'classique', label: 'CLASSIQUE', caption: 'обычный'},
  {key: 'accent', label: 'ACCENT', caption: 'акцент'},
  {key: 'brutal', label: 'BRUTAL', caption: 'выразительно'},
];

interface Props {
  value: StyleKey;
  onChange: (style: StyleKey) => void;
}

export function StyleSwitcher({value, onChange}: Props) {
  return (
    <View style={styles.row}>
      {STYLES.map(s => {
        const active = s.key === value;
        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            style={[styles.chip, active && styles.chipActive]}
            android_ripple={{color: 'rgba(167,226,46,0.15)'}}>
            <Text style={[styles.label, active && styles.labelActive]}>{s.label}</Text>
            <Text style={[styles.caption, active && styles.captionActive]}>{s.caption}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.oliveDark,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  labelActive: {
    color: COLORS.accent,
  },
  caption: {
    color: COLORS.textDim,
    fontSize: 9,
    marginTop: 2,
  },
  captionActive: {
    color: COLORS.textMuted,
  },
});
