import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getStoredToken,
  login as apiLogin,
  logout as apiLogout,
  removeStoredToken,
  setStoredToken,
} from '@/lib/api';
import { API_BASE_URL } from '@/constants/config';

type User = {
  id: number;
  name: string;
  email: string;
};

type SchoolLocation = {
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  roles: string[];
  permissions: string[];
  schoolLocation: SchoolLocation | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [schoolLocation, setSchoolLocation] = useState<SchoolLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Fetch /api/auth/me with an 8-second timeout to avoid indefinite hangs. */
  async function fetchMe(storedToken: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      return await fetch(`${API_BASE_URL}/api/auth/me`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${storedToken}`,
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  const refreshUser = useCallback(async () => {
    const storedToken = await getStoredToken();
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setRoles([]);
      setPermissions([]);
      setSchoolLocation(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetchMe(storedToken);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(storedToken);
        setRoles(data.roles ?? []);
        setPermissions(data.permissions ?? []);
        setSchoolLocation(data.school_location ?? null);
      } else {
        await removeStoredToken();
        setUser(null);
        setToken(null);
        setRoles([]);
        setPermissions([]);
        setSchoolLocation(null);
      }
    } catch {
      await removeStoredToken();
      setUser(null);
      setToken(null);
      setRoles([]);
      setPermissions([]);
      setSchoolLocation(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const storedToken = await getStoredToken();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setRoles([]);
        setPermissions([]);
        setSchoolLocation(null);
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetchMe(storedToken);
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(storedToken);
          setRoles(data.roles ?? []);
          setPermissions(data.permissions ?? []);
          setSchoolLocation(data.school_location ?? null);
        } else {
          await removeStoredToken();
          setUser(null);
          setToken(null);
          setRoles([]);
          setPermissions([]);
          setSchoolLocation(null);
        }
      } catch (error) {
        console.error('auth/me failed – clearing session', {
          url: `${API_BASE_URL}/api/auth/me`,
          error,
        });
        await removeStoredToken();
        setUser(null);
        setToken(null);
        setRoles([]);
        setPermissions([]);
        setSchoolLocation(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiLogin(identifier, password);
      await setStoredToken(data.token);
      setUser(data.user);
      setToken(data.token);
      setRoles(data.roles ?? []);
      setPermissions(data.permissions ?? []);
      setSchoolLocation(data.school_location ?? null);
    } catch (error) {
      console.error('AuthContext login error', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiLogout();
      setUser(null);
      setToken(null);
      setRoles([]);
      setPermissions([]);
      setSchoolLocation(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        roles,
        permissions,
        schoolLocation,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
