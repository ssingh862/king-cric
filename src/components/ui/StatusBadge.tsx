import { useBranding } from '../../stores/brandingStore';
import { View } from 'react-native';
import { Text } from '../../i18n';
import { colors } from '../../lib/theme';
const labels:Record<string,string>={registration:'Registration open',ongoing:'Ongoing',completed:'Completed',draft:'Draft',cancelled:'Cancelled',scheduled:'Upcoming',live:'LIVE'};
export function StatusBadge({status}:{status:string}){
 useBranding(s=>s.palette);
 const palette=status==='registration'?{bg:colors.warningLight,fg:colors.gold}:status==='ongoing'||status==='live'?{bg:colors.successLight,fg:colors.green}:status==='completed'?{bg:colors.infoLight,fg:colors.blue}:status==='cancelled'?{bg:colors.liveLight,fg:colors.live}:{bg:colors.surface,fg:colors.textMuted};
 return <View style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:palette.bg}}><View style={{width:5,height:5,borderRadius:3,backgroundColor:palette.fg}}/><Text style={{fontSize:11,lineHeight:16,fontWeight:'700',color:palette.fg}}>{labels[status]??status}</Text></View>;
}
