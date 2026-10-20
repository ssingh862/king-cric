import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { isBrandPalette, type BrandPalette } from '../lib/brandPalettes';
export const useBranding = create(persist<{palette:BrandPalette;refresh:()=>Promise<void>;save:(palette:BrandPalette)=>Promise<void>}>((set,get)=>({
 palette:'green',
 refresh:async()=>{const previous=get().palette;try{const value=await api<{palette:unknown}>('/appearance',{auth:false,signal:AbortSignal.timeout(15000)});if(isBrandPalette(value.palette)&&get().palette===previous)set({palette:value.palette});}catch{/* Keep the last saved branding while offline or before the server upgrade. */}},
 save:async(palette)=>{const value=await api<{palette:unknown}>('/appearance',{method:'PUT',body:JSON.stringify({palette}),signal:AbortSignal.timeout(30000)});if(!isBrandPalette(value.palette))throw new Error('Unable to save appearance');set({palette:value.palette});},
}),{name:'kingcric-branding-v1',storage:createJSONStorage(()=>AsyncStorage),partialize:state=>({palette:state.palette}) as typeof state}));
