import { brandPalettes, type BrandPalette } from './brandPalettes';
import { useBranding } from '../stores/brandingStore';
import { StyleSheet, type ViewStyle } from 'react-native';
import { usePreferences } from '../stores/preferencesStore';

/** Professional light theme — high contrast for outdoor / bright lighting */
const lightColors = {
  forest: '#102F24',
  lime: '#C7EF6B',
  cream: '#F6F7F2',
  brandMuted: '#AEC5B4',
  brandSurface: '#174D34',
  background: '#F6F7F2',
  backgroundSecondary: '#FFFFFF',
  surface: '#EDF1E8',
  surfaceHover: '#E1E7DC',
  card: '#FFFFFF',
  cardBorder: '#DFE6DA',
  borderStrong: '#C9D4C2',
  orange: '#216947',
  orangeDark: '#104D33',
  orangeLight: '#EAF4DE',
  gold: '#B45309',
  purple: '#7C3AED',
  pink: '#DB2777',
  green: '#059669',
  blue: '#2458A6',
  text: '#172E23',
  textMuted: '#647567',
  textDim: '#718174',
  live: '#DC2626',
  liveLight: '#FEF2F2',
  successLight: '#E6F4E9',
  warningLight: '#FFF2CF',
  infoLight: '#E8EFFC',
  overlay: 'rgba(15, 23, 42, 0.45)',
  inputBg: '#FFFFFF',
  gradient: ['#176B45', '#104D33', '#123D2B'] as const,
  headerGradient: ['#FFFFFF', '#F5F6F0'] as const,
  accentGradient: ['#EAF4DE', '#FFFFFF'] as const,
};


const darkColors = {
  ...lightColors,
  background:'#101D17', backgroundSecondary:'#172B21',surface:'#22372B',surfaceHover:'#2D4636',
  card:'#172B21',cardBorder:'#36513F',borderStrong:'#4C6853', inputBg:'#172B21',
  text:'#F2F7EE',textMuted:'#B2C3B3',textDim:'#91A794',orange:'#238052',orangeLight:'#223F2C',
  infoLight:'#1E3250',blue:'#98BBFF',gold:'#F5CD74',green:'#86D9A8',successLight:'#173D2C',warningLight:'#3B321D',liveLight:'#412025',
};
function paletteColors(dark:boolean, palette:BrandPalette) {
  const brand=brandPalettes[palette];
  return {...(dark?darkColors:lightColors),forest:brand.deep,lime:brand.accent,
    brandMuted:brand.muted,brandSurface:brand.dark,orange:brand.primary,orangeDark:brand.dark,orangeLight:dark?brand.deep:brand.tint,
    gradient:[brand.primary,brand.dark,brand.deep] as const,
    accentGradient:[brand.tint,dark?darkColors.card:lightColors.card] as const};
}
export const colors = new Proxy(lightColors, {
  get(_target,key:keyof typeof lightColors){return paletteColors(usePreferences.getState().theme==='dark',useBranding.getState().palette)[key];},
});
/** Styles retain semantic colors when appearance changes, including already mounted screens. */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(input:T):T {
  const createdDark=usePreferences.getState().theme==='dark';
  const createdPalette=useBranding.getState().palette;
  const from=paletteColors(createdDark,createdPalette);
  return new Proxy(input,{get(target,key:string){
    const source=target[key as keyof T] as Record<string,unknown>;
    if(!source||typeof source!=='object')return source;
    const dark=usePreferences.getState().theme==='dark';
    const palette=useBranding.getState().palette;
    const to=paletteColors(dark,palette);
    const result={...source};
    const aliases:Record<string,string>={'#123D2B':to.forest,'#1D563B':to.orangeDark,'#D6F57A':to.lime};
    for(const [property,value] of Object.entries(result)){
      if(typeof value!=='string'||!property.toLowerCase().includes('color'))continue;
      if(property==='color'&&(value==='#fff'||value==='#FFFFFF'))continue;
      if(property==='backgroundColor'&&(value==='#fff'||value==='#FFFFFF')){result[property]=to.card;continue;}
      const token=Object.keys(from).find(k=>from[k as keyof typeof from]===value);
      if(token)result[property]=to[token as keyof typeof to];
      else if(aliases[value])result[property]=aliases[value];
    }
    return result;
  }});
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#142B22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 1,
  } satisfies ViewStyle,
  cardLg: {
    shadowColor: '#142B22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  } satisfies ViewStyle,
  button: {
    shadowColor: '#176B45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 1,
  } satisfies ViewStyle,
};

/** Shared professional input field style */
export const inputStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: colors.inputBg,
  borderRadius: radius.md,
  minHeight: 52,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  paddingHorizontal: 14,
  marginBottom: 12,
};
