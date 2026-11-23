import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

import { env } from '@/config/env';

export const isGoogleSignInConfigured = Boolean(env.googleWebClientId);

let configured = false;

function ensureConfigured(): void {
  if (configured || !env.googleWebClientId) return;
  GoogleSignin.configure({
    // The web client ID is what makes Google return an ID token the backend can verify.
    webClientId: env.googleWebClientId,
    iosClientId: env.googleIosClientId,
    scopes: ['profile', 'email'],
  });
  configured = true;
}

export type GoogleIdTokenResult =
  | { type: 'success'; idToken: string }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

/** Runs the native Google flow and returns the ID token to exchange with the backend. */
export async function getGoogleIdToken(): Promise<GoogleIdTokenResult> {
  if (!env.googleWebClientId) {
    return { type: 'error', message: 'Google sign-in is not configured for this build.' };
  }
  ensureConfigured();

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { type: 'cancelled' };

    const idToken = response.data.idToken;
    if (!idToken) {
      return { type: 'error', message: 'Google did not return an ID token. Check the web client ID.' };
    }
    return { type: 'success', idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return { type: 'cancelled' };
        case statusCodes.IN_PROGRESS:
          return { type: 'error', message: 'Google sign-in is already in progress.' };
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return {
            type: 'error',
            message: 'Google Play Services is missing or out of date on this device.',
          };
        default:
          break;
      }
    }
    return {
      type: 'error',
      message: error instanceof Error ? error.message : 'Google sign-in failed. Please try again.',
    };
  }
}

export async function signOutFromGoogle(): Promise<void> {
  if (!env.googleWebClientId) return;
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // Best-effort only.
  }
}
