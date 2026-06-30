import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../../lib/theme';

export interface SquadPlayerDraft {
  key: string;
  fullName: string;
  jerseyNumber: string;
  role: string;
  isCaptain: boolean;
  isWicketKeeper: boolean;
}

const ROLES = ['batsman', 'bowler', 'all_rounder', 'wicket_keeper'] as const;

export function createEmptyPlayer(key?: string): SquadPlayerDraft {
  return {
    key: key ?? `p-${Date.now()}-${Math.random()}`,
    fullName: '',
    jerseyNumber: '',
    role: 'all_rounder',
    isCaptain: false,
    isWicketKeeper: false,
  };
}

interface PlayerSquadEditorProps {
  players: SquadPlayerDraft[];
  onChange: (players: SquadPlayerDraft[]) => void;
}

export function PlayerSquadEditor({ players, onChange }: PlayerSquadEditorProps) {
  const update = (key: string, patch: Partial<SquadPlayerDraft>) => {
    onChange(players.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  };

  const remove = (key: string) => {
    if (players.length <= 1) return;
    onChange(players.filter((p) => p.key !== key));
  };

  const add = () => onChange([...players, createEmptyPlayer()]);

  const setCaptain = (key: string) => {
    onChange(
      players.map((p) => ({
        ...p,
        isCaptain: p.key === key,
        isWicketKeeper: p.key === key ? false : p.isWicketKeeper,
      }))
    );
  };

  const setWK = (key: string) => {
    onChange(
      players.map((p) => ({
        ...p,
        isWicketKeeper: p.key === key,
        isCaptain: p.key === key ? false : p.isCaptain,
      }))
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Players</Text>
        <Pressable style={styles.addBtn} onPress={add}>
          <Ionicons name="add" size={18} color={colors.orange} />
          <Text style={styles.addText}>Add player</Text>
        </Pressable>
      </View>

      {players.map((p, index) => (
        <View key={p.key} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.playerNum}>Player {index + 1}</Text>
            {players.length > 1 && (
              <Pressable onPress={() => remove(p.key)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={colors.live} />
              </Pressable>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Player full name"
            placeholderTextColor={colors.textDim}
            value={p.fullName}
            onChangeText={(v) => update(p.key, { fullName: v })}
            autoCapitalize="words"
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.jerseyInput]}
              placeholder="Jersey #"
              placeholderTextColor={colors.textDim}
              value={p.jerseyNumber}
              onChangeText={(v) => update(p.key, { jerseyNumber: v.replace(/\D/g, '') })}
              keyboardType="number-pad"
              maxLength={3}
            />
            <View style={styles.roleRow}>
              {ROLES.map((role) => (
                <Pressable
                  key={role}
                  style={[styles.roleChip, p.role === role && styles.roleChipOn]}
                  onPress={() => update(p.key, { role })}
                >
                  <Text style={[styles.roleText, p.role === role && styles.roleTextOn]}>
                    {role === 'wicket_keeper' ? 'WK' : role === 'all_rounder' ? 'AR' : role.slice(0, 3).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.badgeRow}>
            <Pressable
              style={[styles.badge, p.isCaptain && styles.badgeOn]}
              onPress={() => setCaptain(p.key)}
            >
              <Text style={[styles.badgeText, p.isCaptain && styles.badgeTextOn]}>Captain</Text>
            </Pressable>
            <Pressable
              style={[styles.badge, p.isWicketKeeper && styles.badgeOn]}
              onPress={() => setWK(p.key)}
            >
              <Text style={[styles.badgeText, p.isWicketKeeper && styles.badgeTextOn]}>WK</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addText: { color: colors.orange, fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  playerNum: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 15,
    padding: 12,
    marginBottom: 8,
  },
  row: { gap: 8 },
  jerseyInput: { width: 100, marginBottom: 0 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  roleChipOn: { borderColor: colors.orange, backgroundColor: 'rgba(255,107,0,0.15)' },
  roleText: { color: colors.textDim, fontSize: 11, fontWeight: '700' },
  roleTextOn: { color: colors.orange },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  badgeOn: { borderColor: colors.orange, backgroundColor: 'rgba(255,107,0,0.2)' },
  badgeText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  badgeTextOn: { color: colors.orange },
});
