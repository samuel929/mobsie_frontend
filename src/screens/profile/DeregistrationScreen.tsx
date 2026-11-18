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
import { sentenceCase } from '../../utils/text';
import { apiData } from '../../services/api/client';
import { colors, radius, shadow } from '../../theme';

type DeregistrationReason =
  'MOVING_SCHOOLS' | 'RELOCATING' | 'FINANCIAL_REASONS' | 'PERSONAL_REASONS' | 'OTHER';

type DeregistrationResult = {
  requestId: string;
  studentName: string;
  removalDate: string;
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
  const [month, setMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const minimum = minimumNoticeDate();
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = monthStart.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from(
    { length: Math.ceil((startOffset + daysInMonth) / 7) * 7 },
    (_, index) => {
      const day = index - startOffset + 1;
      return day < 1 || day > daysInMonth
        ? null
        : new Date(month.getFullYear(), month.getMonth(), day);
    },
  );
  const sameDay = (left: Date, right: Date) => isoDate(left) === isoDate(right);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.dateBackdrop}>
        <View style={styles.dateCard}>
          <View style={styles.dateIcon}>
            <Ionicons name="calendar-outline" size={28} color={colors.orange} />
          </View>
          <Text style={styles.modalTitle}>Last Day of Attendance</Text>
          <Text style={styles.dateHint}>Select the learner's final day of attendance.</Text>
          <View style={styles.monthControlRow}>
            <Pressable
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              <Ionicons name="chevron-back" size={24} color={colors.green} />
            </Pressable>
            <Text style={styles.monthLabel}>
              {month.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              <Ionicons name="chevron-forward" size={24} color={colors.green} />
            </Pressable>
          </View>
          <View style={styles.calendarWeekdays}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.calendarWeekday}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {cells.map((date, index) => {
              const disabled = !date || date < minimum;
              const selected = Boolean(date && sameDay(date, draft));
              return (
                <Pressable
                  key={`${index}-${date?.getDate() ?? 'empty'}`}
                  disabled={disabled}
                  style={[
                    styles.calendarDay,
                    selected && styles.calendarDaySelected,
                    disabled && styles.calendarDayDisabled,
                  ]}
                  onPress={() => date && setDraft(date)}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      selected && styles.calendarDayTextSelected,
                      disabled && styles.calendarDayTextDisabled,
                    ]}
                  >
                    {date?.getDate() ?? ''}
                  </Text>
                </Pressable>
              );
            })}
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
        subtitle: `${sentenceCase(student.grade)} · ${student.branchName}`,
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
      // Use the plural resource endpoint.  The dashboard keeps the legacy
      // singular endpoint as a compatibility alias for older builds.
      const response = await apiData<DeregistrationResult>('/mobile/deregistrations', {
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
      await refresh();
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
      'Submit deregistration request?',
      `${learner?.name ?? 'This learner'} remains enrolled until 31 December ${lastDay.getFullYear()}. Their details will only be removed after the school year ends.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Request',
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
            {result.studentName}'s request has been recorded. The learner remains available until{' '}
            {displayDate(new Date(`${result.removalDate}T00:00:00`))}, when the school year ends.
            Your account remains active until then.
          </Text>
        </View>
        <View style={styles.successFooter}>
          <Pressable
            style={styles.submitButton}
            onPress={() => {
              navigation.navigate('MainApp', { screen: 'Tabs', params: { screen: 'Home' } });
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
  monthControlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    width: '100%',
  },
  monthLabel: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 16 },
  calendarWeekdays: { flexDirection: 'row', marginTop: 15, width: '100%' },
  calendarWeekday: {
    color: '#748398',
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, width: '100%' },
  calendarDay: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    width: '14.2857%',
  },
  calendarDaySelected: { backgroundColor: colors.orange, borderRadius: 20 },
  calendarDayDisabled: { opacity: 0.3 },
  calendarDayText: { color: colors.ink, fontFamily: 'Poppins_500Medium', fontSize: 12 },
  calendarDayTextSelected: { color: '#fff', fontFamily: 'Poppins_700Bold' },
  calendarDayTextDisabled: { color: '#A5AFBA' },
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
