import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, StatusBar, Text, View} from 'react-native';
import {COLORS} from './src/theme';
import {LizardEye} from './src/components/LizardEye';
import {MainScreen} from './src/screens/MainScreen';
import {TestTelegramScreen} from './src/screens/TestTelegramScreen';
import {loadCurrent} from './src/storage/history';
import type {Document} from './src/types';

function Splash() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 350, useNativeDriver: true}),
      Animated.spring(scale, {toValue: 1, friction: 7, useNativeDriver: true}),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={styles.splash}>
      <Animated.View style={{opacity, transform: [{scale}]}}>
        <LizardEye size={72} />
      </Animated.View>
      <Animated.Text style={[styles.splashTitle, {opacity}]}>LÉZARD</Animated.Text>
      <Text style={[styles.splashTitle, styles.splashTitle2]}>TEXTE</Text>
      <Text style={styles.splashSub}>ÉDITEUR</Text>
    </View>
  );
}

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<'main' | 'test'>('main');
  const [initialDoc, setInitialDoc] = useState<Document | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadCurrent()
      .then(doc => {
        if (mounted) {
          setInitialDoc(doc);
        }
      })
      .finally(() => {
        if (mounted) {
          setReady(true);
        }
      });
    const t = setTimeout(() => {
      if (mounted) {
        setReady(true);
      }
    }, 1400);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} translucent={false} />
      {ready ? (
        screen === 'main' ? (
          <MainScreen initialDoc={initialDoc} onOpenTest={() => setScreen('test')} />
        ) : (
          <TestTelegramScreen onBack={() => setScreen('main')} />
        )
      ) : (
        <Splash />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  splash: {
    flex: 1,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 6,
    marginTop: 24,
  },
  splashTitle2: {
    marginTop: 4,
  },
  splashSub: {
    color: COLORS.textDim,
    fontSize: 11,
    letterSpacing: 8,
    marginTop: 20,
    textTransform: 'uppercase',
  },
});

export default App;
