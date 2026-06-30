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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Player } from '../../types/database';
import { colors, radius, shadows } from '../../lib/theme';

export type PickerRole = 'striker' | 'non_striker' | 'bowler';

interface PlayerPickerModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  players: Player[];
  selectedId?: string | null;
  disabledIds?: string[];
  onSelect: (player: Player) => void;
  onClose?: () => void;
  required?: boolean;
}

export function PlayerPickerModal({
  visible,
  title,
  subtitle,
  icon = 'person',
  players,
  selectedId,
  disabledIds = [],
  onSelect,
  onClose,
  required,
}: PlayerPickerModalProps) {
  const insets = useSafeAreaInsets();

  const handleSelect = (p: Player) => {
    if (disabledIds.includes(p.id)) return;
    onSelect(p);
    if (!required) onClose?.();
  };

  if (!visible) return null;

  const available = players.filter((p) => !disabledIds.includes(p.id) || p.id === selectedId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={required ? undefined : onClose}
    >
      <Pressable style={styles.overlay} onPress={required ? undefined : onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }, shadows.cardLg]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name={icon} size={22} color={colors.orange} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {!required && onClose ? (
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.count}>
            {available.length} player{available.length !== 1 ? 's' : ''} — tap to select
          </Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {available.length === 0 ? (
              <Text style={styles.empty}>No players available. Add squad members to the team first.</Text>
            ) : (
              available.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  selected={selectedId === p.id}
                  disabled={disabledIds.includes(p.id) && selectedId !== p.id}
                  onPress={() => handleSelect(p)}
                />
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PlayerCard({
  player,
  selected,
  disabled,
  onPress,
}: {
  player: Player;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const initial = player.full_name.charAt(0).toUpperCase();

  return (
    <Pressable
      style={[
        styles.card,
        selected && styles.cardOn,
        disabled && styles.cardDisabled,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      {player.jersey_number != null ? (
        <View style={[styles.jerseyBadge, selected && styles.jerseyBadgeOn]}>
          <Text style={[styles.jerseyBadgeText, selected && styles.jerseyBadgeTextOn]}>
            {player.jersey_number}
          </Text>
        </View>
      ) : null}

      <View style={[styles.avatar, selected && styles.avatarOn]}>
        <Text style={[styles.avatarText, selected && styles.avatarTextOn]}>{initial}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text
          style={[styles.name, selected && styles.nameOn, disabled && styles.nameDisabled]}
          numberOfLines={1}
        >
          {player.full_name}
        </Text>
        {disabled ? (
          <Text style={styles.taken}>Already selected</Text>
        ) : player.jersey_number != null ? (
          <Text style={styles.jerseyLabel}>Jersey #{player.jersey_number}</Text>
        ) : null}
      </View>

      {selected ? (
        <Ionicons name="checkmark-circle" size={26} color={colors.orange} />
      ) : disabled ? (
        <Ionicons name="lock-closed" size={20} color={colors.textDim} />
      ) : (
        <View style={styles.radio} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    ...Platform.select({ android: { elevation: 24 }, ios: {} }),
  },
  sheet: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderBottomWidth: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  count: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 24, fontSize: 14 },
  list: { maxHeight: 440 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingTop: 16,
    borderRadius: radius.lg,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    gap: 12,
    position: 'relative',
    overflow: 'visible',
  },
  cardOn: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  cardDisabled: {
    opacity: 0.55,
    backgroundColor: colors.surface,
  },
  jerseyBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    minWidth: 28,
    height: 22,
    paddingHorizontal: 6,
    borderTopRightRadius: radius.lg - 1,
    borderBottomLeftRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  jerseyBadgeOn: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  jerseyBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  jerseyBadgeTextOn: {
    color: '#fff',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexShrink: 0,
  },
  avatarOn: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  avatarText: { color: colors.orange, fontSize: 17, fontWeight: '800' },
  avatarTextOn: { color: '#fff' },
  cardBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  nameOn: { color: colors.orange },
  nameDisabled: { color: colors.textDim },
  jerseyLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  taken: { color: colors.live, fontSize: 11, marginTop: 2, fontWeight: '600' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    flexShrink: 0,
  },
});
