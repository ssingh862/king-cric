import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadows } from '../../lib/theme';

interface PlayerInfo {
  id: string;
  full_name: string;
}

interface ActivePlayersBarProps {
  striker?: PlayerInfo | null;
  nonStriker?: PlayerInfo | null;
  bowler?: PlayerInfo | null;
  highlightVacant?: 'striker' | 'non_striker' | null;
  onChangePlayers?: () => void;
}

function StrikerCard({ name, vacant }: { name: string; vacant?: boolean }) {
  return (
    <View style={[styles.strikerCard, vacant && styles.strikerVacant]}>
      <View style={styles.strikerTop}>
        <View style={styles.facingBadge}>
          <MaterialCommunityIcons name="cricket" size={16} color="#fff" />
          <Text style={styles.facingText}>Facing</Text>
        </View>
        {vacant ? <Text style={styles.vacantHint}>Tap to select</Text> : null}
      </View>
      <Text style={[styles.strikerName, vacant && styles.strikerNameVacant]} numberOfLines={1}>
        {vacant ? '—' : name}
      </Text>
      <Text style={[styles.strikerRole, vacant && styles.strikerRoleVacant]}>
        On strike · faces the ball
      </Text>
    </View>
  );
}

function NonStrikerCard({ name, vacant }: { name: string; vacant?: boolean }) {
  return (
    <View style={[styles.nonStrikerCard, vacant && styles.nonStrikerVacant]}>
      <View style={styles.nonStrikerHeader}>
        <Ionicons name="person-outline" size={14} color={colors.textMuted} />
        <Text style={styles.nonStrikerLabel}>Non-striker</Text>
      </View>
      <Text style={styles.nonStrikerName} numberOfLines={1}>
        {vacant ? 'Tap to select' : name}
      </Text>
    </View>
  );
}

function BowlerCard({ name }: { name: string }) {
  return (
    <View style={styles.bowlerCard}>
      <View style={styles.bowlerHeader}>
        <MaterialCommunityIcons name="baseball" size={14} color={colors.blue} />
        <Text style={styles.bowlerLabel}>Bowling</Text>
      </View>
      <Text style={styles.bowlerName} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

export function ActivePlayersBar({
  striker,
  nonStriker,
  bowler,
  highlightVacant,
  onChangePlayers,
}: ActivePlayersBarProps) {
  return (
    <View style={[styles.wrap, shadows.card]}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionLabel}>On crease</Text>
        {onChangePlayers ? (
          <Pressable style={styles.changeBtn} onPress={onChangePlayers}>
            <Ionicons name="swap-horizontal" size={16} color={colors.orange} />
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        ) : null}
      </View>

      <StrikerCard
        name={striker?.full_name ?? '—'}
        vacant={highlightVacant === 'striker'}
      />

      {nonStriker || highlightVacant === 'non_striker' ? (
        <View style={styles.bottomRow}>
          <NonStrikerCard
            name={nonStriker?.full_name ?? '—'}
            vacant={highlightVacant === 'non_striker'}
          />
          <BowlerCard name={bowler?.full_name ?? '—'} />
        </View>
      ) : (
        <View style={styles.loneRow}>
          <Text style={styles.loneHint}>Last batter · batting alone</Text>
          <BowlerCard name={bowler?.full_name ?? '—'} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  strikerCard: {
    backgroundColor: colors.orange,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.orangeDark,
  },
  strikerVacant: {
    backgroundColor: colors.orangeLight,
    borderColor: colors.orange,
    borderStyle: 'dashed',
  },
  strikerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  facingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  facingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  vacantHint: { color: colors.orange, fontSize: 11, fontWeight: '700' },
  strikerName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  strikerNameVacant: { color: colors.orange },
  strikerRole: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  strikerRoleVacant: { color: colors.textMuted },
  bottomRow: { flexDirection: 'row', gap: 8 },
  loneRow: { gap: 8 },
  loneHint: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  nonStrikerCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  nonStrikerVacant: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  nonStrikerHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  nonStrikerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  nonStrikerName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  bowlerCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.blue,
  },
  bowlerHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  bowlerLabel: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bowlerName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  changeText: { color: colors.orange, fontSize: 12, fontWeight: '700' },
});
