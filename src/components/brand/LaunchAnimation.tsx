import { createThemedStyles } from '../../lib/theme';
import { usePreferences } from '../../stores/preferencesStore';
import { Text } from '../../i18n';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Image, StyleSheet,  View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useReducedMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../lib/theme';

const GREEN = '#058C66';

export function LaunchAnimation({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const progress = useSharedValue(0);
  const systemReduceMotion = useReducedMotion();
  const reduceMotion = usePreferences(s=>s.reduceMotion) || systemReduceMotion;
  const [laidOut, setLaidOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);

  useEffect(() => {
    if (!laidOut || !imageLoaded) return;
    // Hand off from the OS splash only after the animated surface is painted.
    void SplashScreen.hideAsync().catch(() => {});
    progress.value = withTiming(0.78,
      { duration: reduceMotion ? 0 : 1700, easing: Easing.linear },
      finished => { if (finished) runOnJS(setIntroFinished)(true); }
    );
    return () => cancelAnimation(progress);
  }, [laidOut, imageLoaded, reduceMotion, progress]);

  useEffect(() => {
    if (!ready || !introFinished) return;
    progress.value = withTiming(1,
      { duration: reduceMotion ? 0 : 400, easing: Easing.out(Easing.cubic) },
      finished => { if (finished) runOnJS(onFinish)(); }
    );
  }, [ready, introFinished, reduceMotion, onFinish, progress]);

  const backdrop = useAnimatedStyle(() => ({
    opacity: progress.value < 0.78 ? 1 : 1 - (progress.value - 0.78) / 0.22,
  }));

  const ring = useAnimatedStyle(() => {
    const appear = Math.min(progress.value / 0.35, 1);
    const fade = progress.value < 0.7 ? 1 : 1 - (progress.value - 0.7) / 0.2;
    return {
      opacity: appear * 0.45 * Math.max(fade, 0),
      transform: [{ scale: 0.55 + appear * 0.7 }],
    };
  });

  const logo = useAnimatedStyle(() => {
    const appear = Math.min(progress.value / 0.28, 1);
    const eased = 1 - Math.pow(1 - appear, 3);
    const exit = progress.value < 0.78 ? 1 : 1 - (progress.value - 0.78) / 0.22;
    return {
      opacity: eased * Math.max(exit, 0),
      transform: [{ scale: 0.72 + eased * 0.28 }, { translateY: (1 - eased) * 18 }],
    };
  });

  const word = useAnimatedStyle(() => {
    const start = 0.24;
    const appear = Math.min(Math.max(progress.value - start, 0) / 0.22, 1);
    const exit = progress.value < 0.78 ? 1 : 1 - (progress.value - 0.78) / 0.22;
    return {
      opacity: appear * Math.max(exit, 0),
      transform: [{ translateY: (1 - appear) * 14 }],
    };
  });

  const tag = useAnimatedStyle(() => {
    const appear = Math.min(Math.max(progress.value - 0.4, 0) / 0.18, 1);
    const exit = progress.value < 0.78 ? 1 : 1 - (progress.value - 0.78) / 0.22;
    return { opacity: appear * Math.max(exit, 0) };
  });

  return (
    <Animated.View onLayout={() => setLaidOut(true)} style={[styles.screen, backdrop]} accessibilityViewIsModal accessibilityLabel="KingCric">
      <Animated.View style={[styles.ring, ring]} />
      <Animated.View style={logo}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" onLoadEnd={() => setImageLoaded(true)} />
      </Animated.View>
      <Animated.View style={word}>
        <Text style={styles.wordmark}>
          kingcric<Text style={styles.dot}>.</Text>
        </Text>
      </Animated.View>
      <Animated.View style={tag}>
        <View style={styles.rule} />
        <Text style={styles.tagline}>YOUR GROUND. YOUR GAME.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = createThemedStyles({
  screen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  ring: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: colors.lime,
  },
  logo: {
    width: 168,
    height: 168,
  },
  wordmark: {
    marginTop: 22,
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.4,
  },
  dot: { color: colors.lime },
  rule: {
    alignSelf: 'center',
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.lime,
    marginTop: 12,
    marginBottom: 8,
  },
  tagline: {
    color: '#D7EBD9',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
});
