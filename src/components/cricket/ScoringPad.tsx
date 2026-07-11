import * as Haptics from "expo-haptics";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native";
import type { BallType } from "../../types/database";
import { colors, radius, shadows } from "../../lib/theme";

const RUN_BUTTONS: { label: string; type: BallType }[] = [
  { label: "0", type: "dot" },
  { label: "1", type: "one" },
  { label: "2", type: "two" },
  { label: "3", type: "three" },
  { label: "4", type: "four" },
  { label: "6", type: "six" },
];

const EXTRA_BUTTONS: { label: string; type: BallType }[] = [
  { label: "Wd", type: "wide" },
  { label: "Nb", type: "no_ball" },
  { label: "Bye", type: "bye" },
  { label: "Lb", type: "leg_bye" },
];

const ALL_SELECTABLE = [...RUN_BUTTONS, ...EXTRA_BUTTONS];

interface ScoringPadProps {
  onBall: (type: BallType, extras?: { isWicket?: boolean }) => void;
  disabled?: boolean;
}

export function ScoringPad({ onBall, disabled }: ScoringPadProps) {
  const [selected, setSelected] = useState<BallType | null>(null);

  const toggleSelect = (type: BallType) => {
    if (disabled) return;
    Haptics.selectionAsync();
    setSelected((prev) => (prev === type ? null : type));
  };

  const confirm = () => {
    if (!selected || disabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onBall(selected);
    setSelected(null);
  };

  const pressWicket = () => {
    if (disabled) return;
    Haptics.selectionAsync();
    setSelected(null);
    onBall("wicket", { isWicket: true });
  };

  const selectedLabel = ALL_SELECTABLE.find((b) => b.type === selected)?.label;
  const confirmDisabled = disabled || !selected;

  return (
    <View style={[styles.container, shadows.card]}>
      <Text style={styles.label}>
        {disabled ? "Updating scoreboard…" : "Record ball"}
      </Text>

      <View style={styles.row}>
        {RUN_BUTTONS.map((b) => {
          const isSelected = selected === b.type;
          return (
            <Pressable
              key={b.label}
              style={[
                styles.btn,
                b.label === "6" && styles.sixBtn,
                b.label === "4" && styles.fourBtn,
                isSelected && styles.selectedBtn,
                disabled && styles.btnDisabled,
              ]}
              onPress={() => toggleSelect(b.type)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.btnText,
                  b.label === "6" && styles.sixText,
                  isSelected && styles.selectedText,
                  disabled && styles.textDisabled,
                ]}
              >
                {b.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        {EXTRA_BUTTONS.map((b) => {
          const isSelected = selected === b.type;
          return (
            <Pressable
              key={b.label}
              style={[
                styles.btn,
                styles.extraBtn,
                isSelected && styles.selectedBtn,
                disabled && styles.btnDisabled,
              ]}
              onPress={() => toggleSelect(b.type)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.extraText,
                  isSelected && styles.selectedText,
                  disabled && styles.textDisabled,
                ]}
              >
                {b.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.btn, styles.wicketBtn, disabled && styles.btnDisabled]}
          onPress={pressWicket}
          disabled={disabled}
        >
          <Text style={[styles.wicketText, disabled && styles.textDisabled]}>
            OUT
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.confirmBtn,
          confirmDisabled && styles.confirmBtnDisabled,
        ]}
        onPress={confirm}
        disabled={confirmDisabled}
      >
        <Text
          style={[
            styles.confirmText,
            confirmDisabled && styles.confirmTextDisabled,
          ]}
        >
          {disabled
            ? "Please wait…"
            : selectedLabel
              ? `Confirm ${selectedLabel}`
              : "Select a ball outcome"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  btn: {
    flex: 1,
    minWidth: 48,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  fourBtn: { borderColor: colors.blue, backgroundColor: "#EFF6FF" },
  sixBtn: { borderColor: colors.orange, backgroundColor: colors.orangeLight },
  extraBtn: { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" },
  wicketBtn: {
    flex: 1.5,
    backgroundColor: colors.liveLight,
    borderColor: colors.live,
  },
  selectedBtn: {
    borderWidth: 2,
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  btnDisabled: {
    opacity: 0.35,
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
  },
  btnText: { color: colors.text, fontSize: 18, fontWeight: "800" },
  sixText: { color: colors.orange },
  extraText: { color: colors.purple, fontSize: 14, fontWeight: "700" },
  wicketText: { color: colors.live, fontSize: 14, fontWeight: "800" },
  selectedText: { color: colors.orange },
  textDisabled: { color: colors.textMuted },
  confirmBtn: {
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.orange,
  },
  confirmBtnDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    opacity: 0.6,
  },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  confirmTextDisabled: { color: colors.textMuted },
});
