import Constants from 'expo-constants';

/**
 * API base URL for the Laravel backend.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_URL from env (recommended for production / staging).
 * 2. Infer LAN IP from Expo dev server hostUri and use port 8000 (preferred for local dev).
 * 3. Fallback to http://localhost:8000 (for simulators hitting local machine).
 */
const inferredHost = (() => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0]; // e.g. 192.168.1.10 from 192.168.1.10:19000
  return host ? `http://${host}:8000` : null;
})();

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  inferredHost ??
  'http://localhost:8000';
