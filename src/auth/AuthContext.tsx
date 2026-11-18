import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import { environment } from '../config/environment';
import { apiData } from '../services/api/client';

type AuthValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  loggedOut: boolean;
  onboardingRoute: OnboardingRoute | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>;
  updateProfile: (name: string, email: string, phone: string) => Promise<void>;
  refreshSession: () => Promise<User | null>;
  markPendingApproval: (reference?: string | null) => void;
  markApproved: () => void;
  setOnboardingRoute: (route: OnboardingRoute) => Promise<void>;
  logout: () => Promise<void>;
};
export type OnboardingRoute =
  'ApplicationOne' | 'ApplicationTwo' | 'ApplicationReview' | 'ApplicationSuccess' | 'Enrollment';
const AuthContext = createContext<AuthValue | null>(null);
type AuthResponse = { token: string; user: User };
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [onboardingRoute, setOnboardingRouteState] = useState<OnboardingRoute | null>(null);
  useEffect(() => {
    AsyncStorage.multiGet(['mc_user', 'mc_token', 'mc_onboarding_route'])
      .then(async ([, [, storedToken], [, storedOnboardingRoute]]) => {
        if (!storedToken) return;
        try {
          const result = await apiData<{ user: User }>('/mobile/auth/me', {
            token: storedToken,
          });
          setUser(result.user);
          setToken(storedToken);
          if (
            result.user.accessState === 'NO_APPLICATION' ||
            result.user.accessState === 'APPLICATION_IN_PROGRESS'
          ) {
            setOnboardingRouteState(
              (storedOnboardingRoute as OnboardingRoute | null) ?? 'ApplicationOne',
            );
          } else {
            setOnboardingRouteState(null);
            await AsyncStorage.removeItem('mc_onboarding_route');
          }
          await AsyncStorage.setItem('mc_user', JSON.stringify(result.user));
        } catch {
          await AsyncStorage.multiRemove(['mc_user', 'mc_token', 'mc_onboarding_route']);
        }
      })
      .finally(() => setLoading(false));
  }, []);
  const persistOnboardingRoute = useCallback(async (route: OnboardingRoute) => {
    setOnboardingRouteState(route);
    await AsyncStorage.setItem('mc_onboarding_route', route);
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
    if (
      result.user.accessState === 'NO_APPLICATION' ||
      result.user.accessState === 'APPLICATION_IN_PROGRESS'
    ) {
      const savedRoute = await AsyncStorage.getItem('mc_onboarding_route');
      await persistOnboardingRoute((savedRoute as OnboardingRoute | null) ?? 'ApplicationOne');
    } else {
      setOnboardingRouteState(null);
      await AsyncStorage.removeItem('mc_onboarding_route');
    }
    setLoggedOut(false);
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
      ['mc_onboarding_route', 'ApplicationOne'],
    ]);
    setUser(result.user);
    setToken(result.token);
    setOnboardingRouteState('ApplicationOne');
    setLoggedOut(false);
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
  const refreshSession = useCallback(async () => {
    if (!token) return null;
    const result = await apiData<{ user: User }>('/mobile/auth/me', { token });
    setUser(result.user);
    await AsyncStorage.setItem('mc_user', JSON.stringify(result.user));
    return result.user;
  }, [token]);
  const markPendingApproval = useCallback((reference?: string | null) => {
    setOnboardingRouteState(null);
    AsyncStorage.removeItem('mc_onboarding_route').catch(() => undefined);
    setUser((current) => {
      if (!current) return current;
      const updated: User = {
        ...current,
        applicationStatus: 'PENDING_REVIEW',
        applicationReference: reference ?? current.applicationReference ?? null,
        accessState: 'PENDING_APPROVAL',
      };
      AsyncStorage.setItem('mc_user', JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, []);
  const markApproved = useCallback(() => {
    setOnboardingRouteState(null);
    AsyncStorage.removeItem('mc_onboarding_route').catch(() => undefined);
    setUser((current) => {
      if (!current) return current;
      const updated: User = {
        ...current,
        applicationStatus: 'APPROVED',
        accessState: 'APPROVED',
      };
      AsyncStorage.setItem('mc_user', JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, []);
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'mc_user',
        'mc_token',
        'mc_application',
        'mc_onboarding_route',
      ]);
    } finally {
      setUser(null);
      setToken(null);
      setLoggedOut(true);
      setOnboardingRouteState(null);
    }
  };
  return (
    <AuthContext.Provider
      value={useMemo(
        () => ({
          user,
          token,
          loading,
          loggedOut,
          onboardingRoute,
          login,
          signup,
          updateProfile,
          refreshSession,
          markPendingApproval,
          markApproved,
          setOnboardingRoute: persistOnboardingRoute,
          logout,
        }),
        [
          user,
          token,
          loading,
          loggedOut,
          onboardingRoute,
          refreshSession,
          markPendingApproval,
          markApproved,
          persistOnboardingRoute,
        ],
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
