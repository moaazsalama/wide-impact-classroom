/**
 * Runtime configuration. EXPO_PUBLIC_* variables are inlined at bundle time,
 * so they must be referenced statically (no dynamic `process.env[key]`).
 */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const apiUrl = stripTrailingSlash(nonEmpty(process.env.EXPO_PUBLIC_API_URL) ?? 'http://10.0.2.2:4000');

export const env = {
  /** Backend origin, e.g. http://10.0.2.2:4000 */
  apiUrl,
  /** Versioned REST base, e.g. http://10.0.2.2:4000/api/v1 */
  apiBaseUrl: `${apiUrl}/api/v1`,
  googleWebClientId: nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  googleIosClientId: nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
  enableDevLogin: process.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN === 'true',
} as const;
