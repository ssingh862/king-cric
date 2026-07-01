import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { colors, radius, shadows } from '../../src/lib/theme';
import { isApiConfigured, checkApiHealth, API_URL } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function LoginScreen() {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [apiStatus, setApiStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) return;
    void checkApiHealth().then(({ ok, message }) => {
      if (!ok) setApiStatus(message);
    });
  }, []);

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    resetMessages();
  };

  const handleSubmit = async () => {
    resetMessages();

    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      const { error: err } = await resetPassword(email);
      setLoading(false);
      if (err) setError(err);
      else setSuccess('Password reset link sent! Check your email.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError('Enter your name');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    if (mode === 'signin') {
      const { error: err } = await signInWithEmail(email, password);
      setLoading(false);
      Keyboard.dismiss();
      if (err) {
        setError(err);
        return;
      }
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        router.replace('/(tabs)');
      }
      return;
    }

    const { error: err, needsConfirmation } = await signUpWithEmail(
      email,
      password,
      fullName
    );
    setLoading(false);
    if (err) setError(err);
    else if (needsConfirmation) {
      setSuccess('Account created! Check your email to verify, then sign in.');
      switchMode('signin');
    }
  };

  const title =
    mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password';

  const subtitle =
    mode === 'signin'
      ? 'Sign in with your email to continue'
      : mode === 'signup'
        ? 'Join KingCric — scores, leagues & more'
        : "We'll email you a link to reset your password";

  const buttonTitle =
    mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FFF7ED', '#F8FAFC', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            <Animated.View entering={FadeInUp.duration(800)} style={styles.brand}>
              <View style={styles.logoRing}>
                <LinearGradient colors={[colors.orange, colors.pink]} style={styles.logoInner}>
                  <Ionicons name="baseball" size={36} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.appName}>KingCric</Text>
              <Text style={styles.tagline}>Local tournaments. Live scores. One platform.</Text>
            </Animated.View>

            {!isApiConfigured() && (
              <View style={styles.configWarning}>
                <Ionicons name="warning-outline" size={18} color={colors.gold} />
                <Text style={styles.configWarningText}>
                  Add EXPO_PUBLIC_API_URL to .env, then restart with: npx expo start -c
                </Text>
              </View>
            )}

            {apiStatus ? (
              <View style={styles.configWarning}>
                <Ionicons name="cloud-offline-outline" size={18} color={colors.live} />
                <Text style={styles.configWarningText}>
                  {apiStatus}
                  {'\n'}API: {API_URL}
                </Text>
              </View>
            ) : null}

            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
              <View style={styles.modeTabs}>
                <Pressable
                  style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
                  onPress={() => switchMode('signin')}
                >
                  <Text style={[styles.modeTabText, mode === 'signin' && styles.modeTabTextActive]}>
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
                  onPress={() => switchMode('signup')}
                >
                  <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>
                    Sign Up
                  </Text>
                </Pressable>
              </View>

              <View style={styles.emailBadge}>
                <Ionicons name="mail" size={14} color={colors.orange} />
                <Text style={styles.emailBadgeText}>Email login (not phone OTP)</Text>
              </View>

              <Animated.View entering={FadeIn} key={mode}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSub}>{subtitle}</Text>
              </Animated.View>

              {mode === 'signup' && (
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={20} color={colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor={colors.textDim}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={20} color={colors.textDim} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={colors.textDim}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>

              {mode !== 'forgot' && (
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.textDim}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={colors.textDim}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete={mode === 'signin' ? 'password' : 'new-password'}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              )}

              {mode === 'signin' && (
                <Pressable onPress={() => switchMode('forgot')} style={styles.forgotLink}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {success ? <Text style={styles.success}>{success}</Text> : null}

              <GradientButton
                title={buttonTitle}
                onPress={handleSubmit}
                loading={loading}
                style={{ marginTop: 20 }}
              />

              {mode === 'forgot' && (
                <GradientButton
                  title="Back to Sign In"
                  onPress={() => switchMode('signin')}
                  variant="outline"
                  style={{ marginTop: 12 }}
                />
              )}
            </Animated.View>

            <Animated.Text entering={FadeIn.delay(500)} style={styles.legal}>
              By continuing, you agree to our Terms & Privacy Policy
            </Animated.Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoRing: {
    padding: 3,
    borderRadius: 50,
    backgroundColor: colors.orangeLight,
    marginBottom: 16,
    ...shadows.card,
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.cardLg,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  modeTabActive: {
    backgroundColor: colors.card,
    ...shadows.card,
  },
  modeTabText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: colors.orange,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.orangeLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.25)',
  },
  emailBadgeText: { color: colors.orange, fontSize: 12, fontWeight: '700' },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  cardSub: { color: colors.textMuted, fontSize: 14, marginTop: 6, marginBottom: 20 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 16,
  },
  eyeBtn: { padding: 4 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 4 },
  forgotText: { color: colors.orange, fontSize: 13, fontWeight: '600' },
  error: { color: colors.live, fontSize: 13, marginTop: 12, lineHeight: 18 },
  success: { color: colors.green, fontSize: 13, marginTop: 12, lineHeight: 18 },
  legal: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 16,
  },
  configWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  configWarningText: {
    flex: 1,
    color: colors.gold,
    fontSize: 12,
    lineHeight: 17,
  },
});
