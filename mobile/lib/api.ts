import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/config';

const TOKEN_KEY = 'auth_token';

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeStoredToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export interface LoginResponse {
  token: string;
  user: { id: number; name: string; email: string };
  roles: string[];
  permissions: string[];
}

export async function login(
  identifier: string,
  password: string
): Promise<LoginResponse> {
  const url = `${API_BASE_URL}/api/auth/login`;
  let res: Response;

  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
    });
  } catch (error) {
    console.error('Login network request failed', {
      url,
      baseUrl: API_BASE_URL,
      error,
    });
    throw new Error(
      'Network request failed while logging in. Make sure your phone can reach ' +
        url,
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (data as any).errors?.identifier?.[0] ??
      (data as any).message ??
      'Login failed';
    console.error('Login failed', { url, status: res.status, data });
    throw new Error(msg);
  }

  return data as LoginResponse;
}

export async function logout(): Promise<void> {
  const token = await getStoredToken();
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore network errors on logout
    }
    await removeStoredToken();
  }
}

export async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getStoredToken();
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
