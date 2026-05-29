import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, radius } from '../../lib/theme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  delay?: number;
  intensity?: number;
}

export function GlassCard({ children, style, delay = 0, intensity = 40 }: GlassCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={[styles.wrapper, style]}
    >
      <BlurView intensity={intensity} tint="dark" style={styles.blur}>
        <View style={styles.inner}>{children}</View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    backgroundColor: colors.card,
    padding: 16,
  },
});
