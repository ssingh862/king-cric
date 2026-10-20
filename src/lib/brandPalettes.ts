export const brandPalettes = {
 green:{name:'Green',primary:'#216947',deep:'#102F24',dark:'#174D34',accent:'#C7EF6B',tint:'#EAF3DD',muted:'#AEC5B4'},
 pink:{name:'Pink',primary:'#A32C68',deep:'#39172D',dark:'#78204C',accent:'#FFBFDA',tint:'#FCEAF2',muted:'#CFB1C2'},
 blue:{name:'Blue',primary:'#285CAD',deep:'#132746',dark:'#224783',accent:'#B7D8FF',tint:'#E8F0FC',muted:'#ABBDD5'},
 amber:{name:'Amber',primary:'#946015',deep:'#352715',dark:'#704810',accent:'#FFE0A0',tint:'#FFF1D8',muted:'#CAB99C'},
 teal:{name:'Teal & Ice',primary:'#176675',deep:'#112F37',dark:'#164D58',accent:'#A8EDF0',tint:'#E2F4F5',muted:'#A8C8CC'},
 violet:{name:'Violet & Lavender',primary:'#6E43A8',deep:'#291B42',dark:'#51327C',accent:'#DCC5FF',tint:'#F0E9FA',muted:'#BFB0D5'},
 coral:{name:'Coral & Peach',primary:'#AF3D32',deep:'#3E211E',dark:'#83332B',accent:'#FFD1B6',tint:'#FFF0E7',muted:'#D1B4AC'},
 navygold:{name:'Navy & Gold',primary:'#29466D',deep:'#111F35',dark:'#203958',accent:'#FFD276',tint:'#F9F0DD',muted:'#B0BED2'},
 mint:{name:'Mint & Forest',primary:'#236851',deep:'#14352D',dark:'#1D503E',accent:'#B1F1D1',tint:'#E3F7ED',muted:'#ADCDBF'},
 burgundy:{name:'Burgundy & Rose',primary:'#8D3347',deep:'#351B25',dark:'#672738',accent:'#F6C6D0',tint:'#FAEAF0',muted:'#CFB0BA'},
 indigo:{name:'Indigo & Sky',primary:'#454CA1',deep:'#1D2445',dark:'#333B7B',accent:'#BBCFFF',tint:'#EAEEFC',muted:'#B2BDDB'},
 slate:{name:'Slate & Silver',primary:'#455566',deep:'#18232E',dark:'#34424F',accent:'#D9E2EC',tint:'#EAF0F5',muted:'#B3C2D0'},
} as const;
export type BrandPalette = keyof typeof brandPalettes;
export function isBrandPalette(value:unknown):value is BrandPalette {
 return typeof value==='string' && Object.prototype.hasOwnProperty.call(brandPalettes,value);
}
