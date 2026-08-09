import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import { environment } from '../config/environment';
import { apiData } from '../services/api/client';

type AuthValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>;
  updateProfile: (name: string, email: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);
type AuthResponse = { token: string; user: User };
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    AsyncStorage.multiGet(['mc_user', 'mc_token'])
      .then(async ([, [, storedToken]]) => {
        if (!storedToken) return;
        try {
          const result = await apiData<{ user: User }>('/mobile/auth/me', {
            token: storedToken,
          });
          setUser(result.user);
          setToken(storedToken);
          await AsyncStorage.setItem('mc_user', JSON.stringify(result.user));
        } catch {
          await AsyncStorage.multiRemove(['mc_user', 'mc_token']);
        }
      })
      .finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => {
    if (!environment.tenantId) throw new Error('EXPO_PUBLIC_TENANT_ID is not configured.');
    const result = await apiData<AuthResponse>('/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify({ tenantId: environment.tenantId, email: email.trim(), password }),
    });
    await AsyncStorage.multiSet([
      ['mc_user', JSON.stringify(result.user)],
      ['mc_token', result.token],
    ]);
    setUser(result.user);
    setToken(result.token);
  };
  const signup = async (name: string, email: string, phone: string, password: string) => {
    if (!environment.tenantId) throw new Error('EXPO_PUBLIC_TENANT_ID is not configured.');
    const normalizedPhone = phone.trim().replace(/[\s()-]/g, '');
    const result = await apiData<AuthResponse>('/mobile/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: environment.tenantId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        password,
      }),
    });
    await AsyncStorage.multiSet([
      ['mc_user', JSON.stringify(result.user)],
      ['mc_token', result.token],
    ]);
    setUser(result.user);
    setToken(result.token);
  };
  const updateProfile = async (name: string, email: string, phone: string) => {
    if (!token) throw new Error('Please sign in.');
    const result = await apiData<AuthResponse>('/mobile/auth/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }),
    });
    await AsyncStorage.multiSet([
      ['mc_user', JSON.stringify(result.user)],
      ['mc_token', result.token],
    ]);
    setUser(result.user);
    setToken(result.token);
  };
  const logout = async () => {
    await AsyncStorage.multiRemove(['mc_user', 'mc_token', 'mc_application']);
    setUser(null);
    setToken(null);
  };
  return (
    <AuthContext.Provider
      value={useMemo(
        () => ({ user, token, loading, login, signup, updateProfile, logout }),
        [user, token, loading],
      )}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
};
