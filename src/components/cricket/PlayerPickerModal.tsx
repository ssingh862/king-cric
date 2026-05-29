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
import { colors, radius } from '../../lib/theme';

export type PickerRole = 'striker' | 'non_striker' | 'bowler';

interface PlayerPickerModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  players: Player[];
  selectedId?: string | null;
  onSelect: (player: Player) => void;
  onClose?: () => void;
  required?: boolean;
}

export function PlayerPickerModal({
  visible,
  title,
  subtitle,
  players,
  selectedId,
  onSelect,
  onClose,
  required,
}: PlayerPickerModalProps) {
  const insets = useSafeAreaInsets();

  const handleSelect = (p: Player) => {
    onSelect(p);
    if (!required) onClose?.();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      hardwareAccelerated
      onRequestClose={required ? undefined : onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={required ? undefined : onClose}
      >
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.header, required && styles.headerRequired]}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {!required && onClose && (
              <Pressable onPress={onClose} hitSlop={16}>
                <Ionicons name="close" size={26} color={colors.text} />
              </Pressable>
            )}
          </View>

          {players.length > 0 ? (
            <Text style={styles.count}>{players.length} available — tap a name</Text>
          ) : (
            <Text style={styles.emptyHeader}>No players in squad. Add players to the team first.</Text>
          )}

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            {players.map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [
                  styles.row,
                  selectedId === p.id && styles.rowSelected,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => handleSelect(p)}
              >
                <Text style={styles.name}>{p.full_name}</Text>
                {p.jersey_number != null && (
                  <Text style={styles.jersey}>#{p.jersey_number}</Text>
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.orange} />
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
    ...Platform.select({
      android: { elevation: 24 },
      ios: {},
    }),
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerRequired: { backgroundColor: 'rgba(255,107,0,0.12)' },
  headerText: { flex: 1, paddingRight: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 6, lineHeight: 20 },
  count: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  emptyHeader: {
    color: colors.live,
    fontSize: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  list: { maxHeight: 360 },
  listContent: { padding: 16, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: radius.lg,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 56,
  },
  rowPressed: { backgroundColor: 'rgba(255,107,0,0.2)' },
  rowSelected: { borderColor: colors.orange, backgroundColor: 'rgba(255,107,0,0.15)' },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  jersey: { color: colors.textMuted, marginRight: 8, fontSize: 14 },
});
