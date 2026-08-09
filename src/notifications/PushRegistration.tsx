import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
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

        await apiData("/mobile/push-tokens", {
          method: "POST",
          token,
          body: JSON.stringify({
            expoPushToken,
            platform: Platform.OS,
          }),
        });
        if (!cancelled) registeredForToken.current = token;
      } catch (error) {
        console.warn("Expo push registration failed", error);
      }
    })();

