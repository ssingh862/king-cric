import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import type { BallType } from '../../types/database';
import { colors, radius } from '../../lib/theme';

const RUN_BUTTONS: { label: string; type: BallType; runs?: number }[] = [
  { label: '0', type: 'dot' },
  { label: '1', type: 'one' },
  { label: '2', type: 'two' },
  { label: '3', type: 'three' },
  { label: '4', type: 'four' },
  { label: '6', type: 'six' },
];

const EXTRA_BUTTONS: { label: string; type: BallType }[] = [
  { label: 'Wd', type: 'wide' },
  { label: 'Nb', type: 'no_ball' },
  { label: 'Bye', type: 'bye' },
  { label: 'Lb', type: 'leg_bye' },
];

interface ScoringPadProps {
  onBall: (type: BallType, extras?: { isWicket?: boolean }) => void;
  disabled?: boolean;
}

export function ScoringPad({ onBall, disabled }: ScoringPadProps) {
  const press = (type: BallType, opts?: { isWicket?: boolean }) => {
    Haptics.selectionAsync();
    onBall(type, opts);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {RUN_BUTTONS.map((b) => (
          <Pressable
            key={b.label}
            style={[styles.btn, b.label === '6' && styles.sixBtn, b.label === '4' && styles.fourBtn]}
            onPress={() => press(b.type)}
            disabled={disabled}
          >
            <Text style={styles.btnText}>{b.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        {EXTRA_BUTTONS.map((b) => (
          <Pressable
            key={b.label}
            style={[styles.btn, styles.extraBtn]}
            onPress={() => press(b.type)}
            disabled={disabled}
          >
            <Text style={styles.extraText}>{b.label}</Text>
          </Pressable>
        ))}
        <Pressable
          style={[styles.btn, styles.wicketBtn]}
          onPress={() => press('wicket', { isWicket: true })}
          disabled={disabled}
        >
          <Text style={styles.wicketText}>OUT</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn: {
    flex: 1,
    minWidth: 48,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  fourBtn: { borderColor: colors.blue },
  sixBtn: { borderColor: colors.orange, backgroundColor: 'rgba(255,107,0,0.15)' },
  extraBtn: { backgroundColor: 'rgba(123,44,191,0.2)' },
  wicketBtn: {
    flex: 1.5,
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderColor: colors.live,
  },
  btnText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  extraText: { color: colors.purple, fontSize: 14, fontWeight: '600' },
  wicketText: { color: colors.live, fontSize: 14, fontWeight: '800' },
});
