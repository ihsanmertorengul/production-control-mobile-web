import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthResponse } from '@/types/api';

const AUTH_KEY = 'production-control-auth';

export async function saveAuth(auth: AuthResponse): Promise<void> {
  const value = JSON.stringify(auth);
  if (Platform.OS === 'web') {
    localStorage.setItem(AUTH_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(AUTH_KEY, value);
}

export async function loadAuth(): Promise<AuthResponse | null> {
  try {
    const value =
      Platform.OS === 'web'
        ? localStorage.getItem(AUTH_KEY)
        : await SecureStore.getItemAsync(AUTH_KEY);
    return value ? (JSON.parse(value) as AuthResponse) : null;
  } catch {
    return null;
  }
}

export async function clearAuth(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(AUTH_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_KEY);
}
