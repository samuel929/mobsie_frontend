import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Branch, TeamMember, useApplication } from '../../application/ApplicationContext';
import { images } from '../../assets';
import { AppHeader } from '../../components/AppChrome';
import { Avatar, Button, Card, Field, Screen, SectionTitle } from '../../components/ui';
import { colors, radius } from '../../theme';
import { useAuth } from '../../auth/AuthContext';
import { useSchoolData } from '../../data/SchoolContext';

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
  const { students, academics, homework, loading, refresh } = useSchoolData();
  const student = students[0];
  const records = academics.filter((record) => record.studentId === student?.id);
  const average = records.length
    ? Math.round(records.reduce((sum, item) => sum + item.score, 0) / records.length)
    : 0;
  return (
    <Screen onRefresh={refresh}>
      <AppHeader />
      <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'Parent'}!</Text>
      <ChildCard student={student} parentName={user?.name} />
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
            ['Progress', 'bar-chart', colors.amber, () => navigation.navigate('StudentReport')],
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
      <SectionTitle title="Homework Updates" />
      <Card>
        {(homework.length
          ? homework.slice(0, 5).map((item: any) => item.title || item.name || 'Homework update')
          : ['No homework has been added']
        ).map((item, index) => (
          <View key={item} style={styles.listRow}>
            <Ionicons
              name="document-lock-outline"
              size={20}
              color={index ? colors.purple : colors.orange}
            />
            <Text style={styles.listText}>{item}</Text>
            <Ionicons name="chevron-forward" color={colors.muted} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

export function CalendarScreen() {
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
    const initial = calendarEvents.find((item) => item.startsOn)?.startsOn ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const featured = calendarEvents[0];
  useEffect(() => {
    const featuredDate = calendarEvents.find((item) => item.startsOn)?.startsOn;
    if (!featuredDate) return;
    setVisibleMonth(new Date(featuredDate.getFullYear(), featuredDate.getMonth(), 1));
  }, [events]);
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

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <Screen onRefresh={refresh}>
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
            const isFeatured =
              featured?.startsOn?.getFullYear() === year &&
              featured.startsOn.getMonth() === month &&
              featured.startsOn.getDate() === day;
            return (
              <View key={day} style={styles.date}>
                <View
                  style={[
                    styles.dateBadge,
                    hasEvent && (isFeatured ? styles.orangeDate : styles.greenDate),
                  ]}
                >
                  <Text style={[styles.calendarDateText, hasEvent && styles.white]}>{day}</Text>
                  {isFeatured && <Ionicons name="notifications-outline" size={8} color="#fff" />}
                </View>
              </View>
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
            <View style={styles.reminderSwitch}>
              <View style={styles.reminderKnob} />
            </View>
            <Text style={styles.reminderText}>1 Day Before</Text>
          </View>
        </Card>
      )}

      <SectionTitle title="Events" />
      {calendarEvents.map(({ event, startsOn }, index) => (
        <Card key={event.id} style={styles.listRow}>
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
      ))}
      {!loading && !calendarEvents.length && (
        <Card>
          <Text style={styles.body}>No events have been added.</Text>
        </Card>
      )}
    </Screen>
  );
}

export function MessagesScreen() {
  const { messages, sendMessage, refresh, loading } = useSchoolData();
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messageListRef = useRef<FlatList>(null);

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
            void refresh();
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
  const { students, applications, orders, refresh } = useSchoolData();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const branchReferences = Array.from(
    new Map(students.filter((student) => student.branchName).map((student) => [student.branchId, student.branchName])).values(),
  );

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
        {branchReferences.length > 0 ? (
          <View style={styles.profileBranchList}>
            {branchReferences.map((branchName) => (
              <View key={branchName} style={styles.profileBranchChip}>
                <Ionicons name="business-outline" size={13} color={colors.green} />
                <Text style={styles.profileBranchText}>{branchName}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.profileBranchEmpty}>No branch assigned yet</Text>
        )}
      </View>
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

      {[
        `${students.length} enrolled child${students.length === 1 ? '' : 'ren'}`,
        `${applications.length} application${applications.length === 1 ? '' : 's'}`,
        `${orders.length} shop order${orders.length === 1 ? '' : 's'}`,
        'Notification Settings',
      ].map((item) => (
        <Card key={item} style={styles.listRow}>
          <Text style={styles.listText}>{item}</Text>
          <Ionicons name="chevron-forward" color={colors.muted} />
        </Card>
      ))}
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
            <Text style={styles.experience}>Experience　{member.yearsExperience} years</Text>
          </View>
          {member.isPrincipal && (
            <Pressable
              onPress={() => member.contactPhone && Linking.openURL(`tel:${member.contactPhone}`)}
            >
              <Ionicons name="call-outline" color={colors.green} />
            </Pressable>
          )}
        </Card>
      ))}
    </Screen>
  );
}

export function LearningScreen() {
  const { user } = useAuth();
  const { students, refresh, loading } = useSchoolData();
  const student = students[0];
  const childFirstName = student?.name?.trim().split(/\s+/)[0] || 'Learner';
  const lessons = [
    {
      id: 'alphabet',
      title: 'Alphabet A–Z',
      completed: 12,
      total: 26,
      color: colors.green2,
      image: images.learning.alphabet,
      url: 'https://learn.khanacademy.org/khan-academy-kids/',
    },
    {
      id: 'numbers',
      title: 'Numbers 1–10',
      completed: 8,
      total: 10,
      color: colors.orange,
      image: images.learning.numbers,
      url: 'https://www.topmarks.co.uk/maths-games/3-5-years/counting',
    },
    {
      id: 'literacy',
      title: 'Literacy',
      completed: 4,
      total: 10,
      color: '#EF6683',
      image: images.learning.literacy,
      url: 'https://learn.khanacademy.org/khan-academy-kids/',
    },
    {
      id: 'art',
      title: 'Draw & Create',
      completed: 5,
      total: 8,
      color: colors.amber,
      image: images.learning.art,
      url: 'https://www.tate.org.uk/kids/games-quizzes',
    },
    {
      id: 'story',
      title: 'Story Time',
      completed: 3,
      total: 5,
      color: colors.purple,
      image: images.learning.story,
      url: 'https://storylineonline.net/',
    },
  ] as const;
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState('alphabet');
  useEffect(() => {
    AsyncStorage.getItem('mobsie-learning-progress')
      .then((saved) => saved && setProgress(JSON.parse(saved)))
      .catch(() => undefined);
  }, []);
  const openLesson = async (lesson: (typeof lessons)[number]) => {
    setSelectedId(lesson.id);
    try {
      await Linking.openURL(lesson.url);
      const current = progress[lesson.id] ?? lesson.completed;
      const next = { ...progress, [lesson.id]: Math.min(lesson.total, current + 1) };
      setProgress(next);
      await AsyncStorage.setItem('mobsie-learning-progress', JSON.stringify(next));
    } catch {
      Alert.alert('Unable to open lesson', 'Check the device internet connection and try again.');
    }
  };
  const selected =
    lessons.find((lesson) => lesson.id === selectedId) ??
    [...lessons].sort(
      (a, b) =>
        (progress[a.id] ?? a.completed) / a.total - (progress[b.id] ?? b.completed) / b.total,
    )[0];
  return (
    <Screen onRefresh={refresh}>
      <AppHeader />
      <Text style={styles.greeting}>Hello, {childFirstName}!</Text>
      <ChildCard student={student} parentName={user?.name || 'Parent'} />
      {loading && <ActivityIndicator color={colors.green} />}
      <SectionTitle title="Learning Subjects" />
      <View style={styles.lessonGrid}>
        {lessons.map((lesson) => {
          const completed = progress[lesson.id] ?? lesson.completed;
          const percentage = Math.round((completed / lesson.total) * 100);
          return (
            <Pressable
              key={lesson.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${lesson.title} lesson, ${percentage}% complete`}
              onPress={() => openLesson(lesson)}
              style={[
                styles.lesson,
                { backgroundColor: lesson.color },
                selectedId === lesson.id && styles.selectedLesson,
              ]}
            >
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Image source={lesson.image} style={styles.lessonImage} resizeMode="contain" />
              <Text style={styles.lessonProgress}>
                {completed}/{lesson.total} · {percentage}%
              </Text>
              <View style={styles.lessonTrack}>
                <View style={[styles.lessonFill, { width: `${percentage}%` }]} />
              </View>
            </Pressable>
          );
        })}
        <View style={[styles.lesson, { backgroundColor: '#91928F' }]}>
          <Text style={styles.lessonTitle}>More{`\n`}Coming Soon</Text>
          <Ionicons name="lock-closed-outline" size={38} color="#fff" />
          <Text style={styles.lessonProgress}>Stay tuned!</Text>
        </View>
      </View>
      <Button title={`Start ${selected.title}`} onPress={() => openLesson(selected)} />
    </Screen>
  );
}

export function GalleryScreen() {
  const { gallery, refresh } = useSchoolData();
  const fallbackPhotos = [
    ['Pool Time', images.gallery.pool],
    ['Our Team', images.gallery.team],
    ['Performance Day', images.gallery.performance],
    ['Chess Club', images.gallery.chess],
    ['Class of 2024', images.gallery.class],
    ['Fun Day', images.gallery.funDay],
  ] as const;
  const photos = gallery.length
    ? gallery.map((album: any, index: number) => ({
        title: album.name || album.title || `Gallery album ${index + 1}`,
        image: album.imageUrl
          ? { uri: album.imageUrl }
          : fallbackPhotos[index % fallbackPhotos.length][1],
      }))
    : fallbackPhotos.map(([title, image]) => ({ title, image }));
  return (
    <Screen onRefresh={refresh}>
      <AppHeader title="Gallery" notification={false} />
      <View style={styles.galleryTabs}>
        {['All', 'Classroom', 'Events', 'Sports'].map((item, index) => (
          <Text key={item} style={[styles.galleryTab, index === 0 && styles.galleryActive]}>
            {item}
          </Text>
        ))}
      </View>
      <View style={styles.galleryGrid}>
        {photos.map((photo) => (
          <Card key={photo.title} style={styles.galleryCard}>
            <Image source={photo.image} style={styles.galleryImage} resizeMode="cover" />
            <Text style={styles.galleryTitle}>{photo.title}</Text>
          </Card>
        ))}
      </View>
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
          <Text style={styles.pill}>Weekend Service: 06:00 – 17:00</Text>
          <Text style={styles.holidayPill}>School Holidays: 07:00 – 17:30</Text>
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
          <Text style={styles.feeNote}>Note: Specific fees details available upon inquiry.</Text>
        </View>
      </Card>
    </Screen>
  );
}

function ChildCard({ student, parentName }: { student?: any; parentName?: string }) {
  return (
    <Card style={styles.childCard}>
      <Avatar name={student?.name ?? 'Child'} size={65} />
      <View>
        <Text style={styles.greetingSmall}>{student?.name ?? 'No enrolled child yet'}</Text>
        <Text style={styles.body}>
          {student
            ? `${student.grade} · ${student.branchName}`
            : 'Complete enrolment to activate a profile'}
          {`\n`}Parent: {parentName ?? ''}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  greeting: { fontFamily: 'Poppins_700Bold', fontSize: 25, color: colors.ink, marginVertical: 14 },
  greetingSmall: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: colors.ink },
  childCard: { flexDirection: 'row', alignItems: 'center', gap: 15 },
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
  orangeDate: { backgroundColor: colors.orange, borderRadius: 10 },
  greenDate: { backgroundColor: colors.green, borderRadius: 22 },
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
  reminderSwitch: {
    width: 43,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#706AF2',
    padding: 3,
    alignItems: 'flex-end',
  },
  reminderKnob: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#fff' },
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
  profileHero: { alignItems: 'center', marginVertical: 25 },
  profileBranchList: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 },
  profileBranchChip: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: radius.pill, flexDirection: 'row', gap: 5, paddingHorizontal: 11, paddingVertical: 6 },
  profileBranchText: { color: colors.green, fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  profileBranchEmpty: { color: colors.muted, fontSize: 10, marginTop: 8 },
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
  teacherPhoto: { width: 76, height: 86 },
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
  galleryActive: { backgroundColor: colors.green, color: '#fff' },
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
    borderLeftWidth: 4,
    borderLeftColor: '#2AA6A4',
    paddingLeft: 14,
    marginTop: 8,
    marginBottom: 18,
  },
  quote: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    lineHeight: 28,
    color: '#111',
  },
  quoteMark: { color: '#2AA6A4' },
  aboutIntro: { fontSize: 11, lineHeight: 19, color: '#222', marginTop: 14 },
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
