import { createThemedStyles } from '../../lib/theme';
import { Text } from '../../i18n';
import { StyleSheet, Switch,  View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MatchRules } from '../../lib/cricket/types';
import { colors } from '../../lib/theme';
export const standardLocalRules: Partial<MatchRules> = { widePenaltyRuns: 1, noBallPenaltyRuns: 1, wideCountsAsBall: false, noBallCountsAsBall: false, freeHitOnNoBall: true, allowByes: true, allowLegByes: true, lastBatterStands: false };
export function MatchRulesEditor({ value, onChange, disabled=false }: { value: Partial<MatchRules>; onChange: (v: Partial<MatchRules>)=>void; disabled?: boolean }) {
 const update=(key:keyof MatchRules,v:number|boolean)=>onChange({...value,[key]:v});
 return <View style={s.card}>
  <View style={s.head}><Ionicons name="options-outline" size={22} color={colors.orange}/><View style={{flex:1}}><Text style={s.title}>Your match, your rules</Text><Text style={s.sub}>Agree these with both captains before the toss.</Text></View></View>
  {(['widePenaltyRuns','noBallPenaltyRuns'] as const).map(key=><View key={key} style={s.row}><View style={{flex:1}}><Text style={s.label}>{key==='widePenaltyRuns'?'Wide penalty':'No-ball penalty'}</Text><Text style={s.sub}>0 means no automatic extra run</Text></View><View style={s.stepper}><Pressable disabled={disabled||(value[key]??1)<=0} accessibilityLabel={`Decrease ${key}`} style={s.step} onPress={()=>update(key,Math.max(0,(value[key]??1)-1))}><Text style={s.stepText}>−</Text></Pressable><Text style={s.value}>{value[key]??1}</Text><Pressable disabled={disabled||(value[key]??1)>=5} accessibilityLabel={`Increase ${key}`} style={s.step} onPress={()=>update(key,Math.min(5,(value[key]??1)+1))}><Text style={s.stepText}>+</Text></Pressable></View></View>)}
  {([
   ['wideCountsAsBall','Count wide as a ball','Local variation · standard is off'],
   ['noBallCountsAsBall','Count no-ball as a ball','Local variation · standard is off'],
   ['freeHitOnNoBall','Free hit after a no-ball','Carries over through wides and no-balls'],
   ['allowByes','Allow byes','Runs when the ball misses bat and body'],
   ['allowLegByes','Allow leg-byes','Award only when the umpire signals'],
   ['lastBatterStands','Last batter stands','Local variation · one batter can finish alone'],
  ] as const).map(([key,label,sub])=><View key={key} style={s.row}><View style={{flex:1,paddingRight:12}}><Text style={s.label}>{label}</Text><Text style={s.sub}>{sub}</Text></View><Switch accessibilityLabel={label} value={Boolean(value[key]??standardLocalRules[key])} onValueChange={v=>update(key,v)} disabled={disabled} trackColor={{false:colors.cardBorder,true:colors.orange}} thumbColor="#fff"/></View>)}
  <Text style={s.note}>{disabled?'Rules are locked once innings setup begins.':'Six balls per over. Wides/no-balls are rebowled unless you enable the local variations above. Penalty runs never change strike.'}</Text>
 </View>;
}
const s=createThemedStyles({card:{backgroundColor:'#fff',borderRadius:20,padding:18,borderWidth:1,borderColor:colors.cardBorder,marginVertical:16},head:{flexDirection:'row',gap:12,alignItems:'center',marginBottom:8},title:{color:colors.text,fontSize:17,fontWeight:'800'},sub:{color:colors.textMuted,fontSize:11,lineHeight:16,marginTop:4},row:{flexDirection:'row',alignItems:'center',paddingVertical:14,borderBottomWidth:1,borderBottomColor:colors.cardBorder},label:{fontSize:13,fontWeight:'700',color:colors.text},stepper:{flexDirection:'row',gap:12,alignItems:'center'},step:{width:34,height:36,backgroundColor:colors.surface,borderRadius:10,alignItems:'center',justifyContent:'center'},stepText:{fontSize:21,color:colors.orange,fontWeight:'700'},value:{fontWeight:'800',fontSize:18,color:colors.text},note:{color:colors.textMuted,lineHeight:18,fontSize:11,marginTop:14}});
