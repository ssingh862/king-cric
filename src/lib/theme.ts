import { StyleSheet, type ViewStyle } from 'react-native';
import { usePreferences } from '../stores/preferencesStore';

/** Professional light theme — high contrast for outdoor / bright lighting */
const lightColors = {
  forest: '#123D2B',
  lime: '#D6F57A',
  cream: '#F5F6F0',
  background: '#F5F6F0',
  backgroundSecondary: '#FFFFFF',
  surface: '#EDF1E8',
  surfaceHover: '#E1E7DC',
  card: '#FFFFFF',
  cardBorder: '#E1E7DC',
  borderStrong: '#C9D4C2',
  orange: '#176B45',
  orangeDark: '#104D33',
  orangeLight: '#EAF4DE',
  gold: '#B45309',
  purple: '#7C3AED',
  pink: '#DB2777',
  green: '#059669',
  blue: '#0284C7',
  text: '#142B22',
  textMuted: '#657569',
  textDim: '#7E8B80',
  live: '#DC2626',
  liveLight: '#FEF2F2',
  successLight: '#ECFDF5',
  warningLight: '#FFFBEB',
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
  successLight:'#173D2C',warningLight:'#3B321D',liveLight:'#412025',
};
export const colors: typeof lightColors = new Proxy(lightColors, {
  get(target,key: keyof typeof lightColors){return usePreferences.getState().theme==='dark'?darkColors[key]:target[key];},
});
/** Re-evaluate theme colors when a screen renders; preserve white text on brand surfaces. */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(input:T):T {
  const createdDark=usePreferences.getState().theme==='dark';
  const from=createdDark?darkColors:lightColors;
  return new Proxy(input, {get(target,key:string){
    const dark=usePreferences.getState().theme==='dark';
    if(dark===createdDark) return target[key as keyof T];
    const to=dark?darkColors:lightColors;
    const source=target[key as keyof T] as Record<string,unknown>;
    if(!source || typeof source!=='object')return source;
    const result={...source};
    for(const [property,value] of Object.entries(result)) {
      if(typeof value!=='string' || !property.toLowerCase().includes('color'))continue;
      if(property==='color' && (value==='#fff'||value==='#FFFFFF'))continue;
      if(property==='backgroundColor' && (value==='#fff'||value==='#FFFFFF')) {result[property]=to.card;continue;}
      const token=Object.keys(from).find(k=>from[k as keyof typeof from]===value && to[k as keyof typeof to]!==value);
      if(token)result[property]=to[token as keyof typeof to];
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
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  } satisfies ViewStyle,
};

/** Shared professional input field style */
export const inputStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: colors.inputBg,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  paddingHorizontal: 14,
  marginBottom: 12,
};
