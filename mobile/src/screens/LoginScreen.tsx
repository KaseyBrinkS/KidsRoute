import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  getGoogleOAuthConfig,
  isAppleSignInAvailable,
  isGoogleSignInConfigured,
  signInWithApple,
  signInWithGoogleIdToken,
} from '../firebase/auth';
import { colors } from '../theme/colors';

WebBrowser.maybeCompleteAuthSession();

type SignInMethod = 'google' | 'apple';

export function LoginScreen() {
  const [busyMethod, setBusyMethod] = useState<SignInMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const googleConfig = getGoogleOAuthConfig();
  const googleConfigured = isGoogleSignInConfigured();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleConfig.webClientId,
    iosClientId: googleConfig.iosClientId || undefined,
    androidClientId: googleConfig.androidClientId || undefined,
  });

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    if (response?.type !== 'success') {
      return;
    }

    const idToken =
      response.params.id_token ?? response.authentication?.idToken;

    if (!idToken) {
      setError('Google sign-in did not return an ID token.');
      setBusyMethod(null);
      return;
    }

    setBusyMethod('google');
    setError(null);

    signInWithGoogleIdToken(idToken).catch((err: Error) => {
      setError(err.message);
      setBusyMethod(null);
    });
  }, [response]);

  async function handleGoogleSignIn() {
    if (!googleConfigured) {
      setError('Google sign-in is not configured yet. Add OAuth client IDs to mobile/.env.');
      return;
    }

    setError(null);
    setBusyMethod('google');

    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setBusyMethod(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setBusyMethod(null);
    }
  }

  async function handleAppleSignIn() {
    setError(null);
    setBusyMethod('apple');

    try {
      await signInWithApple();
    } catch (err) {
      if (
        err instanceof Error &&
        'code' in err &&
        ((err as { code?: string }).code === 'ERR_CANCELED' ||
          (err as { code?: string }).code === 'ERR_REQUEST_CANCELED')
      ) {
        setBusyMethod(null);
        return;
      }

      setError(err instanceof Error ? err.message : 'Apple sign-in failed.');
      setBusyMethod(null);
    }
  }

  const isBusy = busyMethod !== null;
  const googleDisabled = isBusy || !request || !googleConfigured;

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <View style={styles.logoPin} />
          <Text style={styles.logoInitials}>KR</Text>
        </View>
        <Text style={styles.brand}>KidsRoute</Text>
        <Text style={styles.tagline}>Safe walks, together.</Text>
      </View>

      <Text style={styles.signInLabel}>Sign in to continue</Text>

      <Pressable
        style={[styles.googleButton, googleDisabled && styles.buttonDisabled]}
        onPress={handleGoogleSignIn}
        disabled={googleDisabled}
      >
        {busyMethod === 'google' ? (
          <ActivityIndicator color={colors.navy} />
        ) : (
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        )}
      </Pressable>

      {appleAvailable ? (
        <View
          pointerEvents={isBusy ? 'none' : 'auto'}
          style={[styles.appleButtonWrap, isBusy && styles.buttonDisabled]}
        >
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        </View>
      ) : null}

      {!googleConfigured && Platform.OS !== 'web' ? (
        <Text style={styles.setupHint}>
          Add Google OAuth client IDs to mobile/.env to enable sign-in.
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoMark: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoPin: {
    position: 'absolute',
    top: 14,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.rosyPink,
  },
  logoInitials: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  brand: {
    fontSize: 36,
    fontWeight: '600',
    color: colors.navy,
  },
  tagline: {
    marginTop: 8,
    fontSize: 18,
    color: colors.muted,
  },
  signInLabel: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
  googleButton: {
    width: '100%',
    maxWidth: 360,
    minHeight: 48,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dadce0',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButtonWrap: {
    width: '100%',
    maxWidth: 360,
    marginTop: 12,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3c4043',
  },
  setupHint: {
    marginTop: 16,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 360,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    marginTop: 16,
    color: colors.error,
    textAlign: 'center',
    maxWidth: 360,
  },
});
