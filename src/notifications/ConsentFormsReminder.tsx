import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef } from 'react';

import { useAuth } from '../auth/AuthContext';
import { consentFormTemplates } from '../data/consentForms';
import { useSchoolData } from '../data/SchoolContext';

const COMPLETED_FORMS_KEY = 'mobsie.completed-consent-forms';

function remoteFormIsSigned(form: any) {
  const status = String(form?.signatureStatus || form?.consentStatus || form?.status || '')
    .trim()
    .toUpperCase();
  return form?.signed === true || form?.completed === true || status === 'SIGNED';
}

function remoteFormForTemplate(forms: any[], template: { id: string; title: string }) {
  return forms.find(
    (form) =>
      String(form?.templateId || form?.slug || form?.id) === template.id ||
      String(form?.title || form?.name || '').trim().toLowerCase() ===
        template.title.toLowerCase(),
  );
}

async function clearNotification(notificationIdKey: string, lastShownKey: string) {
  const notificationId = await AsyncStorage.getItem(notificationIdKey);
  if (notificationId) {
    await Promise.allSettled([
      Notifications.cancelScheduledNotificationAsync(notificationId),
      Notifications.dismissNotificationAsync(notificationId),
    ]);
  }
  await AsyncStorage.multiRemove([notificationIdKey, lastShownKey]);
}

/**
 * Shows one device notification when an enrolled parent first lands in the app
 * with required consent forms outstanding. The notification is removed and no
 * longer recreated once every form has been signed.
 */
export function ConsentFormsReminder() {
  const { user } = useAuth();
  const { forms, students, applications, loading } = useSchoolData();
  const handledThisSession = useRef(false);

  useEffect(() => {
    if (!user?.id || loading) return;

    let cancelled = false;
    const notificationIdKey = `mobsie.forms-reminder.notification.${user.id}`;
    const lastShownKey = `mobsie.forms-reminder.last-shown.${user.id}`;
    const isEnrolled = students.some((student) =>
      ['ENROLLED', 'ACTIVE'].includes(String(student.enrollmentStatus).toUpperCase()),
    );
    const hasApprovedApplication = applications.some((application) =>
      ['APPROVED', 'ENROLLED'].includes(String(application.status).toUpperCase()),
    );
    const formsAreUnlocked =
      user.accessState === 'APPROVED' && isEnrolled && hasApprovedApplication;

    void (async () => {
      if (!formsAreUnlocked) {
        // Do not remind users who cannot open the forms yet.
        return;
      }

      let locallyCompleted: Record<string, unknown> = {};
      try {
        const stored = await AsyncStorage.getItem(COMPLETED_FORMS_KEY);
        const parsed = stored ? JSON.parse(stored) : {};
        locallyCompleted = Array.isArray(parsed)
          ? Object.fromEntries(parsed.map((id: string) => [id, true]))
          : parsed || {};
      } catch {
        locallyCompleted = {};
      }

      const unsigned = consentFormTemplates.filter((template) => {
        if (locallyCompleted[template.id]) return false;
        const remote = remoteFormForTemplate(forms, template);
        return !remoteFormIsSigned(remote);
      });

      if (!unsigned.length) {
        handledThisSession.current = true;
        await clearNotification(notificationIdKey, lastShownKey);
        return;
      }

      if (handledThisSession.current || cancelled) return;
      const today = new Date().toISOString().slice(0, 10);
      const lastShown = await AsyncStorage.getItem(lastShownKey);
      if (lastShown === today) {
        handledThisSession.current = true;
        return;
      }

      const currentPermissions = await Notifications.getPermissionsAsync();
      const permissions = currentPermissions.granted
        ? currentPermissions
        : await Notifications.requestPermissionsAsync();
      if (!permissions.granted || cancelled) return;

      const oldNotificationId = await AsyncStorage.getItem(notificationIdKey);
      if (oldNotificationId) {
        await Notifications.dismissNotificationAsync(oldNotificationId).catch(() => undefined);
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Forms & consent need your signature',
          body:
            unsigned.length === 1
              ? 'You have 1 required form waiting to be signed. Tap to review it.'
              : `You have ${unsigned.length} required forms waiting to be signed. Tap to review them.`,
          sound: true,
          data: { screen: 'Forms' },
        },
        trigger: null,
      });

      if (cancelled) {
        await Notifications.dismissNotificationAsync(notificationId).catch(() => undefined);
        return;
      }
      handledThisSession.current = true;
      await AsyncStorage.multiSet([
        [notificationIdKey, notificationId],
        [lastShownKey, today],
      ]);
    })().catch((error) => {
      console.warn('[Mobsie] Consent reminder could not be shown:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [applications, forms, loading, students, user?.accessState, user?.id]);

  return null;
}
