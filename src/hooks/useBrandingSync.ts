import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getSocket } from '../lib/socket';
import { isBrandPalette } from '../lib/brandPalettes';
import { useBranding } from '../stores/brandingStore';
export function useBrandingSync(){
 useEffect(()=>{
  const refresh=()=>{void useBranding.getState().refresh();};refresh();
  const socket=getSocket();const update=(value:{palette?:unknown})=>{if(isBrandPalette(value?.palette))useBranding.setState({palette:value.palette});};
  socket?.on('appearance_updated',update);socket?.on('connect',refresh);
  const sub=AppState.addEventListener('change',state=>{if(state==='active')refresh();});
  return()=>{socket?.off('appearance_updated',update);socket?.off('connect',refresh);sub.remove();};
 },[]);
}
