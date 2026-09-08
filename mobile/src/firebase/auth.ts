import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  GoogleAuthProvider,
  OAuthProvider,
  getReactNativePersistence,
  initializeAuth,
  signInWithCredential,
  type UserCredential,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { app } from './config';

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export function getGoogleOAuthConfig() {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  };
}

export function isGoogleSignInConfigured() {
  return Boolean(getGoogleOAuthConfig().webClientId);
}

export async function signInWithGoogleIdToken(idToken: string): Promise<UserCredential> {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function isAppleSignInAvailable() {
  if (Platform.OS !== 'ios') {
    return false;
  }

  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<UserCredential> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  const { identityToken } = appleCredential;
  if (!identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce,
  });

  return signInWithCredential(auth, credential);
}
