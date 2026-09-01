import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {COLORS} from '../theme';
import {LizardEye} from './LizardEye';

interface Props {
  small?: boolean;
}

export function Logo({small = false}: Props) {
  if (small) {
    return (
      <View style={[styles.row, styles.smallRow]}>
        <LizardEye size={26} />
        <View>
          <Text style={styles.smallTitle}>LÉZARD TEXTE</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <LizardEye size={54} />
      <Text style={styles.title}>LÉZARD TEXTE</Text>
      <Text style={styles.subtitle}>ÉDITEUR TELEGRAM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallRow: {
    justifyContent: 'flex-start',
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 10,
  },
  smallTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 4,
    marginTop: 6,
    textTransform: 'uppercase',
  },
});
