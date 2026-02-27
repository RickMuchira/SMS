/**
 * API base URL for the Laravel backend.
 * - iOS Simulator / Android Emulator: use localhost or 10.0.2.2 (Android) for 127.0.0.1
 * - Physical device: use your computer's local IP (e.g. http://192.168.1.100:8000)
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
