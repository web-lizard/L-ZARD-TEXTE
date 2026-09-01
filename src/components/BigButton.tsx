import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {COLORS} from '../theme';

interface Props {
  title: string;
  caption: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}

export function BigButton({
  title,
  caption,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({pressed}) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
      android_ripple={{color: 'rgba(167,226,46,0.18)'}}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? COLORS.bg : COLORS.accent} />
      ) : (
        <Text style={[styles.title, isPrimary ? styles.titlePrimary : styles.titleGhost]}>
          {title}
        </Text>
      )}
      <Text style={[styles.caption, isPrimary ? styles.captionPrimary : styles.captionGhost]}>
        {caption}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  ghost: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  titlePrimary: {
    color: COLORS.bg,
  },
  titleGhost: {
    color: COLORS.text,
  },
  caption: {
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  captionPrimary: {
    color: COLORS.olive,
  },
  captionGhost: {
    color: COLORS.textDim,
  },
});
