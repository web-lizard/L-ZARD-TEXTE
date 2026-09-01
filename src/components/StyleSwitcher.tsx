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
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
            android_ripple={{color: 'rgba(167,226,46,0.2)'}}>
            <View style={styles.dotRow}>
              <View style={[styles.dot, active ? styles.dotActive : styles.dotIdle]} />
              <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>
                {s.label}
              </Text>
            </View>
            <Text style={[styles.caption, active ? styles.captionActive : styles.captionIdle]}>
              {s.caption}
            </Text>
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
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 2,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    elevation: 4,
  },
  chipIdle: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: COLORS.bg,
  },
  dotIdle: {
    backgroundColor: COLORS.textDim,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  labelActive: {
    color: COLORS.bg,
  },
  labelIdle: {
    color: COLORS.textMuted,
  },
  caption: {
    fontSize: 9,
    marginTop: 4,
  },
  captionActive: {
    color: COLORS.oliveDark,
    fontWeight: '700',
  },
  captionIdle: {
    color: COLORS.textDim,
  },
});
