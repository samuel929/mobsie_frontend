import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../auth/AuthContext";
import { apiData } from "../services/api/client";
import { getExpoPushToken } from "./expoPush";

export function PushRegistration({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const registeredForToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || registeredForToken.current === token) return;

    let cancelled = false;
    void (async () => {
      try {
        const expoPushToken = await getExpoPushToken();
        if (!expoPushToken || cancelled) return;
        const storageKey = "mobsie.push-device-id";
        let deviceId = await AsyncStorage.getItem(storageKey);
        if (!deviceId) {
          deviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          await AsyncStorage.setItem(storageKey, deviceId);
        }

        await apiData("/mobile/push-tokens", {
          method: "POST",
          token,
          body: JSON.stringify({
            expoPushToken,
            platform: Platform.OS,
            deviceId,
          }),
        });
        if (!cancelled) registeredForToken.current = token;
      } catch (error) {
        console.warn("Expo push registration failed", error);
      }
    })();

     return () => { cancelled = true; };
  }, [token]);

   return <>{children}</>;
}
