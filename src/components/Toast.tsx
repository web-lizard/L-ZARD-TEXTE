import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text} from 'react-native';
import {COLORS} from '../theme';

interface Props {
  message: string | null;
}

export function Toast({message}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) {
      return;
    }
    Animated.timing(opacity, {toValue: 1, duration: 150, useNativeDriver: true}).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, {toValue: 0, duration: 250, useNativeDriver: true}).start();
    }, 1800);
    return () => clearTimeout(t);
  }, [message, opacity]);

  if (!message) {
    return null;
  }
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, {opacity}]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  text: {
    color: COLORS.text,
    fontSize: 14,
    textAlign: 'center',
  },
});
