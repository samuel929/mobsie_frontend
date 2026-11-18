import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { apiData } from './api/client';

const DEVICE_KEY = 'mobsie.device-id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
});

async function deviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const next = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_KEY, next);
  return next;
}

export async function registerExpoPushToken(token: string) {
  if (!Device.isDevice) return null;
  const current = await Notifications.getPermissionsAsync();
  const final = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (final.status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const expoToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  await apiData('/mobile/push-tokens', {
    method: 'POST',
    token,
    body: JSON.stringify({ expoPushToken: expoToken, platform: Platform.OS, deviceId: await deviceId() }),
  });
  return expoToken;
}
