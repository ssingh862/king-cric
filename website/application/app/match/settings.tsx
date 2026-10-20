import { useBranding } from '../../src/stores/brandingStore';
import { Alert, TextInput } from '../../src/i18n';
import { Text } from '../../src/i18n';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';
import { KeyboardForm } from '../../src/components/ui/KeyboardForm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMatch } from '../../src/hooks/useTournaments';
import { MatchRulesEditor, standardLocalRules } from '../../src/components/cricket/MatchRulesEditor';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { apiSafe } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';
import { canManageTournament } from '../../src/lib/permissions';
import { useAuthStore } from '../../src/stores/authStore';
export default function MatchSettings(){
 useBranding(s=>s.palette);
 const {matchId}=useLocalSearchParams<{matchId:string}>(); const {data:match,isError}=useMatch(matchId); const cache=useQueryClient(); const profile=useAuthStore(s=>s.profile);
 const [rules,setRules]=useState(standardLocalRules),[venue,setVenue]=useState(''),[overs,setOvers]=useState('20'),[busy,setBusy]=useState(false);
 useEffect(()=>{if(match){setRules({...standardLocalRules,...match.rules});setVenue(match.venue??'');setOvers(String(match.overs_per_innings));}},[match]);
 const locked=Boolean(match?.innings?.length);const manage=canManageTournament(match?.tournament,profile);
 const save=async()=>{if(!manage)return;const n=Number(overs);if(!Number.isInteger(n)||n<1||n>50){Alert.alert('Overs','Choose 1–50 overs.');return;}setBusy(true);const {error}=await apiSafe(`/matches/${matchId}`,{method:'PATCH',body:JSON.stringify({venue,...(!locked?{rules,overs_per_innings:n}:{})})});setBusy(false);if(error){Alert.alert('Could not save',error);return;}await cache.invalidateQueries({queryKey:['match',matchId]});Alert.alert('Saved','Your match settings are updated.');};
 return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}><View style={{flexDirection:'row',gap:16,padding:20,alignItems:'center'}}><Pressable onPress={()=>router.back()} accessibilityLabel="Back"><Ionicons name="arrow-back" size={24} color={colors.text}/></Pressable><Text style={{fontSize:20,fontWeight:'800',color:colors.text}}>Match settings</Text></View><KeyboardForm contentContainerStyle={{padding:20}}>{isError?<Text>Could not load match settings.</Text>:<><Text style={{color:colors.text,fontSize:16,fontWeight:'700'}}>Ground</Text><TextInput accessibilityLabel="Ground" value={venue} editable={manage} onChangeText={setVenue} style={{padding:16,backgroundColor:'#fff',borderRadius:12,marginVertical:12,color:colors.text}}/><Text style={{color:colors.text,fontSize:16,fontWeight:'700'}}>Overs per innings</Text><TextInput accessibilityLabel="Overs per innings" keyboardType="number-pad" value={overs} editable={manage&&!locked} onChangeText={setOvers} style={{padding:16,backgroundColor:'#fff',borderRadius:12,marginTop:12,color:colors.text}}/><MatchRulesEditor value={rules} onChange={setRules} disabled={locked||!manage}/>{manage&&<GradientButton title="Save match settings" loading={busy} onPress={save}/>}<Pressable onPress={()=>router.push('/rules')} style={{padding:18,alignItems:'center'}}><Text style={{color:colors.orange,fontWeight:'700'}}>Read the cricket handbook</Text></Pressable></>}</KeyboardForm></SafeAreaView>;
}
