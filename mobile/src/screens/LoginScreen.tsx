import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase/auth';
import { colors } from '../theme/colors';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== 'success') {
      return;
    }

    const idToken =
      response.params.id_token ?? response.authentication?.idToken;

    if (!idToken) {
      setError('Google sign-in did not return an ID token.');
      setSigningIn(false);
      return;
    }

    setSigningIn(true);
    setError(null);

    const credential = GoogleAuthProvider.credential(idToken);
    signInWithCredential(auth, credential).catch((err: Error) => {
      setError(err.message);
      setSigningIn(false);
    });
  }, [response]);

  async function handleGoogleSignIn() {
    setError(null);
    setSigningIn(true);

    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setSigningIn(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setSigningIn(false);
    }
  }

  const isDisabled = signingIn || !request;

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

      <Pressable
        style={[styles.button, isDisabled && styles.buttonDisabled]}
        onPress={handleGoogleSignIn}
        disabled={isDisabled}
      >
        {signingIn ? (
          <ActivityIndicator color={colors.navy} />
        ) : (
          <Text style={styles.buttonText}>Sign in with Google</Text>
        )}
      </Pressable>

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
    marginBottom: 48,
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
  button: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.navy,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
  },
  error: {
    marginTop: 16,
    color: colors.error,
    textAlign: 'center',
    maxWidth: 360,
  },
});
