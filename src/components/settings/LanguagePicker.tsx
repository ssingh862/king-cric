import { useBranding } from '../../stores/brandingStore';
import { Pressable, View } from 'react-native';
import { languages } from '../../i18n/catalog';
import { Text } from '../../i18n';
import { usePreferences } from '../../stores/preferencesStore';
import { colors } from '../../lib/theme';
export function LanguagePicker(){
 useBranding(s=>s.palette);
 const {language,setLanguage}=usePreferences();
 return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{languages.map(l=><Pressable key={l.id} accessibilityRole="radio" accessibilityState={{checked:language===l.id}} onPress={()=>setLanguage(l.id)} style={{padding:12,borderRadius:12,borderWidth:1,borderColor:language===l.id?colors.orange:colors.cardBorder,backgroundColor:language===l.id?colors.orangeLight:colors.card}}><Text style={{color:colors.text,fontWeight:'700'}}>{l.name}</Text></Pressable>)}</View>;
}
