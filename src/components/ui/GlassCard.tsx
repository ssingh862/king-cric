import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, radius, shadows } from '../../lib/theme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  delay?: number;
  elevated?: boolean;
}

export function GlassCard({ children, style, delay = 0, elevated = true }: GlassCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={[styles.wrapper, elevated && shadows.card, style]}
    >
      <View style={styles.inner}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  inner: {
    backgroundColor: colors.card,
    padding: 16,
  },
});
