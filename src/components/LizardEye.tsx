import React from 'react';
import {StyleSheet, View} from 'react-native';
import {COLORS} from '../theme';

interface Props {
  size?: number;
  color?: string;
}

/** Вертикальный глаз ящера — главный символ приложения. */
export function LizardEye({size = 44, color = COLORS.accent}: Props) {
  const w = size;
  const h = size * 1.12;
  const pupilW = size * 0.2;
  const pupilH = size * 0.5;
  return (
    <View
      style={[
        styles.eye,
        {width: w, height: h, borderRadius: h / 2, borderColor: color},
      ]}>
      <View
        style={[
          styles.pupil,
          {
            width: pupilW,
            height: pupilH,
            borderRadius: pupilW / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  eye: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.black,
    overflow: 'hidden',
  },
  pupil: {
    position: 'absolute',
  },
});
