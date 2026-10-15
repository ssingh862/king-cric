import { createThemedStyles } from '../../src/lib/theme';
import { Text } from '../../src/i18n';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet,  View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Ellipse, Rect, Line, Circle } from 'react-native-svg';
import { LiveMatchCard } from '../../src/components/cricket/LiveMatchCard';
import { CompletedMatchRow } from '../../src/components/cricket/CompletedMatchRow';
import { useCompletedMatches, useLiveMatches, useActiveTournaments, useUpcomingMatches, useMyTeams } from '../../src/hooks/useTournaments';
import { remindAboutMatches } from '../../src/lib/matchReminders';
import { ballTypeLabel, formatTournamentDate } from '../../src/lib/tournaments';
import { colors } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';

function initials(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'K';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export default function HomeScreen() {
  const profile = useAuthStore(s => s.profile);
  const live = useLiveMatches(), upcoming = useUpcomingMatches(), completed = useCompletedMatches(), tournaments = useActiveTournaments();
  const myTeams = useMyTeams(profile?.id);
  useEffect(() => {
    const matches = [...(live.data ?? []), ...(upcoming.data ?? [])];
    void remindAboutMatches(matches, (myTeams.data ?? []).map((team) => team.id), profile?.preferences?.notifications === true).catch(() => undefined);
  }, [live.data, upcoming.data, myTeams.data, profile?.preferences?.notifications]);
  const [filter, setFilter] = useState<'Live' | 'Upcoming' | 'Results'>('Live');
  const [refreshing, setRefreshing] = useState(false);
  const upcomingOnly = { ...upcoming, data: upcoming.data?.filter((match) => match.status === 'scheduled') };
  const query = filter === 'Live' ? live : filter === 'Upcoming' ? upcomingOnly : completed;
  const refresh = async () => { setRefreshing(true); await Promise.all([live.refetch(), upcoming.refetch(), completed.refetch(), tournaments.refetch()]); setRefreshing(false); };
  return <SafeAreaView style={s.root} edges={['top']}>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange} />}>
      <View style={s.header}>
        <View style={s.brand}><View style={s.mark}><Ionicons name="trophy" size={22} color={colors.lime} /></View><View><Text style={s.wordmark}>kingcric<Text style={{ color: colors.orange }}>.</Text></Text><Text style={s.eyebrow}>YOUR LOCAL CRICKET CLUB</Text></View></View>
        <Pressable accessibilityLabel="Open profile" onPress={() => router.push('/(tabs)/profile')} style={s.avatar}>{profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={s.avatarImage} /> : <Text style={s.avatarText}>{initials(profile?.full_name)}</Text>}</Pressable>
      </View>
      <Text style={s.greeting}><Text>Good to see you</Text>, {profile?.full_name?.split(' ')[0] || 'Captain'}.</Text>
      <LinearGradient colors={['#123D2B','#1D563B']} style={s.hero}>
        <View style={s.heroCopy}><View style={s.tag}><View style={s.dot}/><Text style={s.tagText}>BIG DREAMS. LOCAL GROUNDS.</Text></View><Text style={s.heroTitle}>Your ground.{'\n'}Your game.</Text><Text style={s.heroSub}>Bring your people together.{'\n'}Make every ball count.</Text><Pressable style={s.heroButton} onPress={() => router.push('/tournament/create')}><Text style={s.heroButtonText}>Create tournament</Text><Ionicons name="arrow-forward" color={colors.forest} size={18}/></Pressable></View>
        <View pointerEvents="none" style={s.field}><Svg width="155" height="220" viewBox="0 0 155 220"><Ellipse cx="78" cy="110" rx="72" ry="99" fill="#286046" stroke="#86B475" strokeWidth="1"/><Ellipse cx="78" cy="110" rx="52" ry="73" fill="none" stroke="#8FBF85" strokeDasharray="4 5"/><Rect x="66" y="75" width="24" height="68" rx="3" fill="#B8CB86"/><Line x1="62" y1="88" x2="94" y2="88" stroke="#fff"/><Line x1="62" y1="130" x2="94" y2="130" stroke="#fff"/>{[[40,48],[110,64],[30,130],[118,158],[70,188]].map(([cx,cy],i)=><Circle key={i} cx={cx} cy={cy} r="4" fill="#D6F57A"/>)}</Svg></View>
      </LinearGradient>
      <View style={s.actions}>{([
        ['trophy-outline','Tournaments','Find your next league','/(tabs)/tournaments'],
        ['people-outline','My teams','Build your playing squad','/my-teams'],
        ['options-outline','Cricket rules','Standard & local formats','/rules'],
      ] as const).map(([icon,title,sub,path])=><Pressable key={title} style={s.action} onPress={() => router.push(path)}><View style={s.actionIcon}><Ionicons name={icon} size={23} color={colors.orange}/></View><Text style={s.actionTitle}>{title}</Text><Text style={s.actionSub}>{sub}</Text></Pressable>)}</View>
      <View style={s.sectionHead}><Text style={s.sectionTitle}>Around the grounds</Text><Pressable onPress={() => router.push('/(tabs)/live')}><Ionicons name="arrow-forward" size={22} color={colors.orange}/></Pressable></View>
      <View style={s.filters}>{(['Live','Upcoming','Results'] as const).map(f=><Pressable key={f} style={[s.filter,filter===f&&s.filterOn]} onPress={() => setFilter(f)}><Text style={[s.filterText,filter===f&&s.filterTextOn]}>{f}{f==='Live' && live.data?.length ? `  ${live.data.length}` : ''}</Text></Pressable>)}</View>
      {query.isLoading ? <ActivityIndicator color={colors.orange}/> : query.isError ? <Pressable style={s.empty} onPress={() => query.refetch()}><Ionicons name="cloud-offline-outline" color={colors.textMuted} size={28}/><Text style={s.emptyTitle}>Couldn’t load matches</Text><Text style={s.emptySub}>Tap to try again.</Text></Pressable> : query.data?.length ? (filter === 'Results' ? [...query.data].sort((a, b) => new Date(b.scheduled_at ?? 0).getTime() - new Date(a.scheduled_at ?? 0).getTime()).slice(0, 8).map((m) => <CompletedMatchRow key={m.id} match={m} />) : query.data.slice(0, 3).map((m, i) => <LiveMatchCard match={m} key={m.id} index={i} />)) : <View style={s.empty}><Ionicons name="baseball-outline" color={colors.orange} size={30}/><Text style={s.emptyTitle}>{filter==='Live' ? 'The next great innings starts here' : filter==='Results' ? 'Your highlights are still to come' : 'Make room for match day'}</Text><Text style={s.emptySub}>{filter==='Live' ? 'No matches are live. Create a tournament and get your teams on the field.' : 'Fixtures and results from your community will appear here.'}</Text></View>}
      <View style={s.sectionHead}><Text style={s.sectionTitle}>Local leagues</Text><Pressable onPress={() => router.push('/(tabs)/tournaments')}><Text style={s.link}>Explore all</Text></Pressable></View>
      {tournaments.isError ? <Pressable style={s.league} onPress={() => tournaments.refetch()}><Text style={s.emptySub}>Leagues couldn’t load. Tap to retry.</Text></Pressable> : tournaments.data?.length ? tournaments.data.slice(0,4).map(t=><Pressable key={t.id} style={s.league} onPress={() => router.push(`/tournament/${t.id}`)}>{t.logo_url ? <Image source={{ uri: t.logo_url }} style={s.leagueLogo} /> : <View style={s.leagueIcon}><Ionicons name="trophy" size={25} color={colors.forest}/></View>}<View style={{flex:1}}><Text style={s.leagueName}>{t.name}</Text><Text style={s.emptySub}>{[t.city || t.venue || 'Local ground', ballTypeLabel(t.ball_type) ? `${ballTypeLabel(t.ball_type)} ball` : null, formatTournamentDate(t.start_date)].filter(Boolean).join(' · ')}</Text>{formatTournamentDate(t.registration_date) || formatTournamentDate(t.registration_deadline) ? <Text style={s.emptySub}><Text>Registration</Text>{formatTournamentDate(t.registration_date) ? ` ${formatTournamentDate(t.registration_date)}` : ''}{formatTournamentDate(t.registration_deadline) ? ' · ' : ''}{formatTournamentDate(t.registration_deadline) ? <Text>Closes</Text> : null}{formatTournamentDate(t.registration_deadline) ? ` ${formatTournamentDate(t.registration_deadline)}` : ''}</Text> : null}<Text style={s.leagueStatus}>{t.status === 'registration' ? 'REGISTRATION OPEN' : 'IN PLAY'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted}/></Pressable>) : <Pressable style={s.league} onPress={() => router.push('/tournament/create')}><View style={s.leagueIcon}><Ionicons name="add" size={26} color={colors.forest}/></View><View style={{flex:1}}><Text style={s.leagueName}>Start something worth playing for</Text><Text style={s.emptySub}>Create your first local tournament.</Text></View></Pressable>}
      <View style={s.footer}><View style={s.footerLine}/><Text style={s.footerText}>BUILT FOR THE LOVE OF THE GAME</Text><View style={s.footerLine}/></View>
    </ScrollView>
  </SafeAreaView>;
}
const s=createThemedStyles({
 root:{flex:1,backgroundColor:colors.background},scroll:{padding:20,paddingBottom:32},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brand:{flexDirection:'row',gap:10,alignItems:'center'},mark:{width:42,height:46,backgroundColor:colors.forest,borderRadius:14,alignItems:'center',justifyContent:'center'},wordmark:{fontSize:27,fontWeight:'900',letterSpacing:-1.3,color:colors.text},eyebrow:{fontSize:8,letterSpacing:1.6,fontWeight:'700',color:colors.textMuted,marginTop:1},avatar:{width:42,height:42,borderRadius:21,borderWidth:1,borderColor:colors.cardBorder,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',overflow:'hidden'},avatarImage:{width:42,height:42},avatarText:{fontSize:15,fontWeight:'700',color:colors.forest},greeting:{fontSize:14,color:colors.textMuted,marginTop:25,marginBottom:14},hero:{borderRadius:25,padding:22,overflow:'hidden',minHeight:260},heroCopy:{zIndex:1},tag:{flexDirection:'row',gap:6,alignItems:'center'},dot:{width:5,height:5,borderRadius:3,backgroundColor:colors.lime},tagText:{fontSize:8,fontWeight:'800',letterSpacing:1.3,color:colors.lime},heroTitle:{fontSize:36,lineHeight:39,fontWeight:'900',letterSpacing:-1.4,color:'#fff',marginTop:17},heroSub:{color:'#C5D9CA',fontSize:13,lineHeight:20,marginTop:10},heroButton:{flexDirection:'row',alignItems:'center',gap:14,alignSelf:'flex-start',backgroundColor:colors.lime,paddingHorizontal:16,paddingVertical:13,borderRadius:12,marginTop:20},heroButtonText:{fontWeight:'800',color:colors.forest,fontSize:13},field:{position:'absolute',right:-45,top:25,transform:[{rotate:'-20deg'}],opacity:0.7},actions:{flexDirection:'row',gap:9,marginTop:18,marginBottom:29},action:{flex:1,padding:12,backgroundColor:'#fff',borderRadius:17,borderWidth:1,borderColor:colors.cardBorder},actionIcon:{marginBottom:13},actionTitle:{fontSize:12,fontWeight:'800',color:colors.text},actionSub:{fontSize:10,lineHeight:15,color:colors.textMuted,marginTop:5},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:15,marginTop:8},sectionTitle:{fontSize:20,fontWeight:'800',letterSpacing:-0.6,color:colors.text},filters:{flexDirection:'row',gap:8,marginBottom:16},filter:{paddingHorizontal:19,paddingVertical:10,borderRadius:22,borderWidth:1,borderColor:colors.cardBorder},filterOn:{backgroundColor:colors.forest,borderColor:colors.forest},filterText:{fontSize:12,fontWeight:'700',color:colors.textMuted},filterTextOn:{color:'#fff'},empty:{alignItems:'center',backgroundColor:'#fff',borderRadius:20,padding:25,borderWidth:1,borderColor:colors.cardBorder,marginBottom:22},emptyTitle:{color:colors.text,fontSize:15,fontWeight:'700',marginTop:12,textAlign:'center'},emptySub:{color:colors.textMuted,fontSize:12,lineHeight:18,marginTop:5},link:{color:colors.orange,fontSize:12,fontWeight:'700'},league:{flexDirection:'row',alignItems:'center',gap:13,padding:16,borderRadius:18,backgroundColor:'#fff',borderWidth:1,borderColor:colors.cardBorder,marginBottom:10},leagueIcon:{width:48,height:54,borderRadius:14,backgroundColor:colors.orangeLight,alignItems:'center',justifyContent:'center'},leagueLogo:{width:48,height:54,borderRadius:14},leagueName:{fontSize:14,fontWeight:'800',color:colors.text},leagueStatus:{fontSize:8,fontWeight:'800',letterSpacing:1,color:colors.orange,marginTop:8},footer:{flexDirection:'row',gap:10,alignItems:'center',marginTop:24},footerLine:{flex:1,height:1,backgroundColor:colors.cardBorder},footerText:{fontSize:7,color:colors.textMuted,fontWeight:'700',letterSpacing:1.3}
});
