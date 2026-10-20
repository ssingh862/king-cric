import { useBranding } from '../../stores/brandingStore';
import type { ReactNode } from 'react';
import { Pressable,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text,useTranslation } from '../../i18n';
import { colors } from '../../lib/theme';
export function ScreenHeader({title,subtitle,back=false,onBack,action}:{title:string;subtitle?:string;back?:boolean;onBack?:()=>void;action?:ReactNode}){
 useBranding(s=>s.palette);
 const {t}=useTranslation();
 return <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:24,paddingTop:6}}>{back?<Pressable accessibilityRole="button" accessibilityLabel={t('Back')} onPress={onBack??(()=>router.canGoBack()?router.back():router.replace('/(tabs)'))} style={({pressed})=>({width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:14,borderWidth:1,borderColor:colors.cardBorder,backgroundColor:pressed?colors.surface:colors.card})}><Ionicons name="arrow-back" size={20} color={colors.text}/></Pressable>:null}<View style={{flex:1}}><Text style={{color:colors.text,fontSize:28,lineHeight:36,fontWeight:'800',letterSpacing:-.6}}>{title}</Text>{subtitle?<Text style={{color:colors.textMuted,fontSize:13,lineHeight:20,marginTop:4}}>{subtitle}</Text>:null}</View>{action}</View>;
}
