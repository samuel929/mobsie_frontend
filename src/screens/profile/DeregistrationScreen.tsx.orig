import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthContext';
import { useSchoolData } from '../../data/SchoolContext';
import { apiData } from '../../services/api/client';
import { colors, radius, shadow } from '../../theme';

type DeregistrationReason =
  'MOVING_SCHOOLS' | 'RELOCATING' | 'FINANCIAL_REASONS' | 'PERSONAL_REASONS' | 'OTHER';

type DeregistrationResult = {
  requestId: string;
  removedStudent: boolean;
  removedParent: boolean;
  studentName: string;
};

const reasons: Array<{ label: string; value: DeregistrationReason }> = [
  { label: 'Moving Schools', value: 'MOVING_SCHOOLS' },
  { label: 'Relocating', value: 'RELOCATING' },
  { label: 'Financial Reasons', value: 'FINANCIAL_REASONS' },
  { label: 'Personal Reasons', value: 'PERSONAL_REASONS' },
  { label: 'Other', value: 'OTHER' },
];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function minimumNoticeDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return addDays(today, 30);
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function displayDate(date: Date) {
  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function SelectionModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: Array<{ label: string; value: T; subtitle?: string }>;
  selected?: T;
  onClose: () => void;
  onSelect: (value: T) => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </Pressable>
          </View>
          {options.map((option) => {
            const active = option.value === selected;
            return (
              <Pressable
                accessibilityRole="button"
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                style={[styles.optionRow, active && styles.optionRowActive]}
              >
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {option.label}
                  </Text>
                  {!!option.subtitle && (
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  )}
                </View>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={23}
                  color={active ? colors.green : '#9AA9BA'}
                />
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DateModal({
  visible,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}) {
  const [draft, setDraft] = useState(value);
  const minimum = minimumNoticeDate();
  const move = (days: number) => {
    const candidate = addDays(draft, days);
    setDraft(candidate < minimum ? minimum : candidate);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.dateBackdrop}>
        <View style={styles.dateCard}>
          <View style={styles.dateIcon}>
            <Ionicons name="calendar-outline" size={28} color={colors.orange} />
          </View>
          <Text style={styles.modalTitle}>Last Day of Attendance</Text>
          <Text style={styles.dateHint}>Select a date at least 30 days from today.</Text>
          <Text style={styles.dateValue}>{displayDate(draft)}</Text>
          <View style={styles.dateControls}>
            {[-7, -1, 1, 7].map((days) => (
              <Pressable key={days} style={styles.dateControl} onPress={() => move(days)}>
                <Text style={styles.dateControlText}>
                  {days > 0 ? `+${days}` : days} day{Math.abs(days) === 1 ? '' : 's'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.dateActions}>
            <Pressable style={[styles.modalButton, styles.modalButtonOutline]} onPress={onClose}>
              <Text style={styles.modalButtonOutlineText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.modalButtonFilled]}
              onPress={() => {
                onSelect(draft);
                onClose();
              }}
            >
              <Text style={styles.modalButtonFilledText}>Use Date</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function BottomNavigation({ navigation }: { navigation: any }) {
  const items = [
    { label: 'Home', icon: 'home-outline', screen: 'Home' },
    { label: 'Calendar', icon: 'calendar-outline', screen: 'Calendar' },
    { label: 'Notifications', icon: 'notifications-outline', drawer: 'Notifications' },
    { label: 'Profile', icon: 'person-outline', screen: 'Profile' },
  ] as const;

  return (
    <View style={styles.bottomNavigation}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          style={styles.bottomNavigationItem}
          onPress={() => {
            if ('drawer' in item) {
              navigation.navigate('MainApp', { screen: item.drawer });
            } else {
              navigation.navigate('MainApp', {
                screen: 'Tabs',
                params: { screen: item.screen },
              });
            }
          }}
        >
          <Ionicons
            name={item.icon}
            size={23}
            color={item.label === 'Profile' ? colors.orange : '#91A1B4'}
          />
          <Text style={[styles.bottomLabel, item.label === 'Profile' && styles.bottomLabelActive]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function DeregistrationScreen() {
  const navigation = useNavigation<any>();
  const { token, logout } = useAuth();
  const { students, refresh } = useSchoolData();
  const [studentId, setStudentId] = useState('');
  const [lastDay, setLastDay] = useState(minimumNoticeDate);
  const [reason, setReason] = useState<DeregistrationReason | ''>('');
  const [comments, setComments] = useState('');
  const [noticeAccepted, setNoticeAccepted] = useState(false);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [reasonPickerOpen, setReasonPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DeregistrationResult | null>(null);

  const learner = students.find((student) => student.id === studentId);
  const reasonLabel = reasons.find((item) => item.value === reason)?.label;

  const studentOptions = useMemo(
    () =>
      students.map((student) => ({
        value: student.id,
        label: student.name,
        subtitle: `${student.grade} · ${student.branchName}`,
      })),
    [students],
  );

  const performDeregistration = async () => {
    if (!token) {
      Alert.alert('Please sign in', 'Your session has expired. Sign in and try again.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiData<DeregistrationResult>('/mobile/deregistration', {
        method: 'POST',
        token,
        body: JSON.stringify({
          studentId,
          lastDayOfAttendance: isoDate(lastDay),
          reason,
          comments: comments.trim(),
          noticeAccepted,
        }),
      });
      setResult(response);
      if (!response.removedParent) await refresh();
    } catch (error) {
      Alert.alert('Unable to deregister learner', (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    if (!studentId) {
      Alert.alert('Select a learner', 'Choose the learner you want to deregister.');
      return;
    }
    if (!reason) {
      Alert.alert('Select a reason', 'Choose a reason for deregistration.');
      return;
    }
    if (reason === 'OTHER' && comments.trim().length < 3) {
      Alert.alert('Add a reason', 'Please describe the reason for deregistration.');
      return;
    }
    if (!noticeAccepted) {
      Alert.alert('Notice required', 'Confirm that you understand the 30-day notice period.');
      return;
    }

    Alert.alert(
      'Remove learner permanently?',
      `${learner?.name ?? 'This learner'} will be removed from the school database. If this is your only learner, your parent account will also be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Learner',
          style: 'destructive',
          onPress: () => void performDeregistration(),
        },
      ],
    );
  };

  if (result) {
    return (
      <SafeAreaView style={styles.successSafe}>
        <View style={styles.successContent}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={104} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Request Submitted</Text>
          <Text style={styles.successMessage}>
            {result.studentName} has been deregistered and removed from the learner database.
            {result.removedParent
              ? ' Your parent account was also removed because no other learners were linked to it.'
              : ' Your parent account remains active for your other learner profiles.'}
          </Text>
        </View>
        <View style={styles.successFooter}>
          <Pressable
            style={styles.submitButton}
            onPress={() => {
              if (result.removedParent) {
                void logout();
              } else {
                navigation.navigate('MainApp', { screen: 'Tabs', params: { screen: 'Home' } });
              }
            }}
          >
            <Text style={styles.submitButtonText}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={27} color="#111" />
          </Pressable>
          <Text style={styles.headerTitle}>Deregistration Request</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Learner Deregistration</Text>

          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={23} color="#327AF3" />
            <Text style={styles.noticeText}>
              A 30-day written notice is required to process all learner deregistration requests.
              Please complete the form below.
            </Text>
          </View>

          <Pressable style={styles.selectField} onPress={() => setStudentPickerOpen(true)}>
            <Text style={[styles.selectText, !learner && styles.placeholderText]}>
              {learner?.name ?? 'Select Learner'}
            </Text>
            <Ionicons name="chevron-down" size={21} color="#53657A" />
          </Pressable>

          <Pressable style={styles.selectField} onPress={() => setDatePickerOpen(true)}>
            <Text style={styles.selectText}>{displayDate(lastDay)}</Text>
            <Ionicons name="calendar-outline" size={22} color="#53657A" />
          </Pressable>

          <Pressable style={styles.selectField} onPress={() => setReasonPickerOpen(true)}>
            <Text style={[styles.selectText, !reasonLabel && styles.placeholderText]}>
              {reasonLabel ?? 'Reason for Deregistration'}
            </Text>
            <Ionicons name="chevron-down" size={21} color="#53657A" />
          </Pressable>

          <TextInput
            value={comments}
            onChangeText={setComments}
            multiline
            maxLength={2000}
            placeholder={
              reason === 'OTHER' ? 'Please describe your reason' : 'Additional Comments (Optional)'
            }
            placeholderTextColor="#2F3D52"
            style={styles.commentsInput}
            textAlignVertical="top"
          />

          <Pressable
            style={styles.checkboxRow}
            onPress={() => setNoticeAccepted((value) => !value)}
          >
            <View style={[styles.checkbox, noticeAccepted && styles.checkboxChecked]}>
              {noticeAccepted && <Ionicons name="checkmark" size={18} color="#fff" />}
            </View>
            <Text style={styles.checkboxText}>
              I understand that a 30-day notice period applies.
            </Text>
          </Pressable>

          {!students.length && (
            <View style={styles.emptyCard}>
              <Ionicons name="school-outline" size={24} color={colors.muted} />
              <Text style={styles.emptyText}>
                There are no enrolled learners linked to this account.
              </Text>
            </View>
          )}

          <Pressable
            disabled={submitting || !students.length}
            style={[
              styles.submitButton,
              (submitting || !students.length) && styles.submitButtonDisabled,
            ]}
            onPress={submit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Request</Text>
            )}
          </Pressable>
        </ScrollView>
        <BottomNavigation navigation={navigation} />
      </KeyboardAvoidingView>

      <SelectionModal
        visible={studentPickerOpen}
        title="Select Learner"
        options={studentOptions}
        selected={studentId || undefined}
        onClose={() => setStudentPickerOpen(false)}
        onSelect={setStudentId}
      />
      <SelectionModal
        visible={reasonPickerOpen}
        title="Reason for Deregistration"
        options={reasons}
        selected={reason || undefined}
        onClose={() => setReasonPickerOpen(false)}
        onSelect={setReason}
      />
      <DateModal
        key={datePickerOpen ? isoDate(lastDay) : 'closed'}
        visible={datePickerOpen}
        value={lastDay}
        onClose={() => setDatePickerOpen(false)}
        onSelect={setLastDay}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { backgroundColor: '#fff', flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: '#E4E8EF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 60,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#111',
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    marginLeft: 19,
  },
  headerSpacer: { width: 27 },
  content: { flexGrow: 1, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 24 },
  pageTitle: { color: '#080808', fontFamily: 'Poppins_700Bold', fontSize: 27, marginBottom: 22 },
  noticeCard: {
    alignItems: 'flex-start',
    backgroundColor: '#EEF5FF',
    borderColor: '#CADDFB',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginBottom: 22,
    padding: 16,
  },
  noticeText: {
    color: '#153B8F',
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    lineHeight: 20,
  },
  selectField: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#C8D4E3',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    height: 58,
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 16,
  },
  selectText: { color: '#1C2A3D', flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 15 },
  placeholderText: { color: '#35445A' },
  commentsInput: {
    backgroundColor: '#fff',
    borderColor: '#C8D4E3',
    borderRadius: 13,
    borderWidth: 1,
    color: '#1C2A3D',
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    height: 130,
    marginBottom: 20,
    padding: 16,
  },
  checkboxRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginBottom: 27 },
  checkbox: {
    alignItems: 'center',
    borderColor: '#718196',
    borderRadius: 3,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  checkboxText: {
    color: '#1E2B3D',
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.orange,
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    ...shadow,
  },
  submitButtonDisabled: { opacity: 0.48 },
  submitButtonText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#F4F6F8',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    padding: 14,
  },
  emptyText: { color: colors.muted, flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 12 },
  bottomNavigation: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopColor: '#E4E8EF',
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  bottomNavigationItem: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  bottomLabel: { color: '#91A1B4', fontFamily: 'Poppins_500Medium', fontSize: 8, marginTop: 2 },
  bottomLabelActive: { color: colors.orange },
  modalBackdrop: { backgroundColor: 'rgba(13, 24, 36, 0.45)', flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '72%',
    paddingBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: '#D1D7DE',
    borderRadius: 2,
    height: 4,
    marginBottom: 18,
    width: 44,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  modalTitle: { color: '#121B2D', fontFamily: 'Poppins_700Bold', fontSize: 20 },
  optionRow: {
    alignItems: 'center',
    borderBottomColor: '#ECF0F4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  optionRowActive: { backgroundColor: '#F0FAF8', borderRadius: 10 },
  optionCopy: { flex: 1, paddingRight: 10 },
  optionLabel: { color: '#243044', fontFamily: 'Poppins_500Medium', fontSize: 15 },
  optionLabelActive: { color: colors.green, fontFamily: 'Poppins_700Bold' },
  optionSubtitle: {
    color: '#7E8A9B',
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  dateBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(13, 24, 36, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dateCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    width: '100%',
    ...shadow,
  },
  dateIcon: {
    alignItems: 'center',
    backgroundColor: '#FFF0E5',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 13,
    width: 56,
  },
  dateHint: {
    color: '#758194',
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  dateValue: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 20, marginVertical: 22 },
  dateControls: { flexDirection: 'row', gap: 7 },
  dateControl: { backgroundColor: '#F2F5F8', borderRadius: 9, flex: 1, paddingVertical: 10 },
  dateControlText: {
    color: '#344256',
    fontFamily: 'Poppins_500Medium',
    fontSize: 9,
    textAlign: 'center',
  },
  dateActions: { flexDirection: 'row', gap: 10, marginTop: 22, width: '100%' },
  modalButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  modalButtonOutline: { borderColor: colors.green, borderWidth: 1 },
  modalButtonFilled: { backgroundColor: colors.orange },
  modalButtonOutlineText: { color: colors.green, fontFamily: 'Poppins_700Bold' },
  modalButtonFilledText: { color: '#fff', fontFamily: 'Poppins_700Bold' },
  successSafe: { backgroundColor: '#fff', flex: 1 },
  successContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 38,
    paddingTop: 110,
  },
  successCircle: {
    alignItems: 'center',
    backgroundColor: '#20C767',
    borderRadius: 105,
    height: 210,
    justifyContent: 'center',
    marginBottom: 38,
    width: 210,
  },
  successTitle: {
    color: '#060606',
    fontFamily: 'Poppins_700Bold',
    fontSize: 27,
    textAlign: 'center',
  },
  successMessage: {
    color: '#48556A',
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 14,
    textAlign: 'center',
  },
  successFooter: { paddingBottom: 28, paddingHorizontal: 28 },
});
