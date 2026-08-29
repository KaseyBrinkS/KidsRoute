import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { app } from './config';

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
