import { useBranding } from '../../stores/brandingStore';
import { createThemedStyles } from '../../lib/theme';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usePreferences } from '../../stores/preferencesStore';
import { colors, radius, shadows } from '../../lib/theme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  delay?: number;
  elevated?: boolean;
}

export function GlassCard({ children, style, delay = 0, elevated = true }: GlassCardProps) {
 useBranding(s=>s.palette);
  const reduceMotion = usePreferences(s=>s.reduceMotion);
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(delay).duration(180)}
      style={[styles.wrapper, elevated && shadows.card, style]}
    >
      <View style={styles.inner}>{children}</View>
    </Animated.View>
  );
}

const styles = createThemedStyles({
  wrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  inner: {
    backgroundColor: colors.card,
    padding: 18,
  },
});
