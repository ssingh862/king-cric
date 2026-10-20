import { useBranding } from '../../stores/brandingStore';
import { createThemedStyles } from '../../lib/theme';
import { Text } from '../../i18n';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,

  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radius, shadows } from '../../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
  style?: ViewStyle;
}

export function GradientButton({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: GradientButtonProps) {
 useBranding(s=>s.palette);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  if (variant === 'outline') {
    return (
      <AnimatedPressable
        onPressIn={() => { scale.value = withSpring(0.985); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={handlePress}
        disabled={disabled || loading}
        accessibilityRole="button" accessibilityState={{disabled:!!(disabled || loading),busy:!!loading}}
        style={[styles.outline, animStyle, style, (disabled || loading) && {opacity:0.5}]}
      >
        {loading ? (
          <ActivityIndicator color={colors.orange} />
        ) : (
          <Text style={styles.outlineText}>{title}</Text>
        )}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.985); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button" accessibilityState={{disabled:!!(disabled || loading),busy:!!loading}}
      style={[animStyle, style, (disabled || loading) && {opacity:0.5}]}
    >
      <LinearGradient
        colors={[colors.orange, colors.orangeDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, shadows.button]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = createThemedStyles({
  gradient: {
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
  },
  outline: {
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.orange,
    alignItems: 'center',
  },
  outlineText: {
    color: colors.orange,
    fontSize: 15,
    fontWeight: '600',
  },
});
