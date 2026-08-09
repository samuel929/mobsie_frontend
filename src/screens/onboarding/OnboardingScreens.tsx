import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Branch, useApplication } from '../../application/ApplicationContext';
import { useAuth } from '../../auth/AuthContext';
import { Button, Card, Field, Header, Progress, Screen } from '../../components/ui';
import { images } from '../../assets';
import { colors, radius } from '../../theme';
import { ApiError, apiData } from '../../services/api/client';
import {
  availableSchoolTypes,
  formatZar,
  packagePrice,
  SCHOOL_PACKAGES,
  SCHOOL_STAGES,
  SchoolStage,
  SchoolType,
  STAGE_LABELS,
  bankingForBranch,
  stageDisplay,
} from '../../data/schoolPackages';

export function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const audiences = [
    ['Children', 'person-outline', colors.green],
    ['Parents', 'people-outline', colors.orange],
    ['Teachers', 'school-outline', colors.purple],
    ['Schools', 'business-outline', colors.blue],
  ] as const;

  return (
    <Screen style={styles.welcome}>
      <Image source={images.logo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.hero}>A Gateway{`\n`}to the Future</Text>
      <Text style={styles.lead}>
        Connecting children, parents, teachers,{`\n`}and schools for a better learning journey
      </Text>
      <Image source={images.heroKids} style={styles.heroKids} resizeMode="stretch" />
      <Button 
       style={{width: '100%'}}
      title="Enroll Now" onPress={() => navigation.navigate('SignUp')} />
      <Button
        title="Log In"
        color={colors.green}
        outline
          style={{width: '100%'}}
        onPress={() => navigation.navigate('Login')}
      />
      <Button
        title="Learn More"
          style={{width: '100%'}}
        color={colors.purple}
        onPress={() => navigation.navigate('AboutPublic')}
      />
      <View style={styles.audienceRow}>
        {audiences.map(([label, icon, color]) => (
          <View key={label} style={styles.audience}>
            <View style={[styles.audienceIcon, { backgroundColor: `${color}18` }]}>
              <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={styles.audienceLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    try {
      setError('');
      if (!email.trim() || !password) throw new Error('Enter your email address and password.');
      setSubmitting(true);
      await login(email, password);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Header title="Parent Login" onBell={false} />
      <Image source={images.logo} style={styles.formLogo} resizeMode="contain" />
      <Card>
        <Text style={styles.formTitle}>Welcome Back</Text>
        <Text style={styles.muted}>Sign in to view your child’s school journey.</Text>
        <Field
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        {submitting ? (
          <View style={styles.authLoading}>
            <ActivityIndicator size="large" color={colors.orange} />
            <Text style={styles.authLoadingText}>Logging you in…</Text>
          </View>
        ) : (
          <Button title="Log In" onPress={submit} />
        )}
        <Pressable onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.link}>New parent? Create an account</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

export function SignUpScreen() {
  const navigation = useNavigation<any>();
  const { signup } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (submitting) return;
    try {
      setError('');
      setFieldErrors({});
      if (!accepted) throw new Error('Accept the privacy policy and terms to continue.');
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = phone.trim().replace(/[\s()-]/g, '');
      const validationErrors: Record<string, string> = {};
      if (name.trim().length < 2) validationErrors.name = 'Enter at least 2 characters.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        validationErrors.email = 'Enter a valid email address.';
      }
      if (normalizedPhone.length < 8 || normalizedPhone.length > 24) {
        validationErrors.phone = 'Enter a valid mobile number.';
      }
      if (password.length < 8) validationErrors.password = 'Use at least 8 characters.';
      if (password.length > 128) validationErrors.password = 'Use no more than 128 characters.';
      if (Object.keys(validationErrors).length) {
        setFieldErrors(validationErrors);
        throw new Error('Please correct the highlighted fields.');
      }
      setSubmitting(true);
      await signup(name, normalizedEmail, normalizedPhone, password);
      navigation.navigate('ApplicationOne');
    } catch (reason) {
      if (reason instanceof ApiError && Object.keys(reason.fieldErrors).length) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(reason.fieldErrors).map(([field, messages]) => [field, messages[0]]),
          ),
        );
      }
      setError((reason as Error).message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Screen>
      <Header title="Create Account" onBell={false} />
      <Image source={images.logo} style={styles.formLogo} resizeMode="contain" />
      <Card>
        <Text style={styles.formTitle}>Parent Sign Up</Text>
        <Field
          label="Full Name"
          placeholder="Samantha Molefe"
          value={name}
          onChangeText={setName}
          error={fieldErrors.name}
          autoComplete="name"
          textContentType="name"
        />
        <Field
          label="Email Address"
          placeholder="parent@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          error={fieldErrors.email}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Mobile Number"
          placeholder="082 000 0000"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          error={fieldErrors.phone}
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <Field
          label="Password"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={fieldErrors.password}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Pressable style={styles.checkRow} onPress={() => setAccepted((value) => !value)}>
          <Ionicons
            name={accepted ? 'checkbox' : 'square-outline'}
            size={20}
            color={colors.green}
          />
          <Text style={styles.muted}>I accept the privacy policy and terms.</Text>
        </Pressable>
        <View style={styles.policyLinks}>
          <Pressable onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.inlineLink}>View Privacy Policy</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TermsPolicy')}>
            <Text style={styles.inlineLink}>View Terms & Conditions</Text>
          </Pressable>
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {submitting ? (
          <View style={styles.authLoading}>
            <ActivityIndicator size="large" color={colors.orange} />
            <Text style={styles.authLoadingText}>Creating your account…</Text>
          </View>
        ) : (
          <Button title="Create Account & Apply" onPress={submit} />
        )}
      </Card>
    </Screen>
  );
}

export function PublicAboutScreen() {
  return (
    <Screen>
      <Header title="Who We Are" onBell={false} />
      <Text style={styles.publicQuote}>“We’re more than a network of private preschools.”</Text>
      <Text style={styles.muted}>
        We’re a foundation for future leaders, dreamers, and changemakers.
      </Text>
      <Card style={{ marginTop: 18, borderLeftWidth: 5, borderLeftColor: colors.green }}>
        <Text style={styles.sectionTitle}>Our Story</Text>
        <Text style={styles.muted}>
          Mobsie Connect creates safe, affordable and accessible learning spaces in communities
          where opportunity is needed most.
        </Text>
      </Card>
      <Card style={{ marginTop: 12, borderLeftWidth: 5, borderLeftColor: colors.orange }}>
        <Text style={styles.sectionTitle}>Our Vision</Text>
        <Text style={styles.muted}>
          To expand our preschool network across South Africa and build a trusted national
          footprint.
        </Text>
      </Card>
    </Screen>
  );
}

export function ApplicationOneScreen() {
  const navigation = useNavigation<any>();
  const { stepOne, setStepOne, saveStepOne } = useApplication();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const change = (field: string, value: string) => {
    setStepOne({ [field]: value });
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const continueNext = async () => {
    try {
      const nextErrors: Record<string, string> = {};
      if (!stepOne.parentName.trim()) nextErrors.parentName = 'Full name is required.';
      if (!stepOne.parentEmail.trim()) nextErrors.parentEmail = 'Email address is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stepOne.parentEmail.trim()))
        nextErrors.parentEmail = 'Enter a valid email address.';
      if (!stepOne.parentPhone.trim()) nextErrors.parentPhone = 'Phone number is required.';
      else if (stepOne.parentPhone.replace(/\D/g, '').length < 9)
        nextErrors.parentPhone = 'Enter a valid phone number.';
      if (!stepOne.childName.trim()) nextErrors.childName = 'Child’s full name is required.';
      if (!stepOne.childDateOfBirth.trim())
        nextErrors.childDateOfBirth = 'Date of birth is required.';
      else if (
        !/^\d{4}-\d{2}-\d{2}$/.test(stepOne.childDateOfBirth) ||
        Number.isNaN(Date.parse(stepOne.childDateOfBirth))
      )
        nextErrors.childDateOfBirth = 'Use a valid date in YYYY-MM-DD format.';
      else if (new Date(stepOne.childDateOfBirth) >= new Date())
        nextErrors.childDateOfBirth = 'Date of birth must be in the past.';
      if (!stepOne.currentGrade.trim()) nextErrors.currentGrade = 'Grade or level is required.';
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) throw new Error('Please correct the highlighted fields.');
      setSaving(true);
      await saveStepOne();
      navigation.navigate('ApplicationTwo');
    } catch (reason) {
      Alert.alert('Check your information', (reason as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen>
      <Image source={images.logo} style={styles.applicationLogo} resizeMode="contain" />
      <Progress step={1} />
      <Text style={styles.stepLabel}>Step 1 of 3: Child & Parent Info</Text>
      <Text style={styles.formTitle}>Parent Application Form</Text>
      <FormSection icon="person-outline" title="Parent/Guardian Details" color={colors.orange}>
        <Field
          label="Full Name"
          placeholder="Samantha Molefe"
          value={stepOne.parentName}
          onChangeText={(value) => change('parentName', value)}
          error={errors.parentName}
        />
        <Field
          label="Email Address"
          placeholder="parent@email.com"
          value={stepOne.parentEmail}
          onChangeText={(value) => change('parentEmail', value)}
          keyboardType="email-address"
          error={errors.parentEmail}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="Phone Number"
              placeholder="082 000 0000"
              value={stepOne.parentPhone}
              onChangeText={(value) => change('parentPhone', value)}
              keyboardType="phone-pad"
              error={errors.parentPhone}
            />
          </View>
          <View style={styles.flex}>
            <ChoiceRow
              values={['Mother', 'Father', 'Guardian', 'Other']}
              value={stepOne.relationship}
              onChange={(relationship) =>
                setStepOne({ relationship: relationship as typeof stepOne.relationship })
              }
            />
          </View>
        </View>
      </FormSection>
      <FormSection icon="happy-outline" title="Child Details" color={colors.purple}>
        <Field
          label="Child’s Full Name"
          placeholder="Prince Tau"
          value={stepOne.childName}
          onChangeText={(value) => change('childName', value)}
          error={errors.childName}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="Date of Birth"
              placeholder="2022-05-27"
              value={stepOne.childDateOfBirth}
              onChangeText={(value) => change('childDateOfBirth', value)}
              error={errors.childDateOfBirth}
            />
          </View>
          <View style={styles.flex}>
            <ChoiceRow
              values={['BOY', 'GIRL', 'OTHER']}
              value={stepOne.childGender}
              onChange={(childGender) =>
                setStepOne({ childGender: childGender as typeof stepOne.childGender })
              }
            />
          </View>
        </View>
        <DropdownField
          label="Current Grade / Stage"
          value={stepOne.currentGrade}
          options={SCHOOL_STAGES.map((stage) => ({ label: stageDisplay(stage), value: stageDisplay(stage) }))}
          onChange={(currentGrade) => change('currentGrade', currentGrade)}
          error={errors.currentGrade}
        />
      </FormSection>
      {saving ? (
        <ActivityIndicator color={colors.green} />
      ) : (
        <Button title="Continue to Step 2" onPress={continueNext} />
      )}
      <Text style={styles.link}>Save as Draft</Text>
    </Screen>
  );
}

export function ApplicationTwoScreen() {
  const navigation = useNavigation<any>();
  const { stepTwo, setStepTwo, loadBranches, saveStepTwo } = useApplication();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selectedBranch = branches.find((branch) => branch.id === stepTwo.branchId);
  const schoolTypes = availableSchoolTypes(selectedBranch?.name ?? '');
  const selectedPackage = SCHOOL_PACKAGES[stepTwo.schoolType];
  const change = (field: string, value: string | boolean) => {
    setStepTwo({ [field]: value });
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const selectBranch = (branch: Branch) => {
    const types = availableSchoolTypes(branch.name);
    const schoolType = types.includes(stepTwo.schoolType) ? stepTwo.schoolType : types[0];
    setStepTwo({ branchId: branch.id, schoolType });
    setErrors((current) => ({ ...current, branchId: '', schoolType: '' }));
  };

  useEffect(() => {
    loadBranches()
      .then((items) => {
        setBranches(items);
        const branch = items.find((item) => item.id === stepTwo.branchId) ?? items[0];
        if (branch) {
          const types = availableSchoolTypes(branch.name);
          setStepTwo({
            branchId: branch.id,
            schoolType: types.includes(stepTwo.schoolType) ? stepTwo.schoolType : types[0],
          });
        }
      })
      .catch((error) => Alert.alert('Branches unavailable', error.message))
      .finally(() => setLoading(false));
  }, []);
  const continueNext = async () => {
    try {
      const nextErrors: Record<string, string> = {};
      if (!stepTwo.branchId) nextErrors.branchId = 'Select a preferred branch.';
      if (!stepTwo.schoolType) nextErrors.schoolType = 'Select a type of school.';
      if (!stepTwo.schoolStage) nextErrors.schoolStage = 'Select a stage.';
      if (
        selectedBranch &&
        !availableSchoolTypes(selectedBranch.name).includes(stepTwo.schoolType)
      ) {
        nextErrors.schoolType = `${SCHOOL_PACKAGES[stepTwo.schoolType].label} is not available at this branch.`;
      }
      if (!stepTwo.preferredStartDate.trim())
        nextErrors.preferredStartDate = 'Preferred start date is required.';
      else if (
        !/^\d{4}-\d{2}-\d{2}$/.test(stepTwo.preferredStartDate) ||
        Number.isNaN(Date.parse(stepTwo.preferredStartDate))
      )
        nextErrors.preferredStartDate = 'Use a valid date in YYYY-MM-DD format.';
      if (!stepTwo.previousSchool.trim())
        nextErrors.previousSchool = 'Previous school name is required.';
      if (!stepTwo.previousSchoolPhone.trim())
        nextErrors.previousSchoolPhone = 'Previous school number is required.';
      else if (stepTwo.previousSchoolPhone.replace(/\D/g, '').length < 9)
        nextErrors.previousSchoolPhone = 'Enter a valid school number.';
      if (!stepTwo.referralSource) nextErrors.referralSource = 'Select where you heard about us.';
      if (!stepTwo.emergencyContactName.trim())
        nextErrors.emergencyContactName = 'Emergency contact name is required.';
      if (!stepTwo.emergencyContactPhone.trim())
        nextErrors.emergencyContactPhone = 'Emergency contact phone is required.';
      else if (stepTwo.emergencyContactPhone.replace(/\D/g, '').length < 9)
        nextErrors.emergencyContactPhone = 'Enter a valid emergency phone number.';
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) throw new Error('Please correct the highlighted fields.');
      setLoading(true);
      await saveStepTwo();
      navigation.navigate('ApplicationReview');
    } catch (reason) {
      Alert.alert('Check your preferences', (reason as Error).message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen>
      <Progress step={2} />
      <Text style={styles.stepLabel}>Step 2 of 3: School Preferences</Text>
      <Text style={styles.formTitle}>School Preferences</Text>
      <FormSection icon="business-outline" title="Preferred Branch" color={colors.green}>
        <View style={styles.branchRow}>
          {branches.map((branch) => (
            <Pressable
              key={branch.id}
              onPress={() => selectBranch(branch)}
              style={[styles.branchChoice, stepTwo.branchId === branch.id && styles.selected]}
            >
              <Ionicons
                name={stepTwo.branchId === branch.id ? 'radio-button-on' : 'radio-button-off'}
                size={17}
                color={stepTwo.branchId === branch.id ? colors.purple : colors.muted}
                style={styles.branchRadio}
              />
              <Image
                source={branch.imageUrl ? { uri: branch.imageUrl } : images.branches.soshanguve}
                style={styles.branchImage}
                resizeMode="cover"
              />
              <Text style={styles.branchName}>{branch.name}</Text>
              <Text style={styles.branchCity}>({branch.city || branch.region})</Text>
            </Pressable>
          ))}
        </View>
        {!!errors.branchId && <Text style={styles.error}>{errors.branchId}</Text>}
        <Field
          label="Why this branch? (optional)"
          multiline
          value={stepTwo.reason}
          onChangeText={(reason) => setStepTwo({ reason })}
        />
        <DropdownField
          label="Type of School"
          value={stepTwo.schoolType}
          options={schoolTypes.map((schoolType) => ({
            label: SCHOOL_PACKAGES[schoolType].label,
            value: schoolType,
          }))}
          onChange={(value) => change('schoolType', value as SchoolType)}
          error={errors.schoolType}
        />
        <DropdownField
          label="Stage"
          value={stepTwo.schoolStage}
          options={SCHOOL_STAGES.map((stage) => ({
            label: `${stageDisplay(stage)} · ${formatZar(selectedPackage.stageFeesCents[stage])} per month`,
            value: stage,
          }))}
          onChange={(value) => change('schoolStage', value as SchoolStage)}
          error={errors.schoolStage}
        />
        <PackageDetails schoolType={stepTwo.schoolType} stage={stepTwo.schoolStage} />
      </FormSection>
      <FormSection icon="calendar-outline" title="Enrollment Details" color={colors.orange}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="Preferred Start Date"
              placeholder="2026-08-01"
              value={stepTwo.preferredStartDate}
              onChangeText={(value) => change('preferredStartDate', value)}
              error={errors.preferredStartDate}
            />
          </View>
          <View style={styles.flex}>
            <ChoiceRow
              values={['FULL_TIME', 'PART_TIME']}
              value={stepTwo.enrollmentType}
              onChange={(enrollmentType) =>
                setStepTwo({ enrollmentType: enrollmentType as typeof stepTwo.enrollmentType })
              }
            />
          </View>
        </View>
        <Field
          label="Previous School Name"
          value={stepTwo.previousSchool}
          onChangeText={(value) => change('previousSchool', value)}
          error={errors.previousSchool}
        />
        <Field
          label="Previous School Number"
          keyboardType="phone-pad"
          value={stepTwo.previousSchoolPhone}
          onChangeText={(value) => change('previousSchoolPhone', value)}
          error={errors.previousSchoolPhone}
        />
        <Text style={styles.fieldCaption}>Where did you hear about us?</Text>
        <View style={styles.selectBox}>
          <Ionicons name="megaphone-outline" size={18} color={colors.green} />
          <ChoiceRow
            values={['SOCIAL_MEDIA', 'WORD_OF_MOUTH', 'RADIO']}
            value={stepTwo.referralSource}
            onChange={(referralSource) => change('referralSource', referralSource)}
          />
        </View>
        {!!errors.referralSource && <Text style={styles.error}>{errors.referralSource}</Text>}
        <Text style={styles.muted}>Has your child attended preschool before?</Text>
        <ChoiceRow
          values={['Yes', 'No']}
          value={stepTwo.attendedPreschool ? 'Yes' : 'No'}
          onChange={(value) => setStepTwo({ attendedPreschool: value === 'Yes' })}
        />
      </FormSection>
      <FormSection
        icon="medical-outline"
        title="Medical & Emergency Information"
        color={colors.danger}
      >
        <Field
          label="Any allergies or medical conditions?"
          multiline
          value={stepTwo.allergies}
          onChangeText={(allergies) => setStepTwo({ allergies })}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="Emergency Contact Name"
              value={stepTwo.emergencyContactName}
              onChangeText={(value) => change('emergencyContactName', value)}
              error={errors.emergencyContactName}
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Emergency Contact Phone"
              keyboardType="phone-pad"
              value={stepTwo.emergencyContactPhone}
              onChangeText={(value) => change('emergencyContactPhone', value)}
              error={errors.emergencyContactPhone}
            />
          </View>
        </View>
      </FormSection>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            title="Back to Step 1"
            color={colors.green}
            outline
            onPress={() => navigation.goBack()}
          />
        </View>
        <View style={styles.flex}>
          <Button title="Continue to Step 3" onPress={continueNext} />
        </View>
      </View>
    </Screen>
  );
}

export function ApplicationReviewScreen() {
  const navigation = useNavigation<any>();
  const { stepOne, stepTwo, documents, uploadDocument, submit, loadBranches } = useApplication();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [consents, setConsents] = useState({
    informationAccurate: false,
    privacyAccepted: false,
    termsAccepted: false,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  useEffect(() => {
    loadBranches().then(setBranches).catch(() => setBranches([]));
  }, [loadBranches]);
  const selectedBranch = branches.find((branch) => branch.id === stepTwo.branchId);
  const requiredDocuments = [
    ['LEARNER_PHOTO', 'Recent full-length learner photo'],
    ['BIRTH_CERTIFICATE', 'Child’s Birth Certificate'],
    ['IMMUNIZATION_RECORD', 'Immunisation Records'],
    ['PARENT_ID', 'Parent/guardian ID or passport'],
    ['PARENT_ID_SECONDARY', 'Second parent/guardian ID'],
    ['CLINIC_CARD', 'Child’s full clinic card'],
    ['PROOF_OF_ADDRESS', 'Proof of Address'],
    ['PROOF_OF_INCOME', 'Proof of income/employment'],
    ['PREVIOUS_REPORT', 'Previous School Report'],
  ] as const;
  const upload = async (kind: (typeof requiredDocuments)[number][0]) => {
    try {
      setBusy(kind);
      await uploadDocument(kind);
    } catch (reason) {
      Alert.alert('Upload failed', (reason as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const finish = async () => {
    try {
      setAttemptedSubmit(true);
      if (!stepOne.parentName.trim() || !stepOne.childName.trim()) {
        throw new Error('Parent and child information is incomplete. Select Edit to correct it.');
      }
      if (
        !stepTwo.branchId ||
        !stepTwo.schoolType ||
        !stepTwo.schoolStage ||
        !stepTwo.preferredStartDate ||
        !stepTwo.previousSchool ||
        !stepTwo.previousSchoolPhone
      ) {
        throw new Error('School preference information is incomplete. Select Edit to correct it.');
      }
      if (Object.keys(documents).length < requiredDocuments.length) {
        throw new Error('Upload all required registration documents before submitting.');
      }
      if (!Object.values(consents).every(Boolean)) {
        throw new Error('Accept all three consent statements before submitting.');
      }
      setBusy('submit');
      await submit();
      navigation.navigate('ApplicationSuccess');
    } catch (reason) {
      Alert.alert('Cannot submit', (reason as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Screen>
      <Progress step={3} />
      <Text style={styles.stepLabel}>Step 3 of 3: Review & Submit</Text>
      <Text style={styles.formTitle}>Review & Submit</Text>
      <ReviewSection title="SECTION 1 — APPLICATION SUMMARY" icon="list">
        <SummaryRow
          label="Child & Parent Info"
          value={`${stepOne.childName} · ${stepOne.parentName} (${stepOne.relationship})`}
          onEdit={() => navigation.navigate('ApplicationOne')}
        />
        <SummaryRow
          label="School Preferences"
          value={`${SCHOOL_PACKAGES[stepTwo.schoolType].label} · ${STAGE_LABELS[stepTwo.schoolStage]} · ${stepTwo.enrollmentType.replace('_', ' ')} · ${stepTwo.preferredStartDate}`}
          onEdit={() => navigation.navigate('ApplicationTwo')}
        />
        <SummaryRow
          label="Medical & Emergency"
          value={`${stepTwo.allergies || 'No allergies'} · ${stepTwo.emergencyContactName}`}
          onEdit={() => navigation.navigate('ApplicationTwo')}
        />
      </ReviewSection>
      <ReviewSection title="SECTION 2 — REQUIRED DOCUMENTS" icon="document-text">
        {requiredDocuments.map(([kind, label]) => (
          <View key={kind} style={styles.documentRow}>
            <View style={styles.flex}>
              <Text style={styles.documentLabel}>{label}</Text>
              {!!documents[kind] && <Text style={styles.muted}>{documents[kind]}</Text>}
              {attemptedSubmit && !documents[kind] && (
                <Text style={styles.error}>Required document</Text>
              )}
            </View>
            <Button
              title={busy === kind ? 'Uploading…' : documents[kind] ? 'Replace' : 'Upload'}
              color={colors.green}
              outline
              onPress={() => upload(kind)}
            />
          </View>
        ))}
      </ReviewSection>
      <ReviewSection title="SECTION 3 — TERMS & CONSENT" icon="checkbox">
        <ConsentRow
          checked={consents.informationAccurate}
          label="I confirm all information provided is accurate."
          onPress={() =>
            setConsents((value) => ({ ...value, informationAccurate: !value.informationAccurate }))
          }
        />
        <ConsentRow
          checked={consents.privacyAccepted}
          label="I consent to the school’s privacy policy and data handling."
          onPress={() =>
            setConsents((value) => ({ ...value, privacyAccepted: !value.privacyAccepted }))
          }
        />
        <ConsentRow
          checked={consents.termsAccepted}
          label="I agree to the terms and conditions."
          onPress={() =>
            setConsents((value) => ({ ...value, termsAccepted: !value.termsAccepted }))
          }
        />
        <View style={styles.policyLinks}>
          <Pressable onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.inlineLink}>View Privacy Policy</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TermsPolicy')}>
            <Text style={styles.inlineLink}>View Terms & Conditions</Text>
          </Pressable>
        </View>
        {attemptedSubmit && !Object.values(consents).every(Boolean) && (
          <Text style={styles.error}>All three consent statements are required.</Text>
        )}
      </ReviewSection>
      <ReviewSection title="SECTION 4 — PAYMENT" icon="card">
        <PaymentSummary
          schoolType={stepTwo.schoolType}
          stage={stepTwo.schoolStage}
          branchName={selectedBranch?.name}
        />
        <Button
          title={`Pay ${formatZar(packagePrice(stepTwo.schoolType, stepTwo.schoolStage).applicationFeeCents)}`}
          color={colors.green2}
        />
      </ReviewSection>
      {busy === 'submit' ? (
        <ActivityIndicator color={colors.green} />
      ) : (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              title="Back to Step 2"
              color={colors.green}
              outline
              onPress={() => navigation.navigate('ApplicationTwo')}
            />
          </View>
          <View style={styles.flex}>
            <Button title="Submit Application" onPress={finish} />
          </View>
        </View>
      )}
      <Text style={styles.reviewDraft}>Save as Draft</Text>
    </Screen>
  );
}

export function ApplicationSuccessScreen() {
  const navigation = useNavigation<any>();
  const { stepOne, stepTwo, reference } = useApplication();
  return (
    <Screen style={styles.success}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={54} color="#fff" />
      </View>
      <Text style={styles.successTitle}>Application Submitted!</Text>
      <Text style={styles.lead}>Thank you for applying to Mobsie Connect</Text>
      <Card style={styles.confirmation}>
        <Text style={styles.whiteHeading}>Confirmation Details</Text>
        <SummaryLine label="Application Reference" value={reference ?? 'Pending'} />
        <SummaryLine label="Child Name" value={stepOne.childName} />
        <SummaryLine label="School Type" value={SCHOOL_PACKAGES[stepTwo.schoolType].label} />
        <SummaryLine label="Stage" value={STAGE_LABELS[stepTwo.schoolStage]} />
        <SummaryLine label="Enrollment" value={stepTwo.enrollmentType.replace('_', ' ')} />
        <SummaryLine label="Start Date" value={stepTwo.preferredStartDate} />
        <SummaryLine
          label="Application Fee"
          value={`${formatZar(packagePrice(stepTwo.schoolType, stepTwo.schoolStage).applicationFeeCents)} · Paid`}
        />
        <SummaryLine label="Application Status" value="Pending review" />
      </Card>
      <Text style={styles.sectionTitle}>Next Step</Text>
      <Text style={styles.muted}>
        Complete enrolment to activate the parent dashboard and confirm Prince’s placement.
      </Text>
      <Button
        title="Continue to Enrolment"
        color={colors.green}
        onPress={() => navigation.navigate('Enrollment')}
      />
    </Screen>
  );
}

export function EnrollmentScreen() {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const { applicationId, reference, stepOne, stepTwo, reset } = useApplication();
  const [pickupPassword, setPickupPassword] = useState('');
  const [primaryCollector, setPrimaryCollector] = useState('');
  const [secondaryCollector, setSecondaryCollector] = useState('');
  const [busy, setBusy] = useState(false);
  const finish = async () => {
    try {
      if (!token || !applicationId) throw new Error('Your application session is incomplete.');
      setBusy(true);
      await apiData('/mobile/enrollment', {
        method: 'POST',
        token,
        body: JSON.stringify({
          applicationId,
          pickupPassword,
          primaryCollector,
          secondaryCollector,
        }),
      });
      await reset();
      navigation.navigate('MainApp');
    } catch (error) {
      Alert.alert('Enrolment failed', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="Complete Enrolment" onBell={false} />
      <Text style={styles.formTitle}>Confirm {stepOne.childName}’s Place</Text>
      <FormSection icon="school-outline" title="Enrolment Confirmation" color={colors.green}>
        <Field label="Application Reference" value={reference ?? ''} />
        <Field label="Selected Branch ID" value={stepTwo.branchId} />
        <Field label="School Type" value={SCHOOL_PACKAGES[stepTwo.schoolType].label} />
        <Field
          label="Stage & Monthly Fee"
          value={`${STAGE_LABELS[stepTwo.schoolStage]} · ${formatZar(packagePrice(stepTwo.schoolType, stepTwo.schoolStage).monthlyFeeCents)}`}
        />
        <Field label="Start Date" value={stepTwo.preferredStartDate} />
        <Field
          label="Emergency Pickup Password"
          placeholder="Create a secure word"
          value={pickupPassword}
          onChangeText={setPickupPassword}
          secureTextEntry
        />
      </FormSection>
      <FormSection icon="people-outline" title="Authorised Collection" color={colors.purple}>
        <Field
          label="Primary Collector"
          placeholder="Samantha Molefe"
          value={primaryCollector}
          onChangeText={setPrimaryCollector}
        />
        <Field
          label="Secondary Collector"
          placeholder="John Tau"
          value={secondaryCollector}
          onChangeText={setSecondaryCollector}
        />
      </FormSection>
      {busy ? (
        <ActivityIndicator color={colors.green} />
      ) : (
        <Button title="Confirm Enrolment & Open Dashboard" onPress={finish} />
      )}
    </Screen>
  );
}

type PolicyResponse = {
  title: string;
  updatedAt: string;
  sections: Array<{ heading: string; body: string }>;
};

export function LegalPolicyScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const slug = route.params?.slug === 'privacy' ? 'privacy' : 'terms';
  const [policy, setPolicy] = useState<PolicyResponse | null>(null);
  const [error, setError] = useState('');

  const loadPolicy = () => {
    setError('');
    setPolicy(null);
    apiData<PolicyResponse>(`/policies/${slug}`)
      .then(setPolicy)
      .catch((reason) => setError((reason as Error).message));
  };

  useEffect(loadPolicy, [slug]);

  return (
    <Screen>
      <Header title={slug === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'} onBell={false} />
      <Pressable style={styles.policyBack} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={18} color={colors.green} />
        <Text style={styles.inlineLink}>Back to application</Text>
      </Pressable>
      {!policy && !error && <ActivityIndicator color={colors.green} />}
      {!!error && (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Button title="Try Again" outline color={colors.green} onPress={loadPolicy} />
        </Card>
      )}
      {!!policy && (
        <>
          <Text style={styles.formTitle}>{policy.title}</Text>
          <Text style={styles.policyUpdated}>Updated {policy.updatedAt}</Text>
          {policy.sections.map((section) => (
            <Card key={section.heading} style={styles.policyCard}>
              <Text style={styles.sectionTitle}>{section.heading}</Text>
              <Text style={styles.policyBody}>{section.body}</Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

function FormSection({
  icon,
  title,
  color,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={19} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

function ReviewSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.reviewSection}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={19} color={colors.green} />
        <Text style={styles.reviewTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}
function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name="checkmark-circle" color={colors.green2} />
      <View style={styles.flex}>
        <Text style={styles.bold}>{label}</Text>
        <Text style={styles.muted}>{value}</Text>
      </View>
      <Pressable onPress={onEdit} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.edit}>Edit</Text>
      </Pressable>
    </View>
  );
}
function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.whiteText}>{label}</Text>
      <Text style={styles.whiteBold}>{value}</Text>
    </View>
  );
}

function ChoiceRow({
  values,
  value,
  onChange,
}: {
  values: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.choiceRow}>
      {values.map((item) => (
        <Pressable key={item} style={styles.choice} onPress={() => onChange(item)}>
          <Ionicons
            name={value === item ? 'radio-button-on' : 'radio-button-off'}
            size={17}
            color={value === item ? colors.purple : colors.muted}
          />
          <Text style={styles.choiceText}>{item.replace('_', ' ')}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function DropdownField({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.dropdownWrap}>
      <Text style={styles.fieldCaption}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'Select'}`}
        onPress={() => setOpen(true)}
        style={[styles.dropdownButton, error && styles.dropdownError]}
      >
        <Text style={[styles.dropdownValue, !selected && styles.dropdownPlaceholder]}>
          {selected?.label ?? `Select ${label.toLowerCase()}`}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.green} />
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.dropdownSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.dropdownSheetHeader}>
              <Text style={styles.dropdownTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            {options.map((option) => {
              const checked = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.dropdownOption, checked && styles.dropdownOptionSelected]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Ionicons
                    name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={21}
                    color={checked ? colors.green : colors.muted}
                  />
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      checked && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PackageDetails({ schoolType, stage }: { schoolType: SchoolType; stage: SchoolStage }) {
  const schoolPackage = SCHOOL_PACKAGES[schoolType];
  const price = packagePrice(schoolType, stage);
  return (
    <View style={styles.packageCard}>
      <View style={styles.packageHeader}>
        <View style={styles.packageIcon}>
          <Ionicons name="school-outline" size={20} color={colors.green} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.packageName}>{schoolPackage.packageName}</Text>
          <Text style={styles.packageType}>
            {schoolPackage.label} · {STAGE_LABELS[stage]}
          </Text>
        </View>
      </View>
      <View style={styles.priceGrid}>
        <PriceItem label="Application" value={formatZar(price.applicationFeeCents)} />
        {price.acceptanceFeeCents > 0 && (
          <PriceItem label="Acceptance" value={formatZar(price.acceptanceFeeCents)} />
        )}
        <PriceItem label="Monthly fee" value={formatZar(price.monthlyFeeCents)} />
      </View>
      <Text style={styles.offerTitle}>What this school offers</Text>
      {schoolPackage.offerings.map((offering) => (
        <View key={offering.text} style={styles.offerRow}>
          <Ionicons
            name={offering.included ? 'checkmark-circle' : 'close-circle-outline'}
            size={16}
            color={offering.included ? colors.green2 : colors.orange}
          />
          <Text style={styles.offerText}>{offering.text}</Text>
        </View>
      ))}
    </View>
  );
}

function PriceItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.priceItem}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value}</Text>
    </View>
  );
}

function PaymentSummary({ schoolType, stage, branchName }: {
  schoolType: SchoolType;
  stage: SchoolStage;
  branchName?: string;
}) {
  const schoolPackage = SCHOOL_PACKAGES[schoolType];
  const price = packagePrice(schoolType, stage);
  const banking = bankingForBranch(branchName);
  return (
    <View style={styles.paymentSummary}>
      <View style={styles.paymentHeading}>
        <Ionicons name="school" size={20} color={colors.green} />
        <View style={styles.flex}>
          <Text style={styles.bold}>{schoolPackage.label}</Text>
          <Text style={styles.muted}>
            {STAGE_LABELS[stage]} · {schoolPackage.packageName}
          </Text>
        </View>
      </View>
      <PaymentRow
        label="Non-refundable application fee"
        value={formatZar(price.applicationFeeCents)}
      />
      {price.acceptanceFeeCents > 0 && (
        <PaymentRow
          label="Acceptance fee (after approval)"
          value={formatZar(price.acceptanceFeeCents)}
        />
      )}
      <PaymentRow label="Monthly school fee" value={formatZar(price.monthlyFeeCents)} strong />
      <View style={styles.bankDetails}>
        <Text style={styles.bold}>Pay by bank transfer</Text>
        <Text style={styles.muted}>{banking.accountName} · {banking.bank}</Text>
        <Text style={styles.muted}>
          Account: {banking.accountNumber ?? 'Contact operations for this branch'} · Branch: {banking.branchCode || 'selected branch'}
        </Text>
        <Text style={styles.muted}>{banking.referenceHint}</Text>
      </View>
    </View>
  );
}

function PaymentRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.paymentRow}>
      <Text style={styles.paymentLabel}>{label}</Text>
      <Text style={strong ? styles.paymentValueStrong : styles.paymentValue}>{value}</Text>
    </View>
  );
}

function ConsentRow({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.checkRow} onPress={onPress}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={colors.green} />
      <Text style={[styles.muted, styles.flex]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  welcome: { alignItems: 'center', backgroundColor: '#fff' },
  logo: { height: 120, marginTop: 4, width: 230 },
  hero: {
    color: '#285B6B',
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
  },
  lead: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 17,
    marginVertical: 8,
    textAlign: 'center',
  },
  heroKids: { height: 230, marginTop: 2, width: '112%' },
  audienceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    width: '100%',
  },
  audience: { alignItems: 'center' },
  audienceIcon: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  audienceLabel: { color: '#285B6B', fontSize: 9, marginTop: 5 },
  formLogo: { alignSelf: 'center', height: 120, width: 220 },
  applicationLogo: { height: 92, width: 180 },
  formTitle: {
    color: colors.ink,
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    marginVertical: 18,
    textAlign: 'center',
  },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  error: { color: colors.danger, fontSize: 11 },
  authLoading: { alignItems: 'center', gap: 8, marginVertical: 14 },
  authLoadingText: { color: colors.green, fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  link: {
    color: colors.purple,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    marginVertical: 10,
    textAlign: 'center',
  },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginVertical: 10 },
  policyLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 10 },
  inlineLink: { color: colors.green, fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  policyBack: { alignItems: 'center', flexDirection: 'row', gap: 7, marginBottom: 14 },
  policyUpdated: { color: colors.muted, fontSize: 10, marginBottom: 14, textAlign: 'center' },
  policyCard: { marginBottom: 10 },
  policyBody: { color: colors.text, fontSize: 11, lineHeight: 18, marginTop: 6 },
  fieldCaption: {
    color: colors.ink,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    marginTop: 8,
  },
  selectBox: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginVertical: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dropdownWrap: { marginTop: 4 },
  dropdownButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 7,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  dropdownError: { borderColor: colors.danger },
  dropdownValue: { color: colors.ink, flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 11 },
  dropdownPlaceholder: { color: colors.muted },
  dropdownOverlay: {
    backgroundColor: 'rgba(12, 35, 37, 0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  dropdownSheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dropdownTitle: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 17 },
  dropdownOption: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 10,
  },
  dropdownOptionSelected: { backgroundColor: `${colors.green}10`, borderRadius: radius.md },
  dropdownOptionText: { color: colors.text, flex: 1, fontSize: 12 },
  dropdownOptionTextSelected: { color: colors.green, fontFamily: 'Poppins_600SemiBold' },
  packageCard: {
    backgroundColor: '#F7FBF8',
    borderColor: `${colors.green}35`,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 12,
    padding: 13,
  },
  packageHeader: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  packageIcon: {
    alignItems: 'center',
    backgroundColor: `${colors.green}16`,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  packageName: { color: colors.green, fontFamily: 'Poppins_700Bold', fontSize: 13 },
  packageType: { color: colors.muted, fontSize: 9 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 12 },
  priceItem: {
    backgroundColor: '#fff',
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '30%',
    padding: 9,
  },
  priceLabel: { color: colors.muted, fontSize: 8 },
  priceValue: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 11, marginTop: 2 },
  offerTitle: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 11, marginBottom: 5 },
  offerRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 7, marginVertical: 3 },
  offerText: { color: colors.text, flex: 1, fontSize: 9, lineHeight: 14 },
  paymentSummary: {
    backgroundColor: `${colors.green}0D`,
    borderColor: `${colors.green}30`,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 10,
    padding: 11,
  },
  paymentHeading: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 },
  paymentRow: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  paymentLabel: { color: colors.text, flex: 1, fontSize: 9 },
  paymentValue: { color: colors.ink, fontFamily: 'Poppins_600SemiBold', fontSize: 9 },
  paymentValueStrong: { color: colors.green, fontFamily: 'Poppins_700Bold', fontSize: 10 },
  bankDetails: {
    backgroundColor: '#fff',
    borderColor: `${colors.green}25`,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: 3,
    marginTop: 7,
    padding: 9,
  },
  stepLabel: { color: colors.green, fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginTop: 8 },
  formSection: { marginBottom: 14 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 10 },
  sectionIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  sectionTitle: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 15 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 7 },
  choice: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  choiceText: { color: colors.text, fontSize: 9 },
  flex: { flex: 1 },
  branchRow: { flexDirection: 'row', gap: 8 },
  branchChoice: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
    padding: 5,
  },
  selected: { borderColor: colors.purple, borderWidth: 2 },
  branchImage: { borderRadius: 8, height: 52, width: '100%' },
  branchName: { fontFamily: 'Poppins_600SemiBold', fontSize: 8, marginTop: 4 },
  branchCity: { color: colors.muted, fontSize: 7, textAlign: 'center' },
  branchRadio: { alignSelf: 'flex-start', marginBottom: 3 },
  reviewSection: { marginBottom: 12 },
  reviewTitle: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 11 },
  summaryRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginVertical: 6 },
  bold: { color: colors.ink, fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  edit: {
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.green,
    fontSize: 9,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  documentRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  documentLabel: { color: colors.text, flex: 1, fontSize: 9 },
  reviewDraft: {
    color: colors.green,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    marginTop: 10,
    textAlign: 'center',
  },
  success: { alignItems: 'center', paddingTop: 50 },
  successIcon: {
    alignItems: 'center',
    backgroundColor: colors.green2,
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  successTitle: {
    color: colors.green2,
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    marginTop: 18,
  },
  publicQuote: {
    borderLeftColor: colors.green,
    borderLeftWidth: 4,
    color: colors.ink,
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    lineHeight: 30,
    marginVertical: 20,
    paddingLeft: 12,
  },
  confirmation: { backgroundColor: colors.green, marginVertical: 20, width: '100%' },
  whiteHeading: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 15, marginBottom: 10 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  whiteText: { color: '#fff', fontSize: 10 },
  whiteBold: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
});
