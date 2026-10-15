import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '../i18n/catalog';
export const usePreferences = create(persist<{
  language: Language; reduceMotion: boolean; theme: 'light' | 'dark'; setTheme:(theme:'light'|'dark')=>void;
  setLanguage: (language: Language)=>void; setReduceMotion:(value:boolean)=>void;
}>((set)=>({language:'en',reduceMotion:false,theme:'light',setTheme:theme=>set({theme}),setLanguage:language=>set({language}),setReduceMotion:reduceMotion=>set({reduceMotion})}),{
  name:'kingcric-preferences-v1',storage:createJSONStorage(()=>AsyncStorage),
}));
