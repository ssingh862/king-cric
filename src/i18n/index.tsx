import { forwardRef } from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import { usePreferences } from '../stores/preferencesStore';
import { translate } from './catalog';
export function useTranslation() {
  const language=usePreferences(s=>s.language);
  return {language,t:(text:string)=>translate(text,language)};
}
export const Text = forwardRef<NativeText,TextProps>(function LocalizedText({children,...props},ref){
  const {t}=useTranslation();
  const convert=(value:React.ReactNode):React.ReactNode => typeof value==='string'?t(value):Array.isArray(value)?value.map(convert):value;
  return <NativeText ref={ref} {...props}>{convert(children)}</NativeText>;
});

import { TextInput as NativeTextInput, type TextInputProps, Alert as NativeAlert } from 'react-native';
export const TextInput = forwardRef<NativeTextInput,TextInputProps>(function LocalizedInput(props,ref){
  const {t}=useTranslation();
  return <NativeTextInput {...props} ref={ref} placeholder={props.placeholder?t(props.placeholder):undefined} accessibilityLabel={props.accessibilityLabel?t(props.accessibilityLabel):undefined}/>;
});
export const Alert: typeof NativeAlert = {
  ...NativeAlert,
  alert(title,message,buttons,options){
    const language=usePreferences.getState().language;
    NativeAlert.alert(translate(title,language),message?translate(message,language):message,buttons?.map(b=>({...b,text:b.text?translate(b.text,language):b.text})),options);
  },
};
