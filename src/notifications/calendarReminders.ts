import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const STORAGE_KEY = 'mobsie.calendar-reminders.v1';
const CHANNEL_ID = 'calendar-reminders';

type StoredReminder = {
  notificationId: string;
  scheduledFor: string;
};

type StoredReminders = Record<string, StoredReminder>;

export type CalendarReminderEvent = {
  id: string;
  title: string;
  startsAt: Date;
  branchName?: string | null;
};

async function readReminders(): Promise<StoredReminders> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (!value) return {};
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeReminders(reminders: StoredReminders) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

export async function getEnabledCalendarReminderIds(): Promise<Set<string>> {
  const reminders = await readReminders();
  let scheduledIds: Set<string> | null = null;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    scheduledIds = new Set(scheduled.map((item) => item.identifier));
  } catch {
    // Some preview environments cannot enumerate notifications. In that case,
    // preserve the saved state instead of making an enabled toggle disappear.
  }

  const now = Date.now();
  const valid = Object.entries(reminders).filter(([, reminder]) => {
    const isFuture = new Date(reminder.scheduledFor).getTime() > now;
    const isScheduled = scheduledIds === null || scheduledIds.has(reminder.notificationId);
    return isFuture && isScheduled;
  });

  if (valid.length !== Object.keys(reminders).length) {
    await writeReminders(Object.fromEntries(valid));
  }

  return new Set(valid.map(([eventId]) => eventId));
}

export async function scheduleCalendarReminder(event: CalendarReminderEvent) {
  const scheduledFor = new Date(event.startsAt.getTime() - 24 * 60 * 60 * 1000);
  if (scheduledFor.getTime() <= Date.now()) {
    throw new Error('A one-day reminder can only be enabled more than 24 hours before the event.');
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissions =
    currentPermissions.status === 'granted'
      ? currentPermissions
      : await Notifications.requestPermissionsAsync();
  if (!permissions.granted) {
    throw new Error('Please allow notifications in your device settings to enable this reminder.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Calendar reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const reminders = await readReminders();
  const previous = reminders[event.id];
  if (previous) {
    await Notifications.cancelScheduledNotificationAsync(previous.notificationId).catch(() => {});
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Tomorrow: ${event.title}`,
      body: `${event.title} is tomorrow${event.branchName ? ` at ${event.branchName}` : ''}.`,
      sound: true,
      data: { screen: 'Calendar', eventId: event.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledFor,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });

  // Do not show an enabled toggle unless the native scheduler confirms that
  // the notification exists. This catches device/preview builds that accept
  // the API call but cannot actually schedule notifications.
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (!scheduled.some((item) => item.identifier === notificationId)) {
      throw new Error(
        'Your device could not schedule this reminder. Please check notification settings.',
      );
    }
  } catch (error) {
    // Enumeration is unavailable in some preview clients. Preserve a genuine
    // verification failure, but do not reject a successful schedule merely
    // because that optional API is missing.
    if (error instanceof Error && error.message.startsWith('Your device could not')) throw error;
  }

  reminders[event.id] = { notificationId, scheduledFor: scheduledFor.toISOString() };
  await writeReminders(reminders);
  return scheduledFor;
}

export async function cancelCalendarReminder(eventId: string) {
  const reminders = await readReminders();
  const reminder = reminders[eventId];
  if (reminder) {
    await Notifications.cancelScheduledNotificationAsync(reminder.notificationId).catch(() => {});
    delete reminders[eventId];
    await writeReminders(reminders);
  }
}
