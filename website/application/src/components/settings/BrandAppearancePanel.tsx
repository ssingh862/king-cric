import { useEffect,useState } from 'react';
import { Pressable,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text,useTranslation } from '../../i18n';
import { brandPalettes,type BrandPalette } from '../../lib/brandPalettes';
import { colors } from '../../lib/theme';
import { useBranding } from '../../stores/brandingStore';
import { Button,Card,styles } from './SettingsUI';
export function BrandAppearancePanel(){
 const {t}=useTranslation();
 const saved=useBranding(s=>s.palette),save=useBranding(s=>s.save);
 const [selected,setSelected]=useState<BrandPalette>(saved),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>setSelected(saved),[saved]);
 const [gridWidth,setGridWidth]=useState(0);
 const columns=gridWidth>=1320?6:gridWidth>=900?4:gridWidth>=620?3:gridWidth>=280?2:1;
 const tileWidth=gridWidth>0?(gridWidth-12*(columns-1))/columns:undefined;
 const palette=brandPalettes[selected];
 async function apply(){setBusy(true);setNotice('');try{await save(selected);setNotice('Brand colors updated for the website and app.');}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 return <Card title="Brand appearance"><Text style={styles.sub}>Choose the color identity for everyone. Preview it here, then apply it to the website and mobile app.</Text><View onLayout={event=>setGridWidth(event.nativeEvent.layout.width)} style={{flexDirection:'row',flexWrap:'wrap',gap:12,marginBottom:20}}>{(Object.keys(brandPalettes) as BrandPalette[]).map(id=><Pressable key={id} accessibilityRole="radio" accessibilityLabel={t(brandPalettes[id].name)} accessibilityState={{checked:selected===id,disabled:busy}} disabled={busy} onPress={()=>{setSelected(id);setNotice('');}} style={{width:tileWidth,minWidth:0,borderWidth:selected===id?2:1,borderColor:selected===id?brandPalettes[id].primary:colors.cardBorder,borderRadius:14,padding:14,backgroundColor:colors.card,gap:10}}><View style={{flexDirection:'row',alignItems:'center',gap:5}}>{[brandPalettes[id].deep,brandPalettes[id].primary,brandPalettes[id].accent].map(color=><View key={color} style={{height:25,width:25,borderRadius:8,backgroundColor:color}}/>)}{selected===id?<Ionicons name="checkmark-circle" size={20} color={brandPalettes[id].primary}/>:null}</View><Text style={{color:colors.text,fontWeight:'700'}}>{brandPalettes[id].name}</Text></Pressable>)}</View><View style={{borderWidth:1,borderColor:colors.cardBorder,borderRadius:18,overflow:'hidden',marginBottom:14}}><View style={{padding:20,backgroundColor:palette.deep}}><Text style={{color:palette.accent,fontSize:11,fontWeight:'700'}}>KINGCRIC · PREVIEW</Text><Text style={{color:'#fff',fontSize:25,fontWeight:'800',marginTop:12}}>Your ground. Your game.</Text><View style={{backgroundColor:palette.accent,padding:12,borderRadius:10,alignSelf:'flex-start',marginTop:18}}><Text style={{color:palette.deep,fontWeight:'700'}}>Create tournament</Text></View></View><View style={{backgroundColor:palette.tint,padding:16}}><Text style={{color:palette.deep,fontWeight:'700'}}>Your teams. Your tournaments.</Text><Text style={{color:palette.primary,marginTop:5}}>Website + Android app</Text></View></View>{notice?<Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>:null}<Button title={selected===saved?'Apply current theme':'Apply brand color'} onPress={()=>void apply()} busy={busy}/><Text style={{color:colors.textMuted,fontSize:12,lineHeight:19,marginTop:8}}>Status colors stay consistent: amber for registration, green for ongoing, blue for completed.</Text></Card>;
}
