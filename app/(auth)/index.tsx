import { Redirect } from 'expo-router';

/** Default auth route — always use email login screen */
export default function AuthIndex() {
  return <Redirect href="/(auth)/login" />;
}
