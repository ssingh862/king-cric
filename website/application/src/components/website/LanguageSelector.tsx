import { useBranding } from '../../stores/brandingStore';
import { brandPalettes } from '../../lib/brandPalettes';
import { useEffect } from 'react';
import { languages, type Language } from '../../i18n/catalog';
import { usePreferences } from '../../stores/preferencesStore';
import { websiteTranslate } from './translations';
export function useWebsiteTranslation(){
 const palette=useBranding(s=>s.palette);
 useEffect(()=>{const brand=brandPalettes[palette];for(const [key,value] of Object.entries(brand)){if(key!=='name')document.documentElement.style.setProperty(`--kc-${key}`,value);}},[palette]);
 const language=usePreferences(s=>s.language);
 useEffect(()=>{document.documentElement.lang=language;},[language]);
 return {language,t:(text:string)=>websiteTranslate(text,language)};
}
export default function LanguageSelector(){
 const {language,t}=useWebsiteTranslation();const setLanguage=usePreferences(s=>s.setLanguage);
 return <label className="kc-language-select"><span aria-hidden="true">◎</span><select aria-label={t('Language')} value={language} onChange={e=>setLanguage(e.target.value as Language)}>{languages.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>;
}
