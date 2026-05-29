import * as React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Player } from '../../types/database';
import type { WicketTypeInput } from '../../lib/cricket/types';
import { colors, radius } from '../../lib/theme';

const WICKET_TYPES: {
  type: WicketTypeInput;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bowlerCredit: boolean;
}[] = [
  { type: 'bowled', label: 'Bowled', icon: 'radio-button-on', bowlerCredit: true },
  { type: 'caught', label: 'Caught', icon: 'hand-left', bowlerCredit: true },
  { type: 'lbw', label: 'LBW', icon: 'body', bowlerCredit: true },
  { type: 'stumped', label: 'Stumped', icon: 'flash', bowlerCredit: true },
  { type: 'hit_wicket', label: 'Hit wicket', icon: 'warning', bowlerCredit: true },
  { type: 'run_out', label: 'Run out', icon: 'walk', bowlerCredit: false },
  { type: 'retired_hurt', label: 'Retired', icon: 'medkit-outline', bowlerCredit: false },
  { type: 'other', label: 'Other', icon: 'ellipsis-horizontal', bowlerCredit: false },
];

export interface WicketSelection {
  wicketType: WicketTypeInput;
  dismissedPlayerId: string;
}

interface WicketPickerModalProps {
  visible: boolean;
  striker: Player | null;
  nonStriker: Player | null;
  onConfirm: (selection: WicketSelection) => void;
  onClose: () => void;
}

export function WicketPickerModal({
  visible,
  striker,
  nonStriker,
  onConfirm,
  onClose,
}: WicketPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [wicketType, setWicketType] = React.useState<WicketTypeInput | null>(null);
  const [dismissedId, setDismissedId] = React.useState<string | null>(null);

  const needsDismissedPick = wicketType === 'run_out' || wicketType === 'retired_hurt';

  React.useEffect(() => {
    if (!visible) {
      setWicketType(null);
      setDismissedId(null);
    }
  }, [visible]);

  const handleClose = () => {
    setWicketType(null);
    setDismissedId(null);
    onClose();
  };

  const confirm = () => {
    if (!wicketType) return;
    const outId =
      dismissedId ??
      (wicketType === 'run_out' ? null : striker?.id) ??
      striker?.id;
    if (!outId) return;
    onConfirm({ wicketType, dismissedPlayerId: outId });
    setWicketType(null);
    setDismissedId(null);
  };

  if (!visible) return null;

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <LinearGradient colors={['#4a0e1a', '#1a0810']} style={styles.headerGrad}>
            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <Ionicons name="close-circle" size={28} color="#fff" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Wicket</Text>
                <Text style={styles.subtitle}>How did the batter get out?</Text>
              </View>
              <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {WICKET_TYPES.map((w) => {
                const selected = wicketType === w.type;
                return (
                  <Pressable
                    key={w.type}
                    style={[styles.gridItem, selected && styles.gridItemOn]}
                    onPress={() => {
                      setWicketType(w.type);
                      if (w.type !== 'run_out' && w.type !== 'retired_hurt') {
                        setDismissedId(striker?.id ?? null);
                      } else {
                        setDismissedId(null);
                      }
                    }}
                  >
                    <Ionicons
                      name={w.icon}
                      size={22}
                      color={selected ? colors.orange : colors.textMuted}
                    />
                    <Text style={[styles.gridLabel, selected && styles.gridLabelOn]}>
                      {w.label}
                    </Text>
                    {!w.bowlerCredit && (
                      <Text style={styles.gridHint}>No bowler wicket</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {needsDismissedPick && wicketType && (
              <View style={styles.whoBlock}>
                <Text style={styles.whoTitle}>Which batter is out?</Text>
                <View style={styles.whoRow}>
                  {[striker, nonStriker].filter(Boolean).map((p) => {
                    const sel = dismissedId === p!.id;
                    return (
                      <Pressable
                        key={p!.id}
                        style={[styles.whoChip, sel && styles.whoChipOn]}
                        onPress={() => setDismissedId(p!.id)}
                      >
                        <Text style={[styles.whoName, sel && styles.whoNameOn]}>
                          {p!.full_name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.confirmBtn,
                (!wicketType || (needsDismissedPick && !dismissedId)) && styles.confirmOff,
              ]}
              onPress={confirm}
              disabled={!wicketType || (needsDismissedPick && !dismissedId)}
            >
              <Text style={styles.confirmText}>Confirm OUT</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  headerGrad: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.live,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 2 },
  closeBtn: { padding: 4 },
  scroll: { maxHeight: 400 },
  scrollContent: { padding: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48%',
    minWidth: '47%',
    flexGrow: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    gap: 6,
  },
  gridItemOn: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(255,107,0,0.15)',
  },
  gridLabel: { color: colors.text, fontWeight: '700', fontSize: 14 },
  gridLabelOn: { color: colors.orange },
  gridHint: { color: colors.textDim, fontSize: 10, textAlign: 'center' },
  whoBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  whoTitle: { color: colors.text, fontWeight: '700', marginBottom: 10, fontSize: 15 },
  whoRow: { flexDirection: 'row', gap: 10 },
  whoChip: {
    flex: 1,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  whoChipOn: { borderColor: colors.orange, backgroundColor: 'rgba(255,107,0,0.15)' },
  whoName: { color: colors.text, fontWeight: '600', fontSize: 15 },
  whoNameOn: { color: colors.orange, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelText: { color: colors.textMuted, fontWeight: '700' },
  confirmBtn: {
    flex: 2,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.live,
  },
  confirmOff: { opacity: 0.4 },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
