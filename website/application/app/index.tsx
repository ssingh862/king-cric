import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
export default function Index() {
  const {isLoading,isAuthenticated}=useAuthStore();
  if(isLoading)return null;
  return <Redirect href={isAuthenticated?'/(tabs)':'/(auth)/login'} />;
}
