import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Branch, TeamMember, useApplication } from '../../application/ApplicationContext';
import { images } from '../../assets';
import { AppHeader } from '../../components/AppChrome';
import { Avatar, Button, Card, Field, Screen, SectionTitle } from '../../components/ui';
import { colors, radius, shadow } from '../../theme';
import { useAuth } from '../../auth/AuthContext';
import { useSchoolData } from '../../data/SchoolContext';
import { formatZar, publicFeeStructure } from '../../data/schoolPackages';
import {
  cancelCalendarReminder,
  getEnabledCalendarReminderIds,
  scheduleCalendarReminder,
} from '../../notifications/calendarReminders';
import { displayReference } from '../../utils/reference';
import { personNameCase, sentenceCase } from '../../utils/text';
import { apiData } from '../../services/api/client';

function parseApiDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  // PostgreSQL text timestamps can contain a space and short timezone (+00),
  // which Hermes does not parse consistently on iOS and Android.
  const normalized =
    typeof value === 'string'
      ? value
          .trim()
          .replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
          .replace(/([+-]\d{2})$/, '$1:00')
      : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function eventStartDate(event: { startsAt?: unknown } & Record<string, unknown>): Date | null {
  return parseApiDate(event.startsAt ?? event.starts_at ?? event.startDate ?? event.date);
}

function formatMessageTimestamp(value: unknown) {
  const date = parseApiDate(value);
  if (!date) return 'Just now';

  const time = date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return time;

  return `${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} · ${time}`;
}

const branchFacilities = [
  { label: 'Classroom', icon: 'desktop-outline' },
  { label: 'Playground', icon: 'game-controller-outline' },
  { label: 'Library', icon: 'book-outline' },
  { label: 'Pool', icon: 'water-outline' },
  { label: 'Garden', icon: 'leaf-outline' },
  { label: 'Art Studio', icon: 'color-palette-outline' },
] as const;

async function openBranchDirections(branch: Branch) {
  const destination = encodeURIComponent(`${branch.name}, ${branch.address}`);
  const mapsUrl =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?q=${destination}`
      : `https://www.google.com/maps/search/?api=1&query=${destination}`;

  try {
    const supported = await Linking.canOpenURL(mapsUrl);
    if (!supported) throw new Error('Maps is unavailable on this device.');
    await Linking.openURL(mapsUrl);
  } catch {
    Alert.alert(
      'Directions unavailable',
      'Unable to open maps. Please try again when a maps app is installed.',
    );
  }
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { students, academics, loading, refresh, activeChild } = useSchoolData();
  const student = students[0];
  const records = academics.filter((record) => record.studentId === student?.id);
  const average = records.length
    ? Math.round(records.reduce((sum, item) => sum + item.score, 0) / records.length)
    : 0;
  return (
    <Screen onRefresh={refresh}>
      <AppHeader />
      <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'Parent'}!</Text>
      <Text style={styles.homeDate}>
        {new Date().toLocaleDateString('en-ZA', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </Text>
      <ChildAccountSwitcher />
      <ChildCard student={student} profile={activeChild} parentName={user?.name} />
      {loading && <ActivityIndicator color={colors.green} />}
      <View style={styles.quickGrid}>
        {(
          [
            ['Calendar', 'calendar', colors.green2, () => navigation.navigate('Calendar')],
            [
              'Daily Activity',
              'document-text',
              colors.orange,
              () => navigation.navigate('DailyActivity'),
            ],
            ['Attendance', 'bar-chart', colors.amber, () => navigation.navigate('StudentReport')],
            ['Messages', 'chatbubble-outline', colors.blue, () => navigation.navigate('Messages')],
          ] as const
        ).map(([title, icon, color, onPress]) => (
          <Pressable
            key={String(title)}
            style={[styles.quickTile, { backgroundColor: String(color) }]}
            onPress={onPress as any}
          >
            <Ionicons name={icon as any} size={31} color="#fff" />
            <Text style={styles.quickText}>{String(title)}</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle title="Progress Overview" />
      <Card style={styles.messageCard}>
        <View style={styles.ring}>
          <Text style={styles.ringValue}>{average}%</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Teacher Message</Text>
          <Text style={styles.body}>
            {records.find((item) => item.teacherComment)?.teacherComment ??
              'Academic updates from the dashboard will appear here.'}
          </Text>
          <Text style={styles.more}>Show more</Text>
        </View>
      </Card>
    </Screen>
  );
}

export function CalendarScreen({ route }: { route?: { params?: { eventId?: string } } }) {
  const { events, loading, refresh } = useSchoolData();
  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        event,
        startsOn: eventStartDate(event as typeof event & Record<string, unknown>),
      })),
    [events],
  );
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    route?.params?.eventId ?? null,
  );
  const [reminderEventIds, setReminderEventIds] = useState<Set<string>>(new Set());
  const [reminderBusy, setReminderBusy] = useState(false);
  const reminderStateVersion = useRef(0);
  const featured =
    calendarEvents.find((item) => item.event.id === selectedEventId) ??
    calendarEvents.find((item) => {
      const date = item.startsOn;
      return (
        date &&
        date.getFullYear() === visibleMonth.getFullYear() &&
        date.getMonth() === visibleMonth.getMonth()
      );
    });

  useEffect(() => {
    const requestedVersion = reminderStateVersion.current;
    void getEnabledCalendarReminderIds().then((ids) => {
      // Do not let the initial storage read overwrite a toggle that the user
      // changed while the calendar was still loading.
      if (reminderStateVersion.current === requestedVersion) setReminderEventIds(ids);
    });
  }, []);

  useEffect(() => {
    const requestedEvent = calendarEvents.find((item) => item.event.id === route?.params?.eventId);
    if (!requestedEvent?.startsOn) return;
    setSelectedEventId(requestedEvent.event.id);
    setVisibleMonth(
      new Date(requestedEvent.startsOn.getFullYear(), requestedEvent.startsOn.getMonth(), 1),
    );
  }, [calendarEvents, route?.params?.eventId]);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = new Date(year, month, 1).getDay();
  const eventDays = useMemo(
    () =>
      new Set(
        calendarEvents
          .map((item) => item.startsOn)
          .filter(
            (date): date is Date =>
              date !== null && date.getFullYear() === year && date.getMonth() === month,
          )
          .map((date) => date.getDate()),
      ),
    [calendarEvents, month, year],
  );

  const eventsForDay = (day: number) =>
    calendarEvents.filter(
      (item) =>
        item.startsOn?.getFullYear() === year &&
        item.startsOn.getMonth() === month &&
        item.startsOn.getDate() === day,
    );

  const selectEvent = (eventId: string, startsOn: Date | null) => {
    setSelectedEventId(eventId);
    if (startsOn) {
      setVisibleMonth(new Date(startsOn.getFullYear(), startsOn.getMonth(), 1));
    }
  };

  const toggleReminder = async (enabled: boolean) => {
    if (!featured?.startsOn || reminderBusy) return;
    const eventId = featured.event.id;
    reminderStateVersion.current += 1;

    // Reflect the user's action immediately. If the operating system refuses
    // the notification, the catch block restores the previous state.
    setReminderEventIds((current) => {
      const next = new Set(current);
      if (enabled) next.add(eventId);
      else next.delete(eventId);
      return next;
    });
    setReminderBusy(true);
    try {
      if (enabled) {
        const scheduledFor = await scheduleCalendarReminder({
          id: eventId,
          title: featured.event.title,
          startsAt: featured.startsOn,
          branchName: featured.event.branchName,
        });
        Alert.alert(
          'Reminder set',
          `You will be reminded on ${scheduledFor.toLocaleString('en-ZA')}.`,
        );
      } else {
        await cancelCalendarReminder(eventId);
      }
    } catch (error) {
      setReminderEventIds((current) => {
        const next = new Set(current);
        if (enabled) next.delete(eventId);
        else next.add(eventId);
        return next;
      });
      Alert.alert(
        'Reminder unavailable',
        error instanceof Error ? error.message : 'Unable to update the reminder. Please try again.',
      );
    } finally {
      setReminderBusy(false);
    }
  };

  const changeMonth = (offset: number) => {
    setSelectedEventId(null);
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <Screen
      onRefresh={async () => {
        await refresh();
        setReminderEventIds(await getEnabledCalendarReminderIds());
      }}
    >
      <AppHeader title="Calendar" />
      {loading && <ActivityIndicator color={colors.green} />}
      <Card style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => changeMonth(-1)} hitSlop={12}>
            <Ionicons name="chevron-back" size={19} color={colors.muted} />
          </Pressable>
          <Text style={styles.calendarMonth}>
            {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable onPress={() => changeMonth(1)} hitSlop={12}>
            <Ionicons name="chevron-forward" size={19} color={colors.muted} />
          </Pressable>
        </View>
        <View style={styles.calendarGrid}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={`${day}-${index}`} style={[styles.weekday, styles.weekdayMuted]}>
              {day}
            </Text>
          ))}
          {Array.from({ length: leadingEmptyDays }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.date} />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
            const hasEvent = eventDays.has(day);
            const isSelected =
              featured?.startsOn?.getFullYear() === year &&
              featured.startsOn.getMonth() === month &&
              featured.startsOn.getDate() === day;
            return (
              <Pressable
                key={day}
                style={styles.date}
                disabled={!hasEvent}
                accessibilityRole={hasEvent ? 'button' : undefined}
                accessibilityLabel={hasEvent ? `Select event on ${day}` : undefined}
                onPress={() => {
                  const eventOnDay = eventsForDay(day)[0];
                  if (eventOnDay) selectEvent(eventOnDay.event.id, eventOnDay.startsOn);
                }}
              >
                <View
                  style={[
                    styles.dateBadge,
                    hasEvent && styles.greenDate,
                    isSelected && styles.selectedDate,
                  ]}
                >
                  <Text style={[styles.calendarDateText, hasEvent && styles.white]}>{day}</Text>
                  {isSelected && <Ionicons name="notifications-outline" size={8} color="#fff" />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {featured && (
        <Card style={styles.eventCard}>
          <Text style={styles.whiteTitle}>{featured.event.title} Reminder</Text>
          <View style={styles.eventContent}>
            <View style={styles.eventIcon}>
              <Ionicons name="calendar" size={30} color={colors.green} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.featuredTitle}>{featured.event.title}</Text>
              <Text style={styles.whiteBody}>
                {featured.startsOn?.toLocaleString() ?? 'Date unavailable'}
                {`\n`}
                {featured.event.branchName || 'All branches'}
              </Text>
            </View>
          </View>
          {!!featured.event.description && (
            <Text style={styles.whiteBody} numberOfLines={3}>
              {featured.event.description}
            </Text>
          )}
          <View style={styles.reminderRow}>
            <Switch
              value={reminderEventIds.has(featured.event.id)}
              onValueChange={(enabled) => void toggleReminder(enabled)}
              disabled={reminderBusy}
              trackColor={{ false: 'rgba(255,255,255,0.38)', true: '#706AF2' }}
              thumbColor="#fff"
              ios_backgroundColor="rgba(255,255,255,0.38)"
              accessibilityLabel={`Remind me one day before ${featured.event.title}`}
            />
            <Pressable
              hitSlop={10}
              disabled={reminderBusy}
              onPress={() => void toggleReminder(!reminderEventIds.has(featured.event.id))}
            >
              <Text style={styles.reminderText}>
                {reminderBusy
                  ? 'Updating…'
                  : reminderEventIds.has(featured.event.id)
                    ? '1 Day Before · On'
                    : '1 Day Before · Off'}
              </Text>
            </Pressable>
          </View>
        </Card>
      )}

      <SectionTitle title="Events" />
      {calendarEvents.map(({ event, startsOn }, index) => (
        <Pressable
          key={event.id}
          onPress={() => selectEvent(event.id, startsOn)}
          accessibilityRole="button"
          accessibilityLabel={`View ${event.title}`}
        >
          <Card style={[styles.listRow, selectedEventId === event.id && styles.selectedEventRow]}>
            <View style={[styles.upcomingIcon, index % 2 === 1 && styles.upcomingIconPurple]}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={index % 2 === 1 ? colors.purple : colors.orange}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{event.title}</Text>
              <Text style={styles.body}>
                {startsOn?.toLocaleString() ?? 'Date unavailable'}
                {' · '}
                {event.branchName || 'All branches'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" color={colors.muted} />
          </Card>
        </Pressable>
      ))}
      {!loading && !calendarEvents.length && (
        <Card>
          <Text style={styles.body}>No events have been added.</Text>
        </Card>
      )}
    </Screen>
  );
}

type ParentInvoice = {
  id: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  issuedOn: string;
  dueOn: string;
  status: 'DUE' | 'OVERDUE' | 'PAID';
  paidAt?: string | null;
  branchName?: string | null;
};

const invoiceMoney = (cents: number) =>
  `R ${(Number(cents || 0) / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const invoiceDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = parseApiDate(value);
  return parsed ? parsed.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : value;
};

export function InvoicesScreen() {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<ParentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ParentInvoice | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'OVERDUE'>('ALL');
  const [query, setQuery] = useState('');

  const loadInvoices = React.useCallback(async () => {
    if (!token) return;
    try {
      setInvoices(await apiData<ParentInvoice[]>('/mobile/invoices', { token, forceRefresh: true, cacheTtlMs: 0 }));
    } catch (error) {
      Alert.alert('Unable to load invoices', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(React.useCallback(() => { void loadInvoices(); }, [loadInvoices]));
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('invoices/payment/')) void loadInvoices();
    });
    return () => subscription.remove();
  }, [loadInvoices]);

  const outstanding = invoices
    .filter((invoice) => invoice.status !== 'PAID')
    .reduce((total, invoice) => total + Number(invoice.amountCents || 0), 0);
  const visible = invoices.filter((invoice) => {
    if (filter === 'PAID' && invoice.status !== 'PAID') return false;
    if (filter === 'OVERDUE' && invoice.status !== 'OVERDUE') return false;
    if (filter === 'PENDING' && !['DUE', 'OVERDUE'].includes(invoice.status)) return false;
    const term = query.trim().toLowerCase();
    return !term || `${invoice.invoiceNumber} ${invoice.description}`.toLowerCase().includes(term);
  });

  const payInvoice = async (invoice: ParentInvoice) => {
    if (!token || payingId) return;
    setPayingId(invoice.id);
    try {
      const result = await apiData<{ checkoutUrl: string }>(`/mobile/invoices/${invoice.id}/payfast`, {
        method: 'POST', token,
        body: JSON.stringify({ returnUrl: 'mobsieconnect://invoices/payment/return' }),
      });
      await Linking.openURL(result.checkoutUrl);
    } catch (error) {
      Alert.alert('Payment could not start', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <Screen onRefresh={loadInvoices}>
      <AppHeader title="Invoices" />
      <Text style={styles.invoiceSubheading}>{invoices.length} invoice{invoices.length === 1 ? '' : 's'}</Text>
      <Card style={styles.invoiceBalanceCard}>
        <Text style={styles.invoiceBalanceLabel}>Total amount owing</Text>
        <Text style={styles.invoiceBalanceValue}>{invoiceMoney(outstanding)}</Text>
        <Text style={styles.invoiceBalanceHint}>Across all pending and overdue invoices</Text>
      </Card>
      <View style={styles.invoiceSearch}>
        <Ionicons name="search-outline" size={18} color="#7A8581" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search invoices…" style={styles.invoiceSearchInput} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.invoiceFilterScroll}
        contentContainerStyle={styles.invoiceFilters}
      >
        {(['ALL', 'PENDING', 'PAID', 'OVERDUE'] as const).map((value) => (
          <Pressable key={value} onPress={() => setFilter(value)} style={[styles.invoiceFilter, filter === value && styles.invoiceFilterActive]}>
            <Text style={[styles.invoiceFilterText, filter === value && styles.invoiceFilterTextActive]}>{sentenceCase(value)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading && <ActivityIndicator color={colors.green} />}
      {!loading && !visible.length && <Card><Text style={styles.body}>No invoices match this filter.</Text></Card>}
      {visible.map((invoice) => (
        <Pressable key={invoice.id} onPress={() => setSelected(invoice)}>
          <Card style={styles.invoiceCard}>
            <View style={styles.invoiceIcon}><Ionicons name="receipt-outline" size={22} color={colors.green} /></View>
            <View style={styles.flex}>
              <View style={styles.invoiceCardTop}>
                <Text style={styles.invoiceDescription}>{invoice.description}</Text>
                <Text style={styles.invoiceAmount}>{invoiceMoney(invoice.amountCents)}</Text>
              </View>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
              <View style={styles.invoiceMeta}>
                <Text style={[styles.invoiceStatus, invoice.status === 'PAID' ? styles.invoicePaid : invoice.status === 'OVERDUE' ? styles.invoiceOverdue : styles.invoiceDue]}>{sentenceCase(invoice.status)}</Text>
                <Text style={styles.invoiceDate}>Due {invoiceDate(invoice.dueOn)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#98A09D" />
          </Card>
        </Pressable>
      ))}
      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.invoiceModalBackdrop}>
          <View style={styles.invoiceModal}>
            <View style={styles.invoiceModalHeader}>
              <Text style={styles.invoiceModalTitle}>Invoice details</Text>
              <Pressable onPress={() => setSelected(null)}><Ionicons name="close" size={25} color={colors.ink} /></Pressable>
            </View>
            {selected && <>
              <Text style={styles.invoiceDetailAmount}>{invoiceMoney(selected.amountCents)}</Text>
              <Text style={styles.invoiceDetailSubject}>{selected.description}</Text>
              {[['Invoice number', selected.invoiceNumber], ['Campus', selected.branchName || 'Not assigned'], ['Issued', invoiceDate(selected.issuedOn)], ['Due date', invoiceDate(selected.dueOn)], ['Status', sentenceCase(selected.status)], ...(selected.paidAt ? [['Paid on', invoiceDate(selected.paidAt)]] : [])].map(([label, value]) => (
                <View key={label} style={styles.invoiceDetailRow}><Text style={styles.invoiceDetailLabel}>{label}</Text><Text style={styles.invoiceDetailValue}>{value}</Text></View>
              ))}
              {selected.status !== 'PAID' && <Button title={payingId === selected.id ? 'Opening PayFast…' : `Pay ${invoiceMoney(selected.amountCents)}`} icon="card-outline" disabled={Boolean(payingId)} onPress={() => void payInvoice(selected)} style={{ marginTop: 18 }} />}
              {selected.status === 'PAID' && <View style={styles.invoicePaidConfirmation}><Ionicons name="checkmark-circle" size={22} color={colors.green2} /><Text style={styles.invoicePaidConfirmationText}>Payment confirmed</Text></View>}
            </>}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

export function MessagesScreen() {
  const { messages, sendMessage, refreshMessages, loading } = useSchoolData();
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messageListRef = useRef<FlatList>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      let syncing = false;
      const sync = async () => {
        if (!active || syncing) return;
        syncing = true;
        try {
          await refreshMessages(true);
        } catch {
          // Keep the conversation available and retry on the next short interval.
        } finally {
          syncing = false;
        }
      };
      void sync();
      const interval = setInterval(() => void sync(), 3_000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [refreshMessages]),
  );

  // The API returns the most recent messages first. Render them oldest-to-newest
  // so the conversation reads naturally from the top down and ends at the composer.
  const chronologicalMessages = useMemo(
    () =>
      [...messages].sort((left, right) => {
        const leftTime = parseApiDate(left.createdAt)?.getTime() ?? 0;
        const rightTime = parseApiDate(right.createdAt)?.getTime() ?? 0;
        return leftTime - rightTime;
      }),
    [messages],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      messageListRef.current?.scrollToEnd({ animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [chronologicalMessages.length]);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendMessage(body);
      setDraft('');
    } catch (error) {
      Alert.alert('Message failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.chatSafe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.chatKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.chatHeaderWrap}>
          <AppHeader title="Messages" />
          <View style={styles.chatConversationHeader}>
            <Image source={images.logo} style={styles.chatSchoolLogo} resizeMode="contain" />
            <View style={styles.flex}>
              <Text style={styles.chatConversationTitle}>Mobsie Connect</Text>
              <Text style={styles.chatConversationSubtitle}>
                School conversation · usually replies during school hours
              </Text>
            </View>
          </View>
        </View>

        <FlatList
          ref={messageListRef}
          data={chronologicalMessages}
          keyExtractor={(message) => message.id}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          keyboardShouldPersistTaps="handled"
          refreshing={loading}
          onRefresh={() => {
            void refreshMessages(true);
          }}
          renderItem={({ item: message }) => {
            const isParent = message.senderType === 'PARENT' || message.senderName === user?.name;
            return (
              <View style={[styles.chatBubbleRow, isParent && styles.chatBubbleRowMine]}>
                <View
                  style={[
                    styles.chatBubble,
                    isParent ? styles.chatBubbleMine : styles.chatBubbleSchool,
                  ]}
                >
                  {!isParent && (
                    <Text style={styles.chatSender}>{message.senderName || 'Mobsie Connect'}</Text>
                  )}
                  <Text style={styles.chatBubbleText}>{message.body}</Text>
                  <View style={styles.chatMetaRow}>
                    <Text style={styles.chatTime}>{formatMessageTimestamp(message.createdAt)}</Text>
                    {isParent && <Ionicons name="checkmark-done" size={14} color="#2585D5" />}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.chatEmpty}>
                <Ionicons name="chatbubbles-outline" size={30} color={colors.green} />
                <Text style={styles.chatEmptyTitle}>Start a conversation</Text>
                <Text style={styles.chatEmptyText}>
                  Send the school a message and their reply will appear here.
                </Text>
              </View>
            ) : null
          }
        />

        <View style={styles.chatComposer}>
          <TextInput
            style={styles.chatComposerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={3000}
            textAlignVertical="center"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={!draft.trim() || sending}
            onPress={() => {
              void onSend();
            }}
            style={({ pressed }) => [
              styles.chatSendButton,
              (!draft.trim() || sending) && styles.chatSendButtonDisabled,
              pressed && styles.chatSendButtonPressed,
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={19} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, updateProfile } = useAuth();
  const { refresh, applications, students } = useSchoolData();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const childReferences = useMemo(() => {
    const seen = new Set<string>();
    const issued = applications
      .filter((application) => application.reference?.trim())
      .filter((application) => {
        const reference = application.reference.trim().toUpperCase();
        if (seen.has(reference)) return false;
        seen.add(reference);
        return true;
      })
      .map((application) => ({
        childName: application.childName || students[0]?.name || user?.child || 'Child',
        reference: application.reference,
      }));

    if (issued.length) return issued;
    if (user?.applicationReference?.trim()) {
      return [
        {
          childName: user.child || students[0]?.name || 'Child',
          reference: user.applicationReference,
        },
      ];
    }
    return [];
  }, [applications, students, user?.applicationReference, user?.child]);

  const openPersonalInformation = () => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setPhone(user?.phone ?? '');
    setEditing(true);
  };

  const savePersonalInformation = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Check your name', 'Enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 8) {
      Alert.alert('Check your mobile number', 'Enter a valid mobile number.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(name, email, phone);
      setEditing(false);
      Alert.alert('Profile updated', 'Your personal information has been saved.');
    } catch (error) {
      Alert.alert('Unable to update profile', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen onRefresh={refresh}>
      <AppHeader title="Profile" notification={false} />
      <View style={styles.profileHero}>
        <Avatar name={user?.name ?? 'Parent'} size={82} />
        <Text style={styles.greeting}>{user?.name ?? 'Parent'}</Text>
        <Text style={styles.body}>{user?.email ?? ''} · Parent</Text>
      </View>
      <ChildAccountSwitcher />
      <Card style={styles.profileReferenceCard}>
        <View style={styles.profileReferenceHeader}>
          <View style={[styles.profileRowIcon, { backgroundColor: '#FFF0DE' }]}>
            <Ionicons name="document-text-outline" size={19} color={colors.orange} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.profileReferenceTitle}>Child Reference</Text>
            <Text style={styles.body}>Use this reference for school forms and payments.</Text>
          </View>
        </View>
        {childReferences.length ? (
          childReferences.map((item) => (
            <View key={item.reference} style={styles.profileReferenceRow}>
              <Text style={styles.profileReferenceChild}>{item.childName}</Text>
              <Text selectable style={styles.profileReferenceValue}>
                {displayReference(item.reference)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.profileReferencePending}>
            A reference will appear here once the child&apos;s application has been created.
          </Text>
        )}
      </Card>
      <Pressable
        onPress={openPersonalInformation}
        accessibilityRole="button"
        accessibilityLabel="Edit personal information"
      >
        <Card style={styles.listRow}>
          <View style={styles.profileRowIcon}>
            <Ionicons name="person-outline" size={19} color={colors.green} />
          </View>
          <Text style={styles.listText}>Personal Information</Text>
          <Ionicons name="chevron-forward" color={colors.muted} />
        </Card>
      </Pressable>
      {editing && (
        <Card style={styles.personalForm}>
          <Text style={styles.greetingSmall}>Edit Personal Information</Text>
          <Field label="Full Name" value={name} onChangeText={setName} />
          <Field
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <Field
            label="Mobile Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <View style={styles.buttonRow}>
            <View style={styles.flex}>
              <Button
                title="Cancel"
                outline
                color={colors.green}
                onPress={() => setEditing(false)}
              />
            </View>
            <View style={styles.flex}>
              <Button
                title={saving ? 'Saving…' : 'Save Changes'}
                color={colors.green}
                onPress={saving ? undefined : savePersonalInformation}
              />
            </View>
          </View>
        </Card>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open learner deregistration"
        onPress={() => navigation.navigate('Deregistration')}
      >
        <Card style={styles.listRow}>
          <View style={[styles.profileRowIcon, { backgroundColor: '#FDEBEA' }]}>
            <Ionicons name="person-remove-outline" size={19} color={colors.danger} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.listText, { color: colors.danger }]}>Learner Deregistration</Text>
            <Text style={styles.body}>
              Remove a learner and close the parent account when applicable.
            </Text>
          </View>
          <Ionicons name="chevron-forward" color={colors.danger} />
        </Card>
      </Pressable>
      <Button title="Sign Out" color={colors.danger} outline onPress={logout} />
    </Screen>
  );
}

export function TeamScreen() {
  const { loadBranches, loadTeam } = useApplication();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadBranches()
      .then((items) => {
        setBranches(items);
        setBranch(items[0]?.id ?? '');
      })
      .catch((error) => Alert.alert('Unable to load branches', error.message));
  }, []);
  useEffect(() => {
    if (!branch) return;
    setLoading(true);
    loadTeam(branch)
      .then(setMembers)
      .catch((error) => Alert.alert('Unable to load team', error.message))
      .finally(() => setLoading(false));
  }, [branch]);
  const refreshTeam = async () => {
    const nextBranches = await loadBranches();
    setBranches(nextBranches);
    const selectedBranch = nextBranches.some((item) => item.id === branch)
      ? branch
      : (nextBranches[0]?.id ?? '');
    setBranch(selectedBranch);
    if (selectedBranch) setMembers(await loadTeam(selectedBranch));
  };
  return (
    <Screen onRefresh={refreshTeam}>
      <AppHeader title="Our Team" notification={false} />
      <View style={styles.teamTabShell}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {branches.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: branch === item.id }}
              style={[styles.tab, branch === item.id && styles.activeTab]}
              onPress={() => setBranch(item.id)}
            >
              <Text style={[styles.tabText, branch === item.id && styles.white]} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {loading && <ActivityIndicator color={colors.green} />}
      {members.map((member) => (
        <Card key={member.id} style={styles.teamCard}>
          <Image source={{ uri: member.imageUrl }} style={styles.teacherPhoto} resizeMode="cover" />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{member.name}</Text>
            <Text style={styles.body}>{member.title}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

export function LearningScreen() {
  const { refresh } = useSchoolData();
  return (
    <Screen onRefresh={refresh}>
      <AppHeader title="Learning" />
      <View style={styles.learningComingSoon}>
        <View style={styles.learningComingSoonIcon}>
          <Ionicons name="sparkles-outline" size={42} color={colors.orange} />
        </View>
        <Text style={styles.learningComingSoonEyebrow}>Learning Subjects</Text>
        <Text style={styles.learningComingSoonTitle}>Coming soon</Text>
        <Text style={styles.learningComingSoonBody}>
          We are preparing a safe, guided learning experience for every Mobsie learner.
        </Text>
        <View style={styles.learningComingSoonPill}>
          <Ionicons name="time-outline" size={18} color={colors.green} />
          <Text style={styles.learningComingSoonPillText}>Watch this space</Text>
        </View>
      </View>
    </Screen>
  );
}

function galleryCategory(value: Record<string, any>): 'Classroom' | 'Events' | 'Sports' {
  const metadata =
    typeof value.data === 'string'
      ? (() => {
          try {
            return JSON.parse(value.data);
          } catch {
            return {};
          }
        })()
      : (value.data ?? value.metadata ?? {});
  const raw = [
    value.category,
    value.type,
    value.albumCategory,
    value.album_category,
    metadata.category,
    metadata.type,
    metadata.albumCategory,
  ].find((item) => typeof item === 'string' && item.trim());
  const category = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[ _-]+/g, ' ');

  if (/(sport|pool|swim)/.test(category)) return 'Sports';
  if (/(class|classroom|lesson|chess)/.test(category)) return 'Classroom';
  // Dashboard records that predate categories are school event photos.
  return 'Events';
}

export function GalleryScreen() {
  const { gallery, refresh } = useSchoolData();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', 'Classroom', 'Events', 'Sports'];
  const fallbackPhotos = [
    ['Pool Time', 'Sports', images.gallery.pool],
    ['Our Team', 'Events', images.gallery.team],
    ['Performance Day', 'Events', images.gallery.performance],
    ['Chess Club', 'Classroom', images.gallery.chess],
    ['Class of 2024', 'Classroom', images.gallery.class],
    ['Fun Day', 'Events', images.gallery.funDay],
  ] as const;
  const photos = gallery.length
    ? gallery.map((album: any, index: number) => ({
        title: album.name || album.title || `Gallery album ${index + 1}`,
        category: galleryCategory(album),
        image:
          album.imageUrl || album.image_url || album.coverUrl || album.cover_url || album.url
            ? {
                uri:
                  album.imageUrl ||
                  album.image_url ||
                  album.coverUrl ||
                  album.cover_url ||
                  album.url,
              }
            : fallbackPhotos[index % fallbackPhotos.length][2],
      }))
    : fallbackPhotos.map(([title, category, image]) => ({ title, category, image }));
  const visiblePhotos = photos.filter(
    (photo) => selectedCategory === 'All' || photo.category === selectedCategory,
  );
  return (
    <Screen onRefresh={refresh}>
      <AppHeader title="Gallery" notification={false} />
      <View style={styles.galleryTabs}>
        {categories.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === item }}
            onPress={() => setSelectedCategory(item)}
            style={[styles.galleryTab, selectedCategory === item && styles.galleryActive]}
          >
            <Text
              style={[styles.galleryTabText, selectedCategory === item && styles.galleryActiveText]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.galleryGrid}>
        {visiblePhotos.map((photo) => (
          <Card key={photo.title} style={styles.galleryCard}>
            <Image source={photo.image} style={styles.galleryImage} resizeMode="cover" />
            <Text style={styles.galleryTitle}>{photo.title}</Text>
          </Card>
        ))}
      </View>
      {!visiblePhotos.length && (
        <Card>
          <Text style={styles.body}>No {selectedCategory.toLowerCase()} gallery items yet.</Text>
        </Card>
      )}
    </Screen>
  );
}

export function BranchesScreen() {
  const { loadBranches } = useApplication();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadBranches()
      .then(setBranches)
      .catch((error) => Alert.alert('Unable to load branches', error.message))
      .finally(() => setLoading(false));
  }, []);
  const refreshBranches = async () => {
    setBranches(await loadBranches());
  };
  return (
    <Screen onRefresh={refreshBranches}>
      <AppHeader title="Branches" notification={false} />
      {loading && <ActivityIndicator color={colors.green} />}
      {branches.map((branch, index) => {
        const color = index % 2 ? colors.purple : colors.green;
        return (
          <Card key={branch.id} style={styles.branchCard}>
            <View style={styles.branchTop}>
              <View style={styles.flex}>
                <Text style={styles.greetingSmall}>{branch.name}</Text>
                <Text style={styles.body}>
                  <Text style={styles.cardTitle}>Address:</Text> {branch.address}
                  {`\n`}
                  <Text style={styles.cardTitle}>Tel:</Text> {branch.phone}
                  {`\n`}
                  <Text style={styles.cardTitle}>Email:</Text> {branch.email}
                </Text>
              </View>
              <Image
                source={branch.imageUrl ? { uri: branch.imageUrl } : images.branches.soshanguve}
                style={styles.branchPhoto}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.cardTitle}>Facilities</Text>
            <View style={styles.facilities}>
              {branchFacilities.map((facility, facilityIndex) => (
                <View key={facility.label} style={styles.facilityItem}>
                  <View
                    style={[
                      styles.facility,
                      { backgroundColor: facilityIndex % 2 ? colors.orange : color },
                    ]}
                  >
                    <Ionicons name={facility.icon} color="#fff" size={18} />
                  </View>
                  <Text style={styles.facilityLabel} numberOfLines={1}>
                    {facility.label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.buttonRow}>
              <View style={styles.flex}>
                <Button
                  title="Quick Directions"
                  color={colors.orange}
                  onPress={() => openBranchDirections(branch)}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  title="Contact Branch"
                  color={color}
                  onPress={() => Linking.openURL(`tel:${branch.phone}`)}
                />
              </View>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

export function AboutScreen() {
  return (
    <Screen style={styles.aboutScreen}>
      <AppHeader title="Who We Are" />
      <View style={styles.quoteBlock}>
        <Text style={styles.quote}>
          <Text style={styles.quoteMark}>“</Text>
          We’re more than a network of private preschools.
          <Text style={styles.quoteMark}>”</Text>
        </Text>
        <Text style={styles.aboutIntro}>
          We’re a foundation for future leaders, dreamers, and changemakers.
        </Text>
      </View>
      <Card style={styles.story}>
        <View style={styles.storyHeader}>
          <Text style={styles.aboutCardHeading}>Our Story</Text>
          <Text style={styles.established}>Established 2015</Text>
        </View>
        <View style={styles.stats}>
          {[
            ['2,550+', 'Children\nHelped'],
            ['2,159+', 'Graduates'],
            ['10+', 'Years of\nExcellence'],
          ].map(([value, label]) => (
            <View key={label} style={styles.statColumn}>
              <Text style={styles.stat}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.aboutDivider} />
        <Text style={styles.aboutBody}>
          With a strong property-focused model, we create safe, affordable, and accessible learning
          spaces, especially in townships and rural communities where opportunity is needed most.
        </Text>
      </Card>
      <Card style={styles.vision}>
        <View style={styles.visionHeading}>
          <Ionicons name="bulb-outline" size={19} color={colors.orange} />
          <Text style={styles.aboutCardHeading}>Our Vision</Text>
        </View>
        <Text style={styles.aboutBody}>
          To expand our preschool network across South Africa and build a trusted national footprint
          through franchising.
        </Text>
      </Card>
      <Text style={styles.valuesHeading}>Our Values</Text>
      <View style={styles.values}>
        {(
          [
            ['Safe Spaces', 'home-outline'],
            ['Creativity', 'color-palette-outline'],
            ['Partnership', 'people-outline'],
            ['Accessibility', 'star-outline'],
          ] as const
        ).map(([item, icon]) => (
          <Card key={item} style={styles.valueCard}>
            <Ionicons name={icon} size={18} color="#A62DC3" />
            <Text style={styles.cardTitle}>{item}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

export function ServicesScreen() {
  const services = [
    ['book-outline', 'Homework\nHelp', colors.green2],
    ['restaurant-outline', 'Lunch\nMeal', colors.orange],
    ['game-controller-outline', 'Recreational\nPlay', '#7E2BD5'],
    ['calendar-outline', 'Weekend\nCare', '#3678FF'],
  ] as const;
  const included = [
    'All meals — Breakfast, lunch, fruits and snacks',
    'Toiletries & Stationery — Crayons, paints, paper, pencils, etc.,',
    'Photos',
    'Birthdays & Celebrations — cake, juice, snacks and party packs',
    'All extra mural activities',
  ];
  return (
    <Screen style={styles.servicesScreen}>
      <AppHeader />
      <Text style={styles.servicesHeading}>Services & Fees</Text>
      <Card style={styles.serviceCard}>
        <View style={styles.serviceTitle}>
          <Ionicons name="time-outline" size={25} color="#fff" />
          <Text style={styles.serviceTitleText}>After Care Services</Text>
        </View>
        <View style={styles.serviceContent}>
          <Text style={styles.serviceBody}>
            At Mobsie Connect we not only provide after care services for our students but also for
            members of the community. We provide homework help and lunch meal for children who are
            in primary school.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              marginTop: 12,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={styles.pill}>Weekend Service: 06:00 – 17:00</Text>
            <Text style={styles.holidayPill}>School Holidays: 07:00 – 17:30</Text>
          </View>
          <View style={styles.serviceFacilities}>
            {services.map(([icon, label, color]) => (
              <View key={label} style={styles.serviceFacility}>
                <View style={[styles.serviceIcon, { backgroundColor: color }]}>
                  <Ionicons name={icon} size={20} color="#fff" />
                </View>
                <Text style={styles.serviceLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>
      <Card style={styles.feeCard}>
        <View style={styles.feeTitle}>
          <Ionicons name="cash-outline" size={25} color="#fff" />
          <Text style={styles.feeTitleText}>Our Fees</Text>
        </View>
        <View style={styles.feeContent}>
          <Text style={styles.serviceBody}>
            School fees at Mobsie Connect is all inclusive, there are no additional monthly costs
            outside of the fees.
          </Text>
          <Text style={styles.includedHeading}>What&apos;s Included</Text>
          {included.map((item) => (
            <View key={item} style={styles.includedRow}>
              <Ionicons name="checkmark-circle-outline" size={15} color={colors.orange} />
              <Text style={styles.included}>{item}</Text>
            </View>
          ))}
          <Text style={styles.includedHeading}>2027 Fee Reference</Text>
          {['Mamelodi', 'Soshanguve', 'Hebron'].map((branch) => (
            <View key={branch} style={{ marginTop: 12 }}>
              <Text style={styles.cardTitle}>{branch}</Text>
              {(publicFeeStructure(branch) || []).map((fee) => (
                <View
                  key={fee.stage}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginTop: 7,
                  }}
                >
                  <Text style={styles.body}>{fee.label}</Text>
                  <Text
                    style={[styles.body, { fontFamily: 'Poppins_600SemiBold', textAlign: 'right' }]}
                  >
                    {formatZar(fee.monthlyFeeCents)} / month
                  </Text>
                </View>
              ))}
            </View>
          ))}
          <Text style={styles.feeNote}>
            Annual and sibling rates are available during enrolment.
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

function ChildAccountSwitcher() {
  const navigation = useNavigation<any>();
  const { childProfiles, activeChild, selectChild } = useSchoolData();
  const { startAdditionalChild } = useApplication();
  const addChild = () => {
    Alert.alert(
      'Add another child',
      'You will complete the same application and enrolment process for the new child. You can return and switch to an existing child at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start application',
          onPress: () => {
            void startAdditionalChild().then(() => navigation.navigate('ApplicationOne'));
          },
        },
      ],
    );
  };
  return (
    <Card style={styles.childSwitcherCard}>
      <View style={styles.childSwitcherHeader}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Your children</Text>
          <Text style={styles.body}>Tap a child to switch their school profile.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add another child"
          onPress={addChild}
          style={styles.addChildButton}
        >
          <Ionicons name="add" size={17} color="#fff" />
          <Text style={styles.addChildButtonText}>Add child</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.childSwitcherList}
      >
        {childProfiles.map((child) => {
          const selected = child.key === activeChild?.key;
          return (
            <Pressable
              key={child.key}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${child.name}`}
              onPress={() => void selectChild(child.key)}
              style={[styles.childSwitchOption, selected && styles.childSwitchOptionActive]}
            >
              <Avatar name={child.name} size={34} />
              <View>
                <Text style={[styles.childSwitchName, selected && styles.childSwitchNameActive]}>
                  {child.name}
                </Text>
                <Text
                  style={[styles.childSwitchStatus, child.pending && styles.childSwitchPending]}
                >
                  {child.pending ? 'Awaiting approval' : 'Active'}
                </Text>
              </View>
              {selected && <Ionicons name="checkmark-circle" size={18} color={colors.green} />}
            </Pressable>
          );
        })}
        {!childProfiles.length && (
          <Text style={styles.profileReferencePending}>
            No child profile yet. Select Add child to begin.
          </Text>
        )}
      </ScrollView>
    </Card>
  );
}

function ChildCard({
  student,
  profile,
  parentName,
}: {
  student?: any;
  profile?: any;
  parentName?: string;
}) {
  const pending = !student && profile?.pending;
  return (
    <Card style={styles.childCard}>
      <Avatar name={student?.name ?? profile?.name ?? 'Child'} size={65} />
      <View style={styles.flex}>
        <Text style={styles.greetingSmall}>
          {student?.name ?? profile?.name ?? 'No enrolled child yet'}
        </Text>
        <Text style={styles.body}>
          {student
            ? `${sentenceCase(student.grade)} · ${student.branchName}`
            : pending
              ? `Application ${String(profile.status).replace(/_/g, ' ').toLowerCase()} · awaiting school approval`
              : 'Complete enrolment to activate a profile'}
          {`\n`}Parent: {personNameCase(parentName)}
        </Text>
        {pending && (
          <Text style={styles.pendingChildReference}>
            {displayReference(profile.reference, 'Reference pending')}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  greeting: { fontFamily: 'Poppins_700Bold', fontSize: 25, color: colors.ink, marginTop: 14 },
  homeDate: {
    color: colors.muted,
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    marginBottom: 14,
  },
  greetingSmall: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: colors.ink },
  childCard: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  childSwitcherCard: { marginBottom: 12, paddingVertical: 14 },
  childSwitcherHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  childSwitcherList: { gap: 9, paddingTop: 12, paddingRight: 4 },
  childSwitchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 156,
    borderWidth: 1,
    borderColor: '#E5E7E4',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  childSwitchOptionActive: { borderColor: colors.green, backgroundColor: '#EFF8F1' },
  childSwitchName: { fontFamily: 'Poppins_600SemiBold', color: colors.ink, fontSize: 11 },
  childSwitchNameActive: { color: colors.green },
  childSwitchStatus: { color: colors.green2, fontFamily: 'Poppins_500Medium', fontSize: 8 },
  childSwitchPending: { color: colors.orange },
  addChildButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: colors.orange,
  },
  addChildButtonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 9 },
  pendingChildReference: {
    color: colors.orange,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9,
    marginTop: 4,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  quickTile: {
    width: '48%',
    height: 116,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickText: { fontFamily: 'Poppins_600SemiBold', color: '#fff', marginTop: 9 },
  messageCard: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  ring: {
    height: 70,
    width: 70,
    borderRadius: 35,
    borderWidth: 8,
    borderColor: colors.green2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  cardTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: colors.ink },
  body: { fontSize: 10, lineHeight: 16, color: colors.text },
  more: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: colors.green, marginTop: 5 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, marginBottom: 8 },
  listText: { flex: 1, fontSize: 11, color: colors.text },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calendarCard: { paddingHorizontal: 12, paddingVertical: 16 },
  calendarMonth: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 15 },
  weekday: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  weekdayMuted: { color: colors.muted, marginBottom: 5 },
  date: { width: '14.28%', height: 43, alignItems: 'center', justifyContent: 'center' },
  dateBadge: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDateText: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: colors.ink },
  greenDate: { backgroundColor: colors.green, borderRadius: 22 },
  selectedDate: {
    backgroundColor: colors.orange,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFD8B8',
  },
  white: { color: '#fff' },
  eventCard: { backgroundColor: colors.orange, marginTop: 16 },
  whiteTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff' },
  whiteBody: { fontSize: 10, lineHeight: 15, color: '#fff' },
  featuredTitle: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#fff' },
  eventContent: { flexDirection: 'row', gap: 12, alignItems: 'center', marginVertical: 12 },
  eventIcon: {
    height: 54,
    width: 54,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 },
  reminderText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#fff' },
  upcomingIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0DE',
  },
  upcomingIconPurple: { backgroundColor: '#F2E6FF' },
  invoiceSubheading: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#7A8581', textAlign: 'center', marginTop: -8, marginBottom: 12 },
  invoiceBalanceCard: { backgroundColor: colors.green, marginBottom: 13 },
  invoiceBalanceLabel: { color: '#DDF2E3', fontFamily: 'Poppins_500Medium', fontSize: 11 },
  invoiceBalanceValue: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 27, marginTop: 2 },
  invoiceBalanceHint: { color: '#DDF2E3', fontFamily: 'Poppins_500Medium', fontSize: 9, marginTop: 2 },
  invoiceSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, minHeight: 48, marginBottom: 11 },
  invoiceSearchInput: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 11, color: colors.ink },
  invoiceFilterScroll: { flexGrow: 0, flexShrink: 0, height: 45, marginBottom: 8 },
  invoiceFilters: { gap: 8, paddingBottom: 5, alignItems: 'flex-start' },
  invoiceFilter: { height: 36, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#ECECEA' },
  invoiceFilterActive: { backgroundColor: colors.green },
  invoiceFilterText: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#646B68' },
  invoiceFilterTextActive: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  invoiceCard: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10, padding: 13 },
  invoiceIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EFF8F1', alignItems: 'center', justifyContent: 'center' },
  invoiceCardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  invoiceDescription: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: colors.ink },
  invoiceAmount: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: colors.ink },
  invoiceNumber: { fontFamily: 'Poppins_500Medium', fontSize: 9, color: '#7A8581', marginTop: 2 },
  invoiceMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
  invoiceStatus: { overflow: 'hidden', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontFamily: 'Poppins_600SemiBold', fontSize: 8 },
  invoicePaid: { color: '#238346', backgroundColor: '#DFF5E6' },
  invoiceDue: { color: '#9A6A00', backgroundColor: '#FFF2C9' },
  invoiceOverdue: { color: '#B52D28', backgroundColor: '#FFE2E0' },
  invoiceDate: { fontFamily: 'Poppins_500Medium', fontSize: 8, color: '#7A8581' },
  invoiceModalBackdrop: { flex: 1, backgroundColor: 'rgba(20,30,28,.45)', justifyContent: 'flex-end' },
  invoiceModal: { backgroundColor: colors.paper, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 22, paddingBottom: 36 },
  invoiceModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceModalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: colors.ink },
  invoiceDetailAmount: { fontFamily: 'Poppins_700Bold', fontSize: 29, color: colors.green, marginTop: 18 },
  invoiceDetailSubject: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: colors.ink, marginBottom: 16 },
  invoiceDetailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  invoiceDetailLabel: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#7A8581' },
  invoiceDetailValue: { flex: 1, textAlign: 'right', fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: colors.ink },
  invoicePaidConfirmation: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#EFF8F1', borderRadius: 14, padding: 14, marginTop: 18 },
  invoicePaidConfirmationText: { fontFamily: 'Poppins_600SemiBold', color: colors.green, fontSize: 12 },
  selectedEventRow: {
    borderWidth: 2,
    borderColor: colors.orange,
    backgroundColor: '#FFF8F0',
  },
  chatSafe: { flex: 1, backgroundColor: '#F7F2EA' },
  chatKeyboard: { flex: 1 },
  chatHeaderWrap: {
    backgroundColor: colors.paper,
    borderBottomColor: '#E9E4DC',
    borderBottomWidth: 1,
    paddingHorizontal: 18,
  },
  chatConversationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 13,
  },
  chatSchoolLogo: { height: 38, width: 38 },
  chatConversationTitle: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 14 },
  chatConversationSubtitle: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 1 },
  chatList: { flex: 1 },
  chatListContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  chatBubbleRow: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 9 },
  chatBubbleRowMine: { justifyContent: 'flex-end' },
  chatBubble: {
    borderRadius: 17,
    maxWidth: '84%',
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 6,
  },
  chatBubbleSchool: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderColor: '#E9E4DC',
    borderWidth: 1,
  },
  chatBubbleMine: { backgroundColor: '#DCF7E6', borderBottomRightRadius: 4 },
  chatSender: { color: colors.green, fontFamily: 'Poppins_700Bold', fontSize: 10, marginBottom: 2 },
  chatBubbleText: { color: colors.ink, fontSize: 13, lineHeight: 19 },
  chatMetaRow: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  chatTime: { color: '#728078', fontSize: 8 },
  chatEmpty: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: '#E9E4DC',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 28,
    padding: 26,
  },
  chatEmptyTitle: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 15, marginTop: 9 },
  chatEmptyText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    textAlign: 'center',
  },
  chatComposer: {
    alignItems: 'flex-end',
    backgroundColor: colors.paper,
    borderTopColor: '#E9E4DC',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: Platform.OS === 'ios' ? 10 : 12,
  },
  chatComposerInput: {
    backgroundColor: '#F6F4F0',
    borderColor: '#E6E1D9',
    borderRadius: 22,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    maxHeight: 104,
    minHeight: 45,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  chatSendButton: {
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: 23,
    height: 45,
    justifyContent: 'center',
    width: 45,
  },
  chatSendButtonDisabled: { backgroundColor: '#A9B5AF' },
  chatSendButtonPressed: { opacity: 0.78 },
  referenceText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '90%',
  },
  profileHero: { alignItems: 'center', marginVertical: 25 },
  profileReferenceCard: { gap: 12, marginBottom: 12 },
  profileReferenceHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  profileReferenceTitle: {
    color: colors.ink,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  profileReferenceRow: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  profileReferenceChild: { color: colors.text, flex: 1, fontSize: 10 },
  profileReferenceValue: {
    color: colors.green,
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    marginLeft: 12,
  },
  profileReferencePending: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  profileRowIcon: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  personalForm: { gap: 2, marginBottom: 12, marginTop: 4 },
  teamTabShell: {
    backgroundColor: '#EDE8E2',
    borderRadius: radius.pill,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    padding: 3,
    gap: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: radius.pill,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  activeTab: { backgroundColor: colors.green },
  tabText: { fontSize: 9 },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    backgroundColor: '#F7F1EB',
  },
  teacherPhoto: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    borderColor: colors.blue,
    overflow: 'hidden',
  },
  experience: {
    backgroundColor: '#F8E7DB',
    fontSize: 8,
    padding: 5,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  lessonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  learningComingSoon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D8',
    borderRadius: 28,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 60,
    paddingHorizontal: 28,
    paddingVertical: 42,
    ...shadow,
  },
  learningComingSoonIcon: {
    alignItems: 'center',
    backgroundColor: '#FFF0E4',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    marginBottom: 20,
    width: 72,
  },
  learningComingSoonTitle: {
    color: colors.ink,
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  learningComingSoonEyebrow: {
    color: colors.green,
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    letterSpacing: 0.4,
    marginTop: 15,
    textTransform: 'uppercase',
  },
  learningComingSoonBody: {
    color: colors.muted,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  learningComingSoonPill: {
    alignItems: 'center',
    backgroundColor: '#E9F8EE',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 7,
    marginTop: 24,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  learningComingSoonPillText: {
    color: colors.green,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  lesson: {
    width: '31%',
    height: 170,
    borderRadius: 22,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLesson: { borderColor: '#fff', borderWidth: 3, transform: [{ scale: 1.02 }] },
  lessonTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
  },
  lessonImage: { width: 65, height: 70 },
  lessonProgress: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, color: '#fff' },
  lessonTrack: { width: '100%', height: 5, borderRadius: 3, backgroundColor: '#FFFFFF55' },
  lessonFill: { height: 5, borderRadius: 3, backgroundColor: '#fff' },
  galleryTabs: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  galleryTab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  galleryTabText: { color: colors.ink, fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  galleryActive: { backgroundColor: colors.green },
  galleryActiveText: { color: '#fff' },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  galleryCard: { width: '48%', padding: 0, overflow: 'hidden', marginBottom: 12 },
  galleryImage: { width: '100%', height: 125 },
  galleryTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, padding: 10 },
  branchCard: { marginBottom: 16 },
  branchTop: { flexDirection: 'row', gap: 10 },
  branchPhoto: { width: 105, height: 85, borderRadius: 10 },
  facilities: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 14 },
  facilityItem: { alignItems: 'center', width: '16.2%' },
  facility: {
    height: 34,
    width: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityLabel: {
    color: '#263343',
    fontFamily: 'Poppins_500Medium',
    fontSize: 7,
    marginTop: 5,
    textAlign: 'center',
  },
  buttonRow: { flexDirection: 'row', gap: 8 },
  aboutScreen: { paddingHorizontal: 16, paddingTop: 4 },
  quoteBlock: {
    alignSelf: 'stretch',
    borderLeftWidth: 4,
    borderLeftColor: '#2AA6A4',
    paddingLeft: 14,
    paddingRight: 2,
    marginTop: 8,
    marginBottom: 18,
  },
  quote: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    lineHeight: 28,
    color: '#111',
    width: '100%',
  },
  quoteMark: { color: '#2AA6A4' },
  aboutIntro: {
    alignSelf: 'stretch',
    color: '#222',
    fontSize: 11,
    lineHeight: 19,
    marginTop: 14,
    width: '100%',
  },
  story: {
    borderLeftWidth: 6,
    borderLeftColor: colors.green2,
    borderRadius: 0,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: '#F5F2EE',
    marginBottom: 15,
    padding: 20,
  },
  storyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aboutCardHeading: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#222' },
  established: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 8,
    color: '#fff',
    backgroundColor: colors.green2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vision: {
    borderLeftWidth: 6,
    borderLeftColor: colors.orange,
    borderRadius: 0,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: '#F5F2EE',
    marginBottom: 18,
    padding: 20,
  },
  visionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 },
  statColumn: { flex: 1, alignItems: 'center' },
  stat: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#111', textAlign: 'center' },
  statLabel: { fontSize: 8, lineHeight: 10, color: '#222', textAlign: 'center' },
  aboutDivider: { height: 1, backgroundColor: '#E6E1DB', marginBottom: 16 },
  aboutBody: { fontSize: 10, lineHeight: 17, color: '#292929' },
  valuesHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#171717',
    marginBottom: 12,
  },
  values: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  valueCard: {
    width: '48%',
    minHeight: 48,
    borderLeftWidth: 6,
    borderLeftColor: '#A62DC3',
    borderRadius: 0,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 13,
  },
  servicesScreen: { paddingHorizontal: 14 },
  servicesHeading: {
    color: '#111',
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    marginBottom: 18,
    marginTop: 18,
    textAlign: 'center',
  },
  serviceCard: { borderRadius: 22, padding: 0, overflow: 'hidden' },
  serviceTitle: {
    backgroundColor: colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  serviceTitleText: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },
  serviceContent: { padding: 14 },
  serviceBody: { color: '#222', fontSize: 10, lineHeight: 15 },
  pill: {
    backgroundColor: '#FCE6D5',
    fontSize: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  holidayPill: {
    alignSelf: 'flex-start',
    borderColor: '#F1EEE9',
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 8,
    marginTop: 7,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  serviceFacilities: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  serviceFacility: { alignItems: 'center', width: '24%' },
  serviceIcon: {
    height: 40,
    width: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceLabel: {
    color: '#111',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 7,
    lineHeight: 9,
    marginTop: 6,
    textAlign: 'center',
  },
  feeCard: { borderRadius: 22, padding: 0, overflow: 'hidden', marginTop: 16 },
  feeTitle: {
    backgroundColor: colors.green2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  feeTitleText: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },
  feeContent: { padding: 14 },
  includedHeading: {
    color: '#222',
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    marginBottom: 9,
    marginTop: 13,
  },
  includedRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 9, marginBottom: 10 },
  included: { color: '#222', flex: 1, fontSize: 9.5, lineHeight: 14 },
  feeNote: {
    color: '#222',
    fontFamily: 'Poppins_700Bold',
    fontSize: 9.5,
    lineHeight: 15,
    marginTop: 6,
  },
});
