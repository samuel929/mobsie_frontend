import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { images } from '../../assets';
import { useAuth } from '../../auth/AuthContext';
import { AppHeader } from '../../components/AppChrome';
import { Avatar, Button, Card, Field, Header, Screen, SectionTitle } from '../../components/ui';
import {
  consentFormHtml,
  consentFormTemplates,
  ConsentFormCompletion,
  ConsentFormTemplate,
} from '../../data/consentForms';
import { notifications } from '../../data/features';
import { sentenceCase } from '../../utils/text';
import { deliveryMilestones } from '../../data/schedule';
import { colors, radius } from '../../theme';
import { Product, useSchoolData } from '../../data/SchoolContext';
import { apiData } from '../../services/api/client';
import { openNotificationDestination } from '../../notifications/navigation';

type IconName = keyof typeof Ionicons.glyphMap;

// Dashboard activities use a small semantic icon vocabulary. Map it to actual
// Ionicons names before rendering, so an administrator can safely choose an
// icon without causing an invalid-icon error in Expo.
const dailyActivityIcons: Record<string, IconName> = {
  car: 'car-outline',
  sun: 'sunny-outline',
  calculator: 'calculator-outline',
  apple: 'nutrition-outline',
  book: 'book-outline',
  utensils: 'restaurant-outline',
  school: 'school-outline',
  star: 'star-outline',
  homework: 'calculator-outline',
  clock: 'time-outline',
  calendar: 'calendar-outline',
  gallery: 'color-palette-outline',
  messages: 'chatbubble-ellipses-outline',
  payments: 'restaurant-outline',
};

function dailyActivityIcon(value: unknown): IconName {
  const icon = String(value || '').trim();
  return dailyActivityIcons[icon] ?? 'time-outline';
}

function FeatureHeader({ title }: { title: string }) {
  return <Header title={title} />;
}

export function DailyActivityScreen() {
  const { dailyActivities: remoteActivities, students, refresh, loading } = useSchoolData();
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    React.useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const student = students[0];
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const scheduledActivities = remoteActivities
    .filter((activity: any) => {
      const repeat = activity.repeat || 'EVERY_DAY';
      // The API already resolves the timetable to the signed-in parent's
      // branch and class. Do not apply a second client-side branch/class
      // comparison here: enrolment stages and dashboard class labels can use
      // different display text and used to hide valid activities.
      return (
        repeat === 'EVERY_DAY' ||
        (repeat === 'WEEKDAYS' && !['SATURDAY', 'SUNDAY'].includes(dayName)) ||
        repeat === dayName
      );
    })
    .map((activity: any) => ({
      ...activity,
      startTime: activity.startTime || activity.time,
      endTime: activity.endTime || '',
      detail: activity.description || activity.detail || '',
      color: activity.color || colors.green2,
      icon: dailyActivityIcon(activity.icon),
    }))
    .sort((a: any, b: any) => String(a.startTime).localeCompare(String(b.startTime)));
  const activities = scheduledActivities.map((activity: any, index: number) => ({
    ...activity,
    // Older/fallback records only contain a start time. Treat the next item as
    // the end so the live indicator still has a meaningful active interval.
    endTime: activity.endTime || scheduledActivities[index + 1]?.startTime || '16:00',
  }));
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value: string) => {
    const text = String(value || '00:00').trim();
    const match = text.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
    if (!match) return 0;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  const currentIndex = activities.findIndex(
    (activity: any) =>
      minutesNow >= toMinutes(activity.startTime) && minutesNow < toMinutes(activity.endTime),
  );
  const currentActivity = currentIndex >= 0 ? activities[currentIndex] : null;
  const currentProgress = currentActivity
    ? Math.max(
        0,
        Math.min(
          1,
          (minutesNow - toMinutes(currentActivity.startTime)) /
            Math.max(1, toMinutes(currentActivity.endTime) - toMinutes(currentActivity.startTime)),
        ),
      )
    : 0;
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <Screen onRefresh={refresh}>
      <FeatureHeader title="Daily Activity" />
      <Text style={styles.heading}>{dateLabel}</Text>
      <Text style={styles.subtle}>
        {student
          ? `${student.name} · ${sentenceCase(student.className || student.grade)}`
          : 'Today’s timetable'}{' '}
        · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
      {loading && <ActivityIndicator color={colors.green} />}
      {currentActivity && (
        <View style={styles.liveClassBanner}>
          <View style={styles.livePulse} />
          <View style={styles.flex}>
            <Text style={styles.liveEyebrow}>HAPPENING NOW</Text>
            <Text style={styles.liveClassTitle}>{currentActivity.title}</Text>
            <Text style={styles.liveClassDetail}>
              {currentActivity.className && currentActivity.className !== 'ALL'
                ? currentActivity.className
                : student?.className || student?.grade || 'School timetable'}{' '}
              · {currentActivity.endTime}
            </Text>
          </View>
          <Text style={styles.livePercent}>{Math.round(currentProgress * 100)}%</Text>
        </View>
      )}
      <View style={styles.timeline}>
        <View style={styles.timelineRail} />
        {activities.map((activity: any, index: number) => (
          <View
            key={activity.id || `${activity.startTime}-${activity.title}`}
            style={styles.timelineRow}
          >
            <Text style={styles.time}>{activity.startTime}</Text>
            <View style={[styles.dot, { backgroundColor: activity.color }]} />
            <Card
              style={[
                styles.activityCard,
                Platform.OS === 'android'
                  ? [styles.androidActivityCard, { borderLeftColor: activity.color }]
                  : { backgroundColor: `${activity.color}14`, borderLeftColor: activity.color },
                index === currentIndex && styles.currentActivity,
              ]}
            >
              <Ionicons name={activity.icon as IconName} size={22} color={activity.color} />
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{activity.title}</Text>
                <Text style={styles.subtle}>
                  {activity.startTime} – {activity.endTime}
                </Text>
                {!!activity.detail && <Text style={styles.subtle}>{activity.detail}</Text>}
                {!!activity.className && activity.className !== 'ALL' && (
                  <Text style={styles.classLabel}>Class: {sentenceCase(activity.className)}</Text>
                )}
              </View>
              {index === currentIndex && <Text style={styles.nowBadge}>NOW</Text>}
            </Card>
            {index === currentIndex && (
              <View style={[styles.nowLine, { top: `${18 + currentProgress * 64}%` }]}>
                <View style={styles.nowDot} />
                <Text style={styles.nowTime} numberOfLines={1}>
                  {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                  {activity.title}
                </Text>
              </View>
            )}
          </View>
        ))}
        {!loading && !activities.length && (
          <Card>
            <Text style={styles.subtle}>No activities have been scheduled.</Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}

export function FormsScreen() {
  const { loading, refresh, students, applications, activeChild } = useSchoolData();
  const { token, user } = useAuth();
  const [apiForms, setApiForms] = useState<any[]>([]);
  const [completedForms, setCompletedForms] = useState<Record<string, ConsentFormCompletion>>({});
  const [activeForm, setActiveForm] = useState<DisplayForm | null>(null);
  const [viewingForm, setViewingForm] = useState<DisplayForm | null>(null);
  const enrolledStudent = activeChild?.student ?? students.find((student) =>
    ['ENROLLED', 'ACTIVE'].includes(String(student.enrollmentStatus).toUpperCase()),
  );
  const storageKey = `mobsie.completed-consent-forms.${user?.id ?? 'anonymous'}.${enrolledStudent?.id ?? 'none'}`;
  useFocusEffect(
    React.useCallback(() => {
      if (token && enrolledStudent?.id) {
        apiData<any[]>(
          `/mobile/consent-forms?studentId=${encodeURIComponent(enrolledStudent.id)}`,
          { token, forceRefresh: true, cacheTtlMs: 0 },
        )
          .then(setApiForms)
          .catch(() => setApiForms([]));
      } else {
        setApiForms([]);
      }
      AsyncStorage.getItem(storageKey)
        .then((stored) => {
          const parsed = stored ? JSON.parse(stored) : {};
          // Upgrade the earlier ID-only local format without breaking existing users.
          setCompletedForms(
            Array.isArray(parsed)
              ? Object.fromEntries(
                  parsed.map((id: string) => [id, null]).filter(([, value]) => value),
                )
              : parsed,
          );
        })
        .catch(() => setCompletedForms({}));
    }, [enrolledStudent?.id, storageKey, token]),
  );
  const items: DisplayForm[] = consentFormTemplates.map((template) => {
    const remote: any = apiForms.find(
      (form: any) =>
        String(form.templateId || form.slug || form.id) === template.id ||
        String(form.title || form.name || '').toLowerCase() === template.title.toLowerCase(),
    );
    const rawStatus = String(remote?.signatureStatus || remote?.consentStatus || '').toUpperCase();
    const localCompletion = completedForms[template.id];
    const status =
      remote?.signed === true ||
      remote?.completed === true ||
      rawStatus === 'SIGNED' ||
      Boolean(localCompletion)
        ? 'SIGNED'
        : ['OUTSTANDING', 'REQUIRED', 'PENDING_SIGNATURE'].includes(rawStatus)
          ? 'OUTSTANDING'
          : 'AVAILABLE';
    return {
      ...template,
      status,
      due: remote?.dueAt || remote?.dueDate || null,
      signedAt: remote?.signedAt || localCompletion?.signedAt || null,
      completion: localCompletion || null,
      documentUrl:
        remote?.documentUrl || remote?.fileUrl || remote?.secureUrl || remote?.url || null,
      signerUrl: null,
    };
  });
  const available = items.filter((form) => form.status === 'AVAILABLE');
  const outstanding = items.filter((form) => form.status === 'OUTSTANDING');
  const signed = items.filter((form) => form.status === 'SIGNED');
  const applicationReference = (activeChild?.application ? [activeChild.application] : applications).find((application) =>
    ['APPROVED', 'ENROLLED'].includes(String(application.status).toUpperCase()),
  )?.reference;
  return (
    <Screen onRefresh={refresh}>
      <FeatureHeader title="Forms & Consent" />
      {loading && <ActivityIndicator color={colors.green} />}
      {!loading && (!enrolledStudent || !applicationReference) ? (
        <Card>
          <Ionicons name="lock-closed-outline" size={28} color={colors.orange} />
          <Text style={styles.headingSmall}>Available after enrolment</Text>
          <Text style={styles.subtle}>
            Consent forms unlock once your child is enrolled and an application reference has been
            issued.
          </Text>
        </Card>
      ) : (
        <>
          <Card style={styles.progressCard}>
            <View style={styles.progressRing}>
              <Ionicons name="documents-outline" size={28} color={colors.green} />
            </View>
            <View>
              <Text style={styles.headingSmall}>{items.length} forms available</Text>
              <Text style={styles.subtle}>Open and review each school consent form</Text>
            </View>
          </Card>
          {!!available.length && <SectionTitle title="Available Forms" />}
          {available.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onComplete={setActiveForm}
              onView={setViewingForm}
            />
          ))}
          {!!outstanding.length && <SectionTitle title="Outstanding Forms" />}
          {outstanding.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onComplete={setActiveForm}
              onView={setViewingForm}
            />
          ))}
          {!!signed.length && <SectionTitle title="Signed Forms" />}
          {signed.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onComplete={setActiveForm}
              onView={setViewingForm}
            />
          ))}
          <ConsentFormViewer form={viewingForm} onClose={() => setViewingForm(null)} />
          <ConsentEditor
            form={activeForm}
            applicationReference={applicationReference || ''}
            onClose={() => setActiveForm(null)}
            onCompleted={async (formId, completion) => {
              if (!token) throw new Error('Please sign in again.');
              await apiData(`/mobile/consent-forms/${encodeURIComponent(formId)}/complete`, {
                method: 'POST',
                token,
                body: JSON.stringify({
                  ...completion,
                  studentId: enrolledStudent?.id ?? null,
                  documentHtml: consentFormHtml(activeForm!, completion),
                }),
              });
              const next = { ...completedForms, [formId]: completion };
              setCompletedForms(next);
              await AsyncStorage.setItem(storageKey, JSON.stringify(next));
              setActiveForm(null);
              await refresh();
            }}
          />
        </>
      )}
    </Screen>
  );
}

type DisplayForm = ConsentFormTemplate & {
  status: 'AVAILABLE' | 'OUTSTANDING' | 'SIGNED';
  due: string | null;
  signedAt: string | null;
  documentUrl: string | null;
  signerUrl: string | null;
  completion: ConsentFormCompletion | null;
};

function readableDate(value: string | null, prefix: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? `${prefix} ${value}`
    : `${prefix} ${parsed.toLocaleDateString()}`;
}

async function openPrintableForm(form: DisplayForm) {
  if (form.documentUrl) {
    try {
      await Linking.openURL(form.documentUrl);
      return;
    } catch {
      // A stale or private Cloudinary URL must not stop the parent viewing the
      // form. Fall through to a locally rendered copy below.
    }
  }
  try {
    await Print.printAsync({ html: consentFormHtml(form, form.completion || undefined) });
  } catch {
    Alert.alert('Unable to open printable copy', 'The form is still available in the viewer.');
  }
}

function ConsentFormViewer({ form, onClose }: { form: DisplayForm | null; onClose: () => void }) {
  if (!form) return null;
  const completion = form.completion;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.editorSafe}>
        <View style={styles.editorHeader}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close form viewer">
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
          <Text style={styles.editorHeaderTitle}>View consent form</Text>
          <Pressable
            onPress={() => void openPrintableForm(form)}
            hitSlop={12}
            accessibilityLabel="Open printable form"
          >
            <Ionicons name="document-text-outline" size={24} color={colors.green} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.editorContent}>
          <View style={styles.editorDocument}>
            <Text style={styles.editorBrand}>MOBSIE CONNECT</Text>
            <Text style={styles.editorTitle}>{form.title}</Text>
            <Text style={styles.body}>{form.description}</Text>
            <View style={styles.declarationBox}>
              <Text style={styles.cardTitle}>Parent / guardian declaration</Text>
              {form.clauses.map((clause) => (
                <Text key={clause} style={styles.editorClause}>
                  ✓ {clause}
                </Text>
              ))}
            </View>
            {completion ? (
              <View style={styles.viewerDetails}>
                <ViewerDetail
                  label="Application reference"
                  value={completion.applicationReference}
                />
                <ViewerDetail label="Child's full name" value={completion.childName} />
                <ViewerDetail label="Parent / guardian" value={completion.guardianName} />
                <ViewerDetail label="ID or passport number" value={completion.guardianId} />
                <ViewerDetail label="Electronic signature" value={completion.signature} signature />
                <ViewerDetail label="Date signed" value={completion.signedAt} />
              </View>
            ) : (
              <View style={styles.viewerNotice}>
                <Ionicons
                  name={form.status === 'SIGNED' ? 'checkmark-circle' : 'information-circle'}
                  size={19}
                  color={form.status === 'SIGNED' ? colors.green : colors.orange}
                />
                <Text style={styles.viewerNoticeText}>
                  {form.status === 'SIGNED'
                    ? 'This form is recorded as signed. Use the document button above to open the saved copy when available.'
                    : 'Review this form, close the viewer, then choose Sign & Complete when you are ready.'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ViewerDetail({
  label,
  value,
  signature = false,
}: {
  label: string;
  value: string;
  signature?: boolean;
}) {
  return (
    <View style={styles.viewerDetail}>
      <Text style={styles.editorLabel}>{label}</Text>
      <Text style={[styles.viewerDetailValue, signature && styles.viewerSignature]}>{value}</Text>
    </View>
  );
}

function FormCard({
  form,
  onComplete,
  onView,
}: {
  form: DisplayForm;
  onComplete: (form: DisplayForm) => void;
  onView: (form: DisplayForm) => void;
}) {
  const isSigned = form.status === 'SIGNED';
  const isOutstanding = form.status === 'OUTSTANDING';
  const dateText = readableDate(isSigned ? form.signedAt : form.due, isSigned ? 'Signed' : 'Due');
  return (
    <Card style={styles.listCard}>
      <View style={[styles.iconBox, { backgroundColor: isSigned ? colors.mint : '#FFF1E7' }]}>
        <Ionicons
          name={isSigned ? 'checkmark' : 'document-text'}
          color={isSigned ? colors.green : colors.orange}
          size={20}
        />
      </View>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{form.title}</Text>
        <Text style={styles.subtle}>{dateText || form.description}</Text>
      </View>
      <View style={styles.formActions}>
        <Button title="View" color={colors.green} outline onPress={() => onView(form)} />
        {!isSigned && (
          <Button title="Sign & Complete" color={colors.orange} onPress={() => onComplete(form)} />
        )}
      </View>
    </Card>
  );
}

function ConsentEditor({
  form,
  applicationReference,
  onClose,
  onCompleted,
}: {
  form: DisplayForm | null;
  applicationReference: string;
  onClose: () => void;
  onCompleted: (formId: string, completion: ConsentFormCompletion) => Promise<void>;
}) {
  const { students } = useSchoolData();
  const [childName, setChildName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianId, setGuardianId] = useState('');
  const [signature, setSignature] = useState('');
  const [reference, setReference] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form) return;
    setChildName(students[0]?.name || '');
    setGuardianName('');
    setGuardianId('');
    setSignature('');
    setReference(applicationReference);
    setAccepted(false);
  }, [form?.id]);

  if (!form) return null;
  const completion = (): ConsentFormCompletion => ({
    applicationReference: reference.trim(),
    childName: childName.trim(),
    guardianName: guardianName.trim(),
    guardianId: guardianId.trim(),
    signature: signature.trim(),
    signedAt: new Date().toLocaleDateString(),
  });
  const validate = () => {
    if (
      !reference.trim() ||
      !childName.trim() ||
      !guardianName.trim() ||
      !guardianId.trim() ||
      !signature.trim()
    ) {
      Alert.alert(
        'Complete the form',
        'Child, guardian, ID/passport and signature fields are required.',
      );
      return false;
    }
    if (reference.trim().toUpperCase() !== applicationReference.trim().toUpperCase()) {
      Alert.alert(
        'Reference does not match',
        'Use the application reference issued for your enrolled child.',
      );
      return false;
    }
    if (!accepted) {
      Alert.alert('Consent required', 'Please accept the declaration before signing.');
      return false;
    }
    return true;
  };
  const preview = () => Print.printAsync({ html: consentFormHtml(form, completion()) });
  const submit = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await onCompleted(form.id, completion());
      // Persist first. PDF generation is a convenience and must never block a
      // parent from completing a form or make the dashboard record disappear.
      try {
        const result = await Print.printToFileAsync({ html: consentFormHtml(form, completion()) });
        Alert.alert('Form completed', 'Your signed consent is now saved to your school record.', [
          { text: 'Done' },
          {
            text: 'Share PDF',
            onPress: () =>
              Sharing.shareAsync(result.uri, {
                mimeType: 'application/pdf',
                dialogTitle: form.title,
              }).catch(() => undefined),
          },
        ]);
      } catch {
        Alert.alert('Form completed', 'Your signed consent is saved to your school record.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Could not complete form', message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.editorSafe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <View style={styles.editorHeader}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
          <Text style={styles.editorHeaderTitle}>Complete consent form</Text>
          <Pressable onPress={preview} hitSlop={12}>
            <Ionicons name="document-text-outline" size={24} color={colors.green} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.editorContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.editorDocument}>
            <Text style={styles.editorBrand}>MOBSIE CONNECT</Text>
            <Text style={styles.editorTitle}>{form.title}</Text>
            <Text style={styles.body}>{form.description}</Text>
            <View style={styles.declarationBox}>
              <Text style={styles.cardTitle}>Parent / guardian declaration</Text>
              {form.clauses.map((clause) => (
                <Text key={clause} style={styles.editorClause}>
                  ✓ {clause}
                </Text>
              ))}
            </View>
            <EditorField
              label="Child application reference"
              value={reference}
              onChangeText={setReference}
            />
            <EditorField label="Child's full name" value={childName} onChangeText={setChildName} />
            <EditorField
              label="Parent / guardian full name"
              value={guardianName}
              onChangeText={setGuardianName}
            />
            <EditorField
              label="ID or passport number"
              value={guardianId}
              onChangeText={setGuardianId}
            />
            <EditorField
              label="Type your electronic signature"
              value={signature}
              onChangeText={setSignature}
              signature
            />
            <Pressable style={styles.acceptRow} onPress={() => setAccepted((value) => !value)}>
              <Ionicons
                name={accepted ? 'checkbox' : 'square-outline'}
                size={24}
                color={colors.green}
              />
              <Text style={styles.acceptText}>
                I have reviewed this form and agree to the declaration above.
              </Text>
            </Pressable>
          </View>
          <Button title="Preview PDF" color={colors.green} outline onPress={preview} />
          <Button title={saving ? 'Creating signed PDF…' : 'Sign & Complete'} onPress={submit} />
          <Text style={styles.editorHelp}>
            A signed copy is securely saved to your school record.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EditorField({
  label,
  value,
  onChangeText,
  signature = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  signature?: boolean;
}) {
  return (
    <View style={styles.editorField}>
      <Text style={styles.editorLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={signature ? 'Type full name as signature' : label}
        placeholderTextColor="#9BA5A2"
        style={[styles.editorInput, signature && styles.signatureInput]}
      />
    </View>
  );
}

export function FeedbackScreen() {
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const { feedback, submitFeedback, refresh, loading } = useSchoolData();
  useFocusEffect(
    React.useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );
  return (
    <Screen onRefresh={refresh}>
      <FeatureHeader title="Feedback Centre" />
      <SectionTitle title="New Feedback" />
      <Card>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} onPress={() => setRating(value)}>
              <Text style={styles.stars}>{value <= rating ? '★' : '☆'}</Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Your feedback"
          value={message}
          onChangeText={setMessage}
          placeholder="Tell us what you think..."
          multiline
        />

        <Button
          title={submitting ? 'Submitting…' : 'Submit Feedback'}
          onPress={async () => {
            if (!message.trim()) {
              Alert.alert('Add your feedback', 'Please enter a message before submitting.');
              return;
            }
            try {
              setSubmitting(true);
              await submitFeedback(message.trim(), rating, 'RATING');
              setMessage('');
              setRating(5);
              Alert.alert('Thank you', 'Your feedback is saved and appears below.');
            } catch (error) {
              Alert.alert('Unable to save feedback', (error as Error).message);
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </Card>
      <View style={styles.feedbackHistoryHeader}>
        <SectionTitle title="Your Feedback" />
        <View style={styles.feedbackCountBadge}>
          <Text style={styles.feedbackCountText}>{feedback.length}</Text>
        </View>
      </View>
      {loading && !feedback.length ? (
        <ActivityIndicator color={colors.green} style={{ marginVertical: 20 }} />
      ) : feedback.length ? (
        feedback.map((item) => {
          const createdAt = new Date(item.createdAt);
          const date = Number.isNaN(createdAt.getTime())
            ? 'Recently submitted'
            : createdAt.toLocaleDateString('en-ZA', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
          const resolved = item.status === 'RESOLVED';
          return (
            <FeedbackCard
              key={item.id}
              icon={resolved ? 'checkmark-circle' : 'chatbubble-ellipses'}
              title={
                item.category === 'RATING' ? 'School feedback' : item.category.replace(/_/g, ' ')
              }
              body={item.message}
              color={resolved ? colors.green : colors.orange}
              meta={`${item.rating ? `${'★'.repeat(item.rating)} · ` : ''}${date}`}
              status={item.status}
              reply={item.reply}
              repliedAt={item.repliedAt}
              repliedByName={item.repliedByName}
            />
          );
        })
      ) : (
        <Card style={styles.feedbackEmpty}>
          <Ionicons name="chatbubble-outline" size={30} color={colors.green} />
          <Text style={styles.cardTitle}>No feedback submitted yet</Text>
          <Text style={styles.subtle}>Your feedback will appear here after you send it.</Text>
        </Card>
      )}
    </Screen>
  );
}

function FeedbackCard({
  icon,
  title,
  body,
  color,
  meta,
  status,
  reply,
  repliedAt,
  repliedByName,
}: {
  icon: IconName;
  title: string;
  body: string;
  color: string;
  meta?: string;
  status?: string;
  reply?: string | null;
  repliedAt?: string | null;
  repliedByName?: string | null;
}) {
  const replyDate = repliedAt ? new Date(repliedAt) : null;
  const replyMeta =
    replyDate && !Number.isNaN(replyDate.getTime())
      ? replyDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
  return (
    <Card style={styles.listCard}>
      <View style={[styles.iconBox, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.flex}>
        <View style={styles.feedbackCardHeading}>
          <Text style={[styles.cardTitle, styles.flex]}>{title}</Text>
          {!!status && <Text style={styles.feedbackStatus}>{status.toLowerCase()}</Text>}
        </View>
        <Text style={styles.subtle}>{body}</Text>
        {!!meta && <Text style={styles.feedbackMeta}>{meta}</Text>}
        {!!reply && (
          <View style={styles.feedbackReply}>
            <View style={styles.feedbackReplyHeading}>
              <Ionicons name="return-down-forward" size={15} color={colors.green} />
              <Text style={styles.feedbackReplyTitle}>
                {repliedByName || 'Mobsie Kids'} replied
              </Text>
            </View>
            <Text style={styles.feedbackReplyBody}>{reply}</Text>
            {!!replyMeta && <Text style={styles.feedbackReplyMeta}>{replyMeta}</Text>}
          </View>
        )}
      </View>
    </Card>
  );
}

export function NewsletterScreen() {
  const { newsletters, refresh, loading } = useSchoolData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useFocusEffect(
    React.useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );
  const list = newsletters.map((item: any, index: number) => {
    const rawDate = item.publishedAt || item.createdAt || item.sentAt || item.sent;
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const content = item.content && typeof item.content === 'object' ? item.content : {};
    return {
      ...item,
      content,
      id: String(item.id || `newsletter-${index}`),
      title: item.title || item.subject || 'School Newsletter',
      body:
        content.intro ||
        item.body ||
        item.message ||
        'Open this newsletter to read the latest school news.',
      audience: item.audience || item.branchName || 'All branches',
      displayDate:
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleDateString('en-ZA', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : rawDate || 'Latest edition',
      imageUrl:
        content.featureImageUrl ||
        content.headerImageUrl ||
        item.imageUrl ||
        item.coverUrl ||
        item.thumbnailUrl ||
        null,
    };
  });
  const selected = list.find((item: any) => item.id === selectedId);

  if (!selected) {
    return (
      <Screen onRefresh={refresh} style={styles.newsletterListScreen}>
        <AppHeader title="Newsletters" />
        <View style={styles.newsletterHero}>
          <View style={styles.newsletterHeroCopy}>
            <Text style={styles.newsletterEyebrow}>MOBSIE STORIES</Text>
            <Text style={styles.newsletterHeroTitle}>News from our school community</Text>
            <Text style={styles.newsletterHeroBody}>
              Updates, celebrations and important dates—all in one place.
            </Text>
          </View>
          <View style={styles.newsletterHeroIcon}>
            <Ionicons name="newspaper-outline" size={34} color="#fff" />
          </View>
        </View>
        {loading && <ActivityIndicator color={colors.green} style={{ marginVertical: 18 }} />}
        <View style={styles.newsletterListHeading}>
          <Text style={styles.newsletterListTitle}>Latest editions</Text>
          <Text style={styles.newsletterCount}>{list.length}</Text>
        </View>
        {list.map((item: any, index: number) => (
          <Pressable key={item.id} onPress={() => setSelectedId(item.id)}>
            {({ pressed }) => (
              <Card style={[styles.newsletterListCard, pressed && { opacity: 0.82 }]}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.newsletterCover}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.newsletterCoverFallback,
                      { backgroundColor: index % 2 ? '#9869DE' : colors.orange },
                    ]}
                  >
                    <Ionicons name="sparkles-outline" size={21} color="#fff" />
                    <Text style={styles.newsletterCoverMonth}>NEWS</Text>
                  </View>
                )}
                <View style={styles.newsletterListCopy}>
                  <Text style={styles.newsletterAudience}>{item.audience}</Text>
                  <Text style={styles.newsletterListCardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.newsletterListDate}>{item.displayDate}</Text>
                  <Text style={styles.newsletterPreview} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                <View style={styles.newsletterOpenButton}>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              </Card>
            )}
          </Pressable>
        ))}
        {!loading && !list.length && (
          <Card style={styles.newsletterEmpty}>
            <Ionicons name="mail-open-outline" size={34} color={colors.green} />
            <Text style={styles.newsletterListTitle}>No newsletters yet</Text>
            <Text style={styles.subtle}>Pull down to check for newly published editions.</Text>
          </Card>
        )}
      </Screen>
    );
  }

  const content = selected.content || {};
  const heroTitle = content.heroTitle || 'A bright week at Mobsie';
  const featureTitle = content.featureTitle || selected.title;
  const intro = content.intro || selected.body;
  const featureCopy = content.featureCopy || selected.body;
  const ctaText = content.ctaText || 'View update';
  const ctaLink = content.ctaLink || 'https://mobsiekids.co.za';
  const footer = content.footer || 'Thank you for being part of our school community.';
  const footerImageUrl = content.footerImageUrl || '';
  const headerImageUrl = content.headerImageUrl || '';
  const featureImageUrl = content.featureImageUrl || selected.imageUrl || '';
  const openNewsletterLink = () => {
    if (!ctaLink) return;
    Linking.openURL(ctaLink).catch(() =>
      Alert.alert('Unable to open link', 'Please try again in a moment.'),
    );
  };
  return (
    <Screen onRefresh={refresh} style={styles.newsletterScreen}>
      <View style={styles.newsletterReaderHeader}>
        <Pressable onPress={() => setSelectedId(null)} hitSlop={12} style={styles.newsletterBack}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.newsletterReaderLabel}>Newsletter</Text>
        <Ionicons name="bookmark-outline" size={21} color={colors.ink} />
      </View>
      <View style={styles.newsletterEmail}>
        <View style={styles.newsletterEmailHeader}>
          <Image
            source={images.logo}
            style={styles.newsletterEmailLogo}
            resizeMode="contain"
            accessibilityLabel="Mobsie Kids"
          />
        </View>
        {headerImageUrl ? (
          <ImageBackground
            source={{ uri: headerImageUrl }}
            style={styles.newsletterEmailHero}
            imageStyle={styles.newsletterEmailHeroImage}
          >
            <View style={styles.newsletterEmailHeroOverlay}>
              <Text style={styles.newsletterEmailHeroTitle}>{heroTitle}</Text>
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.newsletterEmailHeroFallback}>
            <Text style={styles.newsletterEmailHeroTitle}>{heroTitle}</Text>
          </View>
        )}
        <View style={styles.newsletterEmailBody}>
          <Text style={styles.newsletterEmailTitle}>{featureTitle}</Text>
          <Text style={styles.newsletterEmailCopy}>{intro}</Text>
          {featureImageUrl ? (
            <Image
              source={{ uri: featureImageUrl }}
              style={styles.newsletterEmailFeatureImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.newsletterEmailFeatureFallback}>
              <Ionicons name="image-outline" size={30} color="#8C7CA7" />
              <Text style={styles.newsletterEmailFeatureFallbackText}>School update</Text>
            </View>
          )}
          <Text style={styles.newsletterEmailCopy}>{featureCopy}</Text>
          {!!ctaText && (
            <Pressable
              accessibilityRole="link"
              disabled={!ctaLink}
              onPress={openNewsletterLink}
              style={({ pressed }) => [
                styles.newsletterEmailCta,
                pressed && ctaLink ? { opacity: 0.82 } : null,
              ]}
            >
              <Text style={styles.newsletterEmailCtaText}>{ctaText}</Text>
            </Pressable>
          )}
        </View>
        {footerImageUrl ? (
          <ImageBackground
            source={{ uri: footerImageUrl }}
            style={styles.newsletterEmailFooterImage}
            imageStyle={styles.newsletterEmailFooterBackground}
          >
            <View style={styles.newsletterEmailFooterOverlay}>
              <Text style={[styles.newsletterEmailFooterText, styles.newsletterEmailFooterTextOnImage]}>{footer}</Text>
              <Text style={[styles.newsletterEmailFooterMeta, styles.newsletterEmailFooterTextOnImage]}>
                Mobsie Kids · You are receiving this because your family is connected to Mobsie.
              </Text>
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.newsletterEmailFooter}>
            <Text style={styles.newsletterEmailFooterText}>{footer}</Text>
            <Text style={styles.newsletterEmailFooterMeta}>
              Mobsie Kids · You are receiving this because your family is connected to Mobsie.
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { notifications: remoteNotifications, refresh } = useSchoolData();
  const { token } = useAuth();
  const palette = [colors.orange, '#3F8CFF', '#FF4E5C', '#706AF2', '#EE4B91', '#18C58F'];
  const icons: IconName[] = [
    'bus-outline',
    'time-outline',
    'wallet-outline',
    'megaphone-outline',
    'gift-outline',
    'calendar-outline',
  ];
  const list = (remoteNotifications.length ? remoteNotifications : notifications).map(
    (item: any, index: number) => {
      const rawTime = item.time || item.date || item.createdAt || item.created_at || '';
      const parsedTime = rawTime ? new Date(rawTime) : null;
      return {
        id: item.id,
        data: item.data && typeof item.data === 'object' ? item.data : {},
        title: item.title || item.name || 'School notification',
        body: item.body || item.message || '',
        color: item.color || palette[index % palette.length],
        icon: item.icon || icons[index % icons.length],
        time:
          parsedTime && !Number.isNaN(parsedTime.getTime())
            ? parsedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : rawTime,
      };
    },
  );
  return (
    <Screen onRefresh={refresh} style={styles.notificationsScreen}>
      <View style={styles.notificationsHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          hitSlop={12}
          onPress={() => navigation.openDrawer()}
          style={styles.notificationHeaderButton}
        >
          <Ionicons name="menu" size={29} color={colors.ink} />
        </Pressable>
        <Text style={styles.notificationsTitle}>Notifications</Text>
        <Pressable hitSlop={12} style={styles.notificationHeaderButton}>
          <Ionicons name="settings-outline" size={23} color="#111" />
        </Pressable>
      </View>
      {list.map((item: any, index: number) => (
        <Pressable
          key={`${item.title}-${index}`}
          onPress={() => {
            openNotificationDestination(navigation, item.data);
            if (token && item.id) {
              apiData('/mobile/notifications', {
                method: 'PATCH',
                token,
                body: JSON.stringify({ id: item.id }),
              })
                .then(() => refresh())
                .catch(() => undefined);
            }
          }}
          style={[styles.notificationCard, { borderLeftColor: item.color }]}
        >
          <View style={[styles.notificationIcon, { backgroundColor: `${item.color}12` }]}>
            <Ionicons name={item.icon} size={21} color={item.color} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.notificationCardTitle}>{item.title}</Text>
            <Text style={styles.notificationBody}>{item.body}</Text>
          </View>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

export function StudentReportScreen() {
  const { students, academics, attendance, refresh, loading } = useSchoolData();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const student = students[0];
  const records = academics.filter((item) => item.studentId === student?.id);
  const scores = records.map((item) => Number(item.score)).filter(Number.isFinite);
  const average = scores.length
    ? Math.round(scores.reduce((sum, item) => sum + item, 0) / scores.length)
    : 0;
  const studentAttendance = attendance.filter((item) => item.studentId === student?.id);
  const attended = studentAttendance.filter((item) =>
    ['PRESENT', 'LATE'].includes(String(item.status).toUpperCase()),
  ).length;
  const attendanceRate = studentAttendance.length
    ? Math.round((attended / studentAttendance.length) * 100)
    : Math.round(Number(student?.attendanceRate) || 0);
  const stats = [
    { label: 'Attendance', value: `${attendanceRate}%`, color: colors.green2 },
    { label: 'Overall Average', value: `${average}%`, color: colors.orange },
  ];
  const escapeHtml = (value: unknown) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] || char,
    );
  const generatePdf = async () => {
    if (!student) {
      Alert.alert(
        'Report unavailable',
        'An enrolled child is required before generating a report.',
      );
      return;
    }
    setGeneratingPdf(true);
    try {
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        @page{margin:32px}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#183F3A;margin:0}
        .brand{border-bottom:6px solid #FF6508;padding-bottom:18px}.brand h1{font-size:28px;margin:0}.brand p{color:#71807D;margin:6px 0 0}
        .hero{background:#F8F4EC;border-radius:18px;margin:24px 0;padding:22px}.hero h2{font-size:24px;margin:0}.hero p{color:#66736F;margin:5px 0 0}
        .stats{display:flex;gap:16px;margin-bottom:25px}.stat{border:1px solid #DDE7E4;border-radius:16px;flex:1;padding:18px}.stat b{display:block;color:#FF6508;font-size:30px}.stat:first-child b{color:#50A76D}
        .footer{color:#8A9592;font-size:11px;margin-top:36px;text-align:center}
      </style></head><body>
        <div class="brand"><h1>Mobsie Connect</h1><p>Student progress report · ${escapeHtml(new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }))}</p></div>
        <div class="hero"><h2>${escapeHtml(student.name)}</h2><p>${escapeHtml(student.grade)} · ${escapeHtml(student.className)} · ${escapeHtml(student.branchName)}</p></div>
        <div class="stats"><div class="stat"><b>${attendanceRate}%</b>Attendance<br><small>${studentAttendance.length} register entries</small></div><div class="stat"><b>${average}%</b>Overall academic average<br><small>${scores.length} assessed subjects</small></div></div>
        <div class="footer">Generated securely by Mobsie Connect</div>
      </body></html>`;
      const result = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${student.name} report`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Print.printAsync({ html });
      }
    } catch (error) {
      Alert.alert(
        'PDF generation failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setGeneratingPdf(false);
    }
  };
  return (
    <Screen onRefresh={refresh}>
      <FeatureHeader title={`${student?.name ?? 'Student'}’s Report`} />
      {loading && <ActivityIndicator color={colors.green} />}
      <Card style={styles.listCard}>
        <Avatar name={student?.name ?? 'Student'} />
        <View style={styles.flex}>
          <Text style={styles.headingSmall}>{student?.name ?? 'No enrolled student'}</Text>
          <Text style={styles.subtle}>
            {student ? `${student.grade} · ${student.className}` : 'Complete enrolment first'}
          </Text>
        </View>
        <Ionicons name="shield-checkmark" size={26} color={colors.purple} />
      </Card>
      <SectionTitle title="Key Stats" />
      <View style={styles.twoColumns}>
        {stats.map((stat) => (
          <Card key={stat.label} style={styles.halfCard}>
            <Text style={[styles.metric, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.subtle}>{stat.label}</Text>
          </Card>
        ))}
      </View>
      <Button
        title={generatingPdf ? 'Generating PDF…' : 'Download PDF Report'}
        icon="download-outline"
        onPress={generatingPdf ? undefined : generatePdf}
      />
    </Screen>
  );
}

export function StoreScreen() {
  const navigation = useNavigation<any>();
  const { products: remoteProducts, cart, refresh } = useSchoolData();
  return (
    <Screen onRefresh={refresh}>
      <View style={styles.storeHeader}>
        <AppHeader title="School Shop" notification={false} />
        <Pressable onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart" size={24} color={colors.green} />
          <Text style={styles.cartCount}>{cart.reduce((sum, line) => sum + line.quantity, 0)}</Text>
        </Pressable>
      </View>
      <Card style={styles.promo}>
        <Text style={styles.promoText}>BACK TO SCHOOL SALE · 20% OFF</Text>
      </Card>
      <SectionTitle title="Featured Products" />
      <View style={styles.productGrid}>
        {remoteProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </View>
    </Screen>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useSchoolData();
  const [selectedColor, setSelectedColor] = useState<string>();
  const availableColors = product.colors ?? [];
  return (
    <Card style={styles.productCard}>
      <View style={[styles.productArt, { backgroundColor: '#F3F4F6' }]}>
        <Image
          source={product.imageUrl ? { uri: product.imageUrl } : images.logo}
          style={styles.productImage}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.cardTitle}>{product.name}</Text>
      <Text style={styles.price}>
        R{Number(product.price).toFixed(2)} · {product.stock} left
      </Text>
      {!!availableColors.length && (
        <View style={styles.productColorOptions}>
          {availableColors.map((color) => (
            <Pressable
              key={color}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedColor === color }}
              onPress={() => setSelectedColor(color)}
              style={[
                styles.productColorOption,
                selectedColor === color && styles.productColorOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.productColorText,
                  selectedColor === color && styles.productColorTextSelected,
                ]}
              >
                {color}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Button
        title={availableColors.length && !selectedColor ? 'Select a colour' : 'Add to cart'}
        color={colors.orange}
        onPress={() => {
          if (availableColors.length && !selectedColor) {
            Alert.alert('Select a colour', `Choose a colour for ${product.name} first.`);
            return;
          }
          addToCart(product, selectedColor);
        }}
      />
    </Card>
  );
}

export function CartScreen() {
  const { cart, changeQuantity, checkout, students } = useSchoolData();
  const subtotal = cart.reduce((sum, product) => sum + Number(product.price) * product.quantity, 0);
  const enrolledStudent = students.find((student) =>
    ['ENROLLED', 'ACTIVE'].includes(String(student.enrollmentStatus).toUpperCase()),
  );
  return (
    <Screen>
      <FeatureHeader title={`Shopping Cart (${cart.length})`} />
      {cart.map((product) => (
        <Card key={product.cartKey} style={styles.listCard}>
          <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
            <Image
              source={product.imageUrl ? { uri: product.imageUrl } : images.logo}
              style={styles.cartImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{product.name}</Text>
            {!!product.selectedColor && (
              <Text style={styles.subtle}>Colour: {product.selectedColor}</Text>
            )}
            <Text style={styles.price}>R{Number(product.price * product.quantity).toFixed(2)}</Text>
          </View>
          <View style={styles.quantityControls}>
            <Pressable onPress={() => changeQuantity(product.cartKey, -1)}>
              <Text style={styles.quantity}>−</Text>
            </Pressable>
            <Text>{product.quantity}</Text>
            <Pressable onPress={() => changeQuantity(product.cartKey, 1)}>
              <Text style={styles.quantity}>+</Text>
            </Pressable>
          </View>
        </Card>
      ))}
      <Field label="Coupon Code" placeholder="Enter coupon code" />
      <Button title="Apply" />
      <SectionTitle title="Order Summary" />
      <Card>
        {[
          ['Subtotal', subtotal],
          ['Collection fee', 0],
          ['Total', subtotal],
        ].map(([label, value]) => (
          <View key={label} style={styles.summaryRow}>
            <Text style={label === 'Total' ? styles.headingSmall : styles.body}>{label}</Text>
            <Text style={label === 'Total' ? styles.headingSmall : styles.body}>R{value}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Collection</Text>
        <Text style={styles.subtle}>
          {enrolledStudent
            ? `Collect from ${enrolledStudent.branchName}. We will notify you when the order is ready.`
            : 'Complete enrolment before ordering so we can assign the correct collection branch.'}
        </Text>
      </Card>
      <Button
        title="Pay securely with PayFast"
        onPress={async () => {
          if (!cart.length) return Alert.alert('Cart is empty');
          if (!enrolledStudent?.branchId)
            return Alert.alert(
              'Complete enrolment first',
              'Your child must be enrolled before an order can be assigned to a collection branch.',
            );
          try {
            const order = await checkout(enrolledStudent.branchId);
            if (!order.checkoutUrl) throw new Error('PayFast checkout could not be started.');
            await Linking.openURL(order.checkoutUrl);
          } catch (error) {
            Alert.alert('Checkout failed', (error as Error).message);
          }
        }}
      />
      <Button title="Continue Shopping" color={colors.green} outline />
    </Screen>
  );
}

export function OrdersScreen() {
  const { orders, products, refreshOrders, loading } = useSchoolData();
  useFocusEffect(
    useCallback(() => {
      void refreshOrders().catch(() => undefined);
    }, [refreshOrders]),
  );
  return (
    <Screen onRefresh={refreshOrders}>
      <FeatureHeader title="My Orders" />
      {loading && <ActivityIndicator color={colors.green} />}
      {orders.map((order) => (
        <Card key={order.id} style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View style={styles.orderIcon}>
              <Ionicons name="receipt-outline" size={24} color={colors.green} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{order.reference.replace(/^ORD-\d{4}-/, 'ORD-')}</Text>
              <Text style={styles.subtle}>
                {sentenceCase(order.status)}
                {order.createdAt && !Number.isNaN(new Date(order.createdAt).getTime())
                  ? ` · ${new Date(order.createdAt).toLocaleDateString()}`
                  : ''}
              </Text>
            </View>
            <Text style={styles.orderTotal}>R{(order.totalInCents / 100).toFixed(2)}</Text>
          </View>
          {!!order.items?.length && (
            <View style={styles.orderItems}>
              {order.items.map((item, index) => {
                const productImageUrl = products.find(
                  (product) => product.id === item.productId,
                )?.imageUrl;
                return (
                  <View key={`${item.productId || item.name}-${index}`} style={styles.orderItemRow}>
                    <Image
                      source={productImageUrl ? { uri: productImageUrl } : images.logo}
                      style={styles.orderItemImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.orderItemName}>
                      {item.quantity} × {item.name}
                      {item.selectedColor ? ` · ${item.selectedColor}` : ''}
                    </Text>
                    {typeof item.unitPriceInCents === 'number' && (
                      <Text style={styles.subtle}>
                        R{((item.unitPriceInCents * item.quantity) / 100).toFixed(2)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          {!!order.branchName && (
            <View style={styles.orderCollection}>
              <Ionicons name="location-outline" size={15} color={colors.green} />
              <Text style={styles.subtle}>Collect from {order.branchName}</Text>
            </View>
          )}
        </Card>
      ))}
      {!loading && !orders.length && (
        <Card>
          <Text style={styles.subtle}>No orders yet.</Text>
        </Card>
      )}
      <Button title="Refresh Orders" outline onPress={refreshOrders} />
    </Screen>
  );
}

function productImage(id: string) {
  if (id === 'backpack') return images.shop.backpack;
  if (id === 'lunchbox') return images.shop.lunchBag;
  if (id === 'bottle') return images.shop.bottle;
  if (id === 'pencilcase') return images.shop.pencilCase;
  return images.logo;
}

function ShopBottomNav({ active }: { active: 'Shop' | 'Cart' | 'Orders' }) {
  const navigation = useNavigation<any>();
  const items = [
    ['Home', 'home-outline', () => navigation.navigate('Tabs', { screen: 'Home' })],
    ['Shop', 'grid-outline', () => navigation.navigate('Store')],
    ['Orders', 'receipt-outline', () => navigation.navigate('Orders')],
    ['Account', 'person-outline', () => navigation.navigate('Tabs', { screen: 'Profile' })],
  ] as const;
  return (
    <View style={styles.shopBottomNav}>
      {items.map(([label, icon, onPress]) => (
        <Pressable key={label} style={styles.shopBottomItem} onPress={onPress}>
          <Ionicons
            name={icon}
            size={21}
            color={
              (active === 'Shop' && label === 'Shop') || (active === 'Orders' && label === 'Orders')
                ? colors.green
                : colors.muted
            }
          />
          <Text style={styles.shopBottomLabel}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function BrandStoryScreen() {
  return (
    <Screen>
      <FeatureHeader title="Logo Breakdown" />
      <View style={styles.brandMarks}>
        <Ionicons name="people-circle" size={74} color={colors.orange} />
        <Text style={styles.plus}>+</Text>
        <Ionicons name="sparkles" size={74} color={colors.green2} />
      </View>
      <Card style={{ backgroundColor: colors.mint }}>
        <Text style={styles.body}>
          This process shows how the Mobsie Connect logo was built from human connection and
          educational growth. The playful building-block shapes reflect children, care and the
          imagination behind their future.
        </Text>
      </Card>
      <Card style={{ marginTop: 14, backgroundColor: '#FFF4E5' }}>
        <Text style={styles.body}>
          When connected together, the elements represent the organisation, its centres and the
          families it serves—working together to learn, grow and thrive.
        </Text>
      </Card>
    </Screen>
  );
}

export function DeliveryPlanScreen() {
  return (
    <Screen>
      <FeatureHeader title="App Delivery Plan" />
      {deliveryMilestones.map((milestone) => (
        <Card key={milestone.id} style={styles.listCard}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  milestone.status === 'Complete'
                    ? colors.green2
                    : milestone.status === 'On track'
                      ? colors.orange
                      : colors.purple,
              },
            ]}
          />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{milestone.title}</Text>
            <Text style={styles.subtle}>
              {milestone.startDate} → {milestone.endDate} · {milestone.owner}
            </Text>
          </View>
          <Text style={styles.timeLabel}>{milestone.status}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heading: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: 12,
  },
  headingSmall: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  subtle: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  body: { color: colors.text, fontSize: 12, lineHeight: 19 },
  cardTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  timeline: { marginTop: 18, position: 'relative' },
  timelineRail: {
    backgroundColor: colors.green2,
    bottom: 30,
    left: 55,
    position: 'absolute',
    top: 12,
    width: 3,
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
    position: 'relative',
  },
  time: { color: colors.muted, fontSize: 9, width: 42 },
  dot: { borderRadius: 6, height: 12, marginHorizontal: 8, width: 12 },
  activityCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 65,
  },
  androidActivityCard: {
    borderColor: '#E4EEE8',
    borderLeftWidth: 4,
    elevation: 1,
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  currentActivity: { borderColor: colors.green, borderWidth: 2, borderLeftWidth: 4 },
  classLabel: { color: colors.green, fontFamily: 'Poppins_600SemiBold', fontSize: 8, marginTop: 2 },
  liveClassBanner: {
    alignItems: 'center',
    backgroundColor: '#E9F4FF',
    borderColor: '#B6DCFF',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    padding: 14,
  },
  livePulse: {
    backgroundColor: colors.blue,
    borderColor: '#fff',
    borderRadius: 9,
    borderWidth: 3,
    height: 18,
    width: 18,
  },
  liveEyebrow: {
    color: colors.blue,
    fontFamily: 'Poppins_700Bold',
    fontSize: 7,
    letterSpacing: 1.1,
  },
  liveClassTitle: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 15, marginTop: 1 },
  liveClassDetail: { color: colors.muted, fontSize: 9, marginTop: 1 },
  livePercent: { color: colors.blue, fontFamily: 'Poppins_700Bold', fontSize: 13 },
  nowBadge: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    color: '#fff',
    fontSize: 7,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  nowLine: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    flexDirection: 'row',
    height: 1,
    left: 44,
    position: 'absolute',
    right: 0,
    zIndex: 5,
  },
  nowDot: { backgroundColor: colors.blue, borderRadius: 5, height: 8, width: 8 },
  nowTime: {
    backgroundColor: colors.blue,
    color: '#fff',
    fontSize: 7,
    fontWeight: '800',
    marginLeft: 3,
    paddingHorizontal: 4,
  },
  progressCard: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  progressRing: {
    alignItems: 'center',
    borderColor: colors.green2,
    borderRadius: 35,
    borderWidth: 7,
    height: 70,
    justifyContent: 'center',
    width: 70,
  },
  progressValue: { color: colors.green, fontSize: 17, fontWeight: '900' },
  formActions: { gap: 6 },
  editorSafe: { backgroundColor: colors.cream, flex: 1, paddingTop: 12 },
  editorHeader: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  editorHeaderTitle: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 15 },
  editorContent: { gap: 12, padding: 16, paddingBottom: 42 },
  editorDocument: {
    backgroundColor: '#fff',
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  editorBrand: {
    color: colors.orange,
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    letterSpacing: 1.4,
  },
  editorTitle: {
    color: colors.ink,
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    marginBottom: 5,
    marginTop: 8,
  },
  declarationBox: {
    backgroundColor: '#F3F8F6',
    borderRadius: 14,
    gap: 8,
    marginVertical: 16,
    padding: 14,
  },
  editorClause: { color: colors.text, fontSize: 10, lineHeight: 15 },
  viewerDetails: { gap: 12, marginTop: 4 },
  viewerDetail: { borderBottomColor: colors.line, borderBottomWidth: 1, paddingBottom: 9 },
  viewerDetailValue: { color: colors.ink, fontSize: 12, lineHeight: 19 },
  viewerSignature: { color: colors.green, fontSize: 18, fontStyle: 'italic' },
  viewerNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF7EA',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 9,
    marginTop: 4,
    padding: 12,
  },
  viewerNoticeText: { color: colors.text, flex: 1, fontSize: 10, lineHeight: 16 },
  editorField: { marginBottom: 13 },
  editorLabel: {
    color: colors.ink,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    marginBottom: 5,
  },
  editorInput: {
    backgroundColor: '#fff',
    borderColor: '#CCD7D4',
    borderRadius: 11,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 12,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  signatureInput: { color: colors.green, fontSize: 18, fontStyle: 'italic' },
  acceptRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 9, marginTop: 4 },
  acceptText: { color: colors.text, flex: 1, fontSize: 10, lineHeight: 16 },
  editorHelp: { color: colors.muted, fontSize: 8, lineHeight: 13, textAlign: 'center' },
  listCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    paddingVertical: 10,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  stars: {
    color: colors.amber,
    fontSize: 25,
    letterSpacing: 4,
    textAlign: 'center',
  },
  ratingRow: { flexDirection: 'row', justifyContent: 'center' },
  feedbackHistoryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 20,
  },
  feedbackCountBadge: {
    alignItems: 'center',
    backgroundColor: '#E5F2EC',
    borderRadius: 12,
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  feedbackCountText: {
    color: colors.green,
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
  },
  feedbackCardHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  feedbackStatus: {
    backgroundColor: '#F1F4F3',
    borderRadius: 10,
    color: colors.green,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 7,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    textTransform: 'capitalize',
  },
  feedbackMeta: { color: '#8B9290', fontSize: 8, marginTop: 7 },
  feedbackReply: {
    backgroundColor: '#EDF8F3',
    borderColor: '#CBE8DB',
    borderLeftWidth: 3,
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
  },
  feedbackReplyHeading: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  feedbackReplyTitle: { color: colors.green, fontFamily: 'Poppins_700Bold', fontSize: 10 },
  feedbackReplyBody: { color: '#35534B', fontSize: 11, lineHeight: 18, marginTop: 6 },
  feedbackReplyMeta: { color: '#81918C', fontSize: 8, marginTop: 7 },
  feedbackEmpty: { alignItems: 'center', gap: 8, padding: 28 },
  newsletterScreen: { backgroundColor: '#F3F0F7', paddingBottom: 28 },
  newsletterListScreen: { paddingHorizontal: 15, paddingBottom: 28 },
  newsletterHero: {
    backgroundColor: '#174F49',
    borderRadius: 24,
    flexDirection: 'row',
    marginBottom: 24,
    marginTop: 12,
    minHeight: 166,
    overflow: 'hidden',
    padding: 22,
  },
  newsletterHeroCopy: { flex: 1, paddingRight: 8 },
  newsletterEyebrow: {
    color: '#FFC568',
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    letterSpacing: 1.7,
  },
  newsletterHeroTitle: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    lineHeight: 27,
    marginTop: 8,
  },
  newsletterHeroBody: { color: '#DCEBE8', fontSize: 9, lineHeight: 14, marginTop: 8 },
  newsletterHeroIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.orange,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    transform: [{ rotate: '7deg' }],
    width: 64,
  },
  newsletterListHeading: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 13 },
  newsletterListTitle: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 17 },
  newsletterCount: {
    backgroundColor: '#E5F2EC',
    borderRadius: 12,
    color: colors.green,
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  newsletterListCard: {
    alignItems: 'center',
    borderRadius: 21,
    flexDirection: 'row',
    gap: 13,
    marginBottom: 14,
    minHeight: 132,
    padding: 11,
  },
  newsletterCover: { borderRadius: 15, height: 108, width: 86 },
  newsletterCoverFallback: {
    alignItems: 'center',
    borderRadius: 15,
    height: 108,
    justifyContent: 'center',
    width: 86,
  },
  newsletterCoverMonth: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 7,
  },
  newsletterListCopy: { flex: 1 },
  newsletterAudience: {
    color: colors.green,
    fontFamily: 'Poppins_700Bold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  newsletterListCardTitle: {
    color: colors.ink,
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 4,
  },
  newsletterListDate: { color: '#8B9290', fontSize: 8, marginTop: 2 },
  newsletterPreview: { color: '#56605E', fontSize: 8.5, lineHeight: 13, marginTop: 7 },
  newsletterOpenButton: {
    alignItems: 'center',
    backgroundColor: colors.orange,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  newsletterEmpty: { alignItems: 'center', gap: 8, padding: 28 },
  newsletterReaderHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    marginTop: 8,
  },
  newsletterBack: {
    alignItems: 'center',
    backgroundColor: '#EFF5F1',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  newsletterReaderLabel: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 15 },
  newsletterEmail: {
    backgroundColor: '#fff',
    borderRadius: 22,
    elevation: 4,
    overflow: 'hidden',
    shadowColor: '#25163B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  newsletterEmailHeader: {
    alignItems: 'center',
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  newsletterEmailLogo: {
    height: 52,
    width: 150,
  },
  newsletterEmailHero: { minHeight: 175, width: '100%' },
  newsletterEmailHeroImage: { resizeMode: 'cover' },
  newsletterEmailHeroOverlay: {
    backgroundColor: 'rgba(79, 38, 133, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: 175,
    padding: 23,
  },
  newsletterEmailHeroFallback: {
    backgroundColor: colors.orange,
    minHeight: 175,
    padding: 23,
    justifyContent: 'flex-end',
  },
  newsletterEmailHeroTitle: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 25,
    lineHeight: 31,
  },
  newsletterEmailHeroMeta: {
    color: '#FFF4E8',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  newsletterEmailBody: { padding: 23 },
  newsletterEmailEyebrow: {
    color: '#6F3CC3',
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    letterSpacing: 1.6,
  },
  newsletterEmailTitle: {
    color: colors.ink,
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    lineHeight: 27,
    marginTop: 8,
  },
  newsletterEmailCopy: {
    color: '#45404B',
    fontSize: 10,
    lineHeight: 17,
    marginTop: 13,
  },
  newsletterEmailFeatureImage: {
    borderRadius: 16,
    height: 190,
    marginTop: 20,
    width: '100%',
  },
  newsletterEmailFeatureFallback: {
    alignItems: 'center',
    backgroundColor: '#F0EAF8',
    borderRadius: 16,
    height: 160,
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
  },
  newsletterEmailFeatureFallbackText: {
    color: '#6F3CC3',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    marginTop: 8,
  },
  newsletterEmailCta: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.orange,
    borderRadius: 9,
    marginTop: 20,
    minWidth: 132,
    paddingHorizontal: 19,
    paddingVertical: 12,
  },
  newsletterEmailCtaText: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
  },
  newsletterEmailFooter: {
    alignItems: 'center',
    backgroundColor: '#F2ECF9',
    paddingHorizontal: 23,
    paddingVertical: 23,
  },
  newsletterEmailFooterImage: { minHeight: 96, width: '100%' },
  newsletterEmailFooterBackground: { resizeMode: 'cover' },
  newsletterEmailFooterOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    flex: 1,
    justifyContent: 'center',
    minHeight: 96,
    paddingHorizontal: 23,
    paddingVertical: 23,
  },
  newsletterEmailFooterTextOnImage: { color: '#fff' },
  newsletterEmailFooterText: {
    color: '#38294D',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
  },
  newsletterEmailFooterMeta: {
    color: '#82758E',
    fontSize: 7,
    lineHeight: 11,
    marginTop: 9,
    textAlign: 'center',
  },
  newsletterReaderCover: { borderRadius: 22, height: 190, marginBottom: 22, width: '100%' },
  newsletterMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: -13,
  },
  newsletterMeta: { color: '#78817F', fontFamily: 'Poppins_600SemiBold', fontSize: 8 },
  newsletterTitle: {
    color: '#090909',
    fontFamily: 'Poppins_700Bold',
    fontSize: 27,
    lineHeight: 29,
    marginBottom: 24,
    textAlign: 'center',
  },
  principalCard: {
    alignItems: 'flex-end',
    backgroundColor: '#E9E9E9',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 12,
    minHeight: 132,
    padding: 17,
  },
  newsletterBody: { color: '#222', fontSize: 7, lineHeight: 9.5, marginTop: 10 },
  newsletterRegards: {
    color: '#111',
    fontFamily: 'Poppins_700Bold',
    fontSize: 7,
    marginTop: 10,
  },
  newsletterPrincipal: { color: '#222', fontSize: 7 },
  principalPhotoRing: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#E6C18D',
    borderRadius: 34,
    borderWidth: 2,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  principalPhoto: { borderRadius: 29, height: 58, width: 58 },
  newsSectionTitle: {
    color: '#63351F',
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    marginBottom: 10,
    marginTop: 27,
  },
  newsTile: {
    backgroundColor: '#E8E8E8',
    borderRadius: 18,
    flex: 1,
    minHeight: 144,
    padding: 14,
  },
  newsTileTitle: { color: '#111', fontFamily: 'Poppins_700Bold', fontSize: 10, lineHeight: 13 },
  newsTileBody: { color: '#222', fontSize: 6.5, lineHeight: 9.5, marginTop: 10 },
  playgroundEmoji: { fontSize: 47, marginTop: 'auto', textAlign: 'right' },
  newsletterColumns: { flexDirection: 'row', gap: 14, marginTop: 26 },
  newsletterColumn: { flex: 1 },
  newsColumnTitle: {
    color: '#111',
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    marginBottom: 10,
  },
  newsEventRow: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  newsEventDot: { color: colors.orange, fontSize: 9 },
  newsEventTitle: { color: '#111', fontFamily: 'Poppins_600SemiBold', fontSize: 7.5 },
  newsEventDate: { color: '#333', fontSize: 6.5, marginTop: 2 },
  learnerCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 18,
    minHeight: 154,
    padding: 14,
  },
  learnerStar: { position: 'absolute', right: 12, top: 12 },
  learnerLine: {
    color: '#111',
    fontFamily: 'Poppins_700Bold',
    fontSize: 7,
    marginTop: 12,
  },
  learnerCopy: { color: '#333', fontSize: 5.5, lineHeight: 8, marginLeft: 25 },
  newsletterFooter: {
    alignItems: 'center',
    backgroundColor: '#9869DE',
    marginHorizontal: -18,
    marginTop: 12,
    paddingHorizontal: 68,
    paddingVertical: 34,
  },
  signature: {
    color: colors.orange,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 8,
  },
  twoColumns: { flexDirection: 'row', gap: 10 },
  halfCard: { flex: 1, gap: 8, minHeight: 100 },
  event: { color: colors.text, fontSize: 11, lineHeight: 24 },
  notificationsScreen: { paddingHorizontal: 14 },
  notificationsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 28,
    paddingHorizontal: 5,
  },
  notificationsTitle: {
    color: '#090909',
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    textAlign: 'center',
  },
  notificationHeaderButton: { alignItems: 'center', justifyContent: 'center', width: 34 },
  notificationCard: {
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 13,
    minHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  notificationIcon: {
    alignItems: 'center',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  notificationCardTitle: {
    color: '#111',
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  notificationBody: { color: '#344052', fontSize: 9.5, lineHeight: 14 },
  notificationTime: { alignSelf: 'flex-start', color: '#566176', fontSize: 8, marginTop: 2 },
  timeLabel: { color: colors.muted, fontSize: 8, fontWeight: '700' },
  metric: { fontSize: 28, fontWeight: '900' },
  subjectRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  barTrack: {
    backgroundColor: colors.line,
    borderRadius: 4,
    flex: 1,
    height: 7,
  },
  barFill: { borderRadius: 4, height: 7 },
  score: { color: colors.muted, fontSize: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    backgroundColor: '#FFF4E5',
    borderRadius: radius.pill,
    color: colors.ink,
    fontSize: 10,
    overflow: 'hidden',
    padding: 8,
  },
  storeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  promo: { backgroundColor: colors.green, marginBottom: 10 },
  promoText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productCard: { width: '48%' },
  productArt: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    width: '100%',
  },
  productImage: { height: '100%', width: '100%' },
  productColorOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  productColorOption: {
    borderColor: colors.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  productColorOptionSelected: { backgroundColor: colors.green, borderColor: colors.green },
  productColorText: { color: colors.text, fontSize: 8 },
  productColorTextSelected: { color: '#FFF', fontFamily: 'Poppins_600SemiBold' },
  cartImage: { height: 38, width: 38 },
  price: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: 4 },
  quantity: { color: colors.orange, fontSize: 12, fontWeight: '900' },
  quantityControls: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  orderCard: { marginBottom: 10, padding: 14 },
  orderHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  orderIcon: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  orderTotal: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 12 },
  orderItems: { borderTopColor: colors.line, borderTopWidth: 1, marginTop: 12, paddingTop: 8 },
  orderItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  orderItemImage: { borderRadius: 8, height: 44, width: 44 },
  orderItemName: { color: colors.text, flex: 1, fontSize: 11 },
  orderCollection: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 8 },
  cartCount: {
    backgroundColor: colors.orange,
    borderRadius: 8,
    color: '#fff',
    fontSize: 8,
    marginLeft: -5,
    marginTop: -10,
    minWidth: 16,
    overflow: 'hidden',
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  brandMarks: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 35,
  },
  plus: {
    color: colors.muted,
    fontSize: 28,
    fontWeight: '300',
    marginHorizontal: 18,
  },
  statusDot: { borderRadius: 7, height: 14, width: 14 },
  shopBottomNav: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: -36,
    marginHorizontal: -18,
    marginTop: 22,
    paddingBottom: 16,
    paddingTop: 12,
  },
  shopBottomItem: { alignItems: 'center', minWidth: 58 },
  shopBottomLabel: { color: colors.muted, fontSize: 8, marginTop: 3 },
});
