import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Branch, DocumentKind, useApplication } from '../../application/ApplicationContext';
import { useAuth } from '../../auth/AuthContext';
import { Button, Card, Field, Header, Progress, Screen } from '../../components/ui';
import { images } from '../../assets';
import { colors, radius } from '../../theme';
import { ApiError, apiData } from '../../services/api/client';
import {
  AFTERCARE_FEES_2027,
  availableSchoolTypes,
  formatZar,
  hasOfficialAftercareFees,
  hasSoshanguveTransportFees,
  offeringsForBranch,
  packagePrice,
  SCHOOL_PACKAGES,
  SCHOOL_STAGES,
  SOSHANGUVE_TRANSPORT_FEES_2027,
  SchoolStage,
  SchoolType,
  STAGE_LABELS,
  stageOptionLabel,
} from '../../data/schoolPackages';
import { environment } from '../../config/environment';
import {
  formatIsoDateInput,
  idMatchesDateOfBirth,
  isRealIsoDate,
  isValidSouthAfricanId,
  stageForDateOfBirth,
} from '../../utils/applicationValidation';
import { useSchoolData } from '../../data/SchoolContext';
import { displayReference } from '../../utils/reference';

function comparablePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

function useOnboardingCheckpoint(
  route:
    'ApplicationOne' | 'ApplicationTwo' | 'ApplicationReview' | 'ApplicationSuccess' | 'Enrollment',
) {
  const { setOnboardingRoute } = useAuth();
  useFocusEffect(
    useCallback(() => {
      void setOnboardingRoute(route);
    }, [route, setOnboardingRoute]),
  );
}

export function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const socialLinks = [
    ['Instagram', 'instagram', colors.orange, 'https://www.instagram.com/mobsiekids_playschools/'],
    [
      'Facebook',
      'facebook-f',
      colors.blue,
      'https://www.facebook.com/p/Mobsie-Kids-Playschools-100064195741993/',
    ],
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
        title="Enroll Now"
        style={{ width: '100%' }}
        onPress={() => navigation.navigate('SignUp')}
      />
      <Button
        title="Log In"
        color={colors.green}
        outline
        style={{ width: '100%' }}
        onPress={() => navigation.navigate('Login')}
      />
      <Button
        title="Learn More"
        color={colors.purple}
        style={{ width: '100%' }}
        onPress={() => navigation.navigate('AboutPublic')}
      />
      <View style={styles.audienceRow}>
        {socialLinks.map(([label, icon, color, url]) => (
          <Pressable key={label} onPress={() => Linking.openURL(url)}>
            <View style={styles.audience}>
              <View style={[styles.audienceIcon, { backgroundColor: `${color}18` }]}>
                <FontAwesome6 name={icon} size={20} color={color} />
              </View>
              <Text style={styles.audienceLabel}>{label}</Text>
            </View>
          </Pressable>
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
  const [showPassword, setShowPassword] = useState(false);
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
      <Header title="Parent Login" onBell={false} fallbackRoute="Welcome" />
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
          secureTextEntry={!showPassword}
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword((visible) => !visible)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
        />
        <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={[styles.link, { textAlign: 'right' }]}>Forgot password?</Text>
        </Pressable>
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

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    try {
      if (!email.trim()) throw new Error('Enter your account email address.');
      setBusy(true);
      setError('');
      await apiData('/mobile/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ tenantId: environment.tenantId, email: email.trim().toLowerCase() }),
      });
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="Forgot Password" onBell={false} fallbackRoute="Login" />
      <Image source={images.logo} style={styles.formLogo} resizeMode="contain" />
      <Card>
        <Text style={styles.formTitle}>Reset your password</Text>
        <Text style={styles.muted}>
          Enter your parent account email and we’ll send you a 6-digit reset code.
        </Text>
        <Field
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        {busy ? (
          <ActivityIndicator color={colors.orange} />
        ) : (
          <Button title="Send Reset Code" onPress={submit} />
        )}
      </Card>
    </Screen>
  );
}

export function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    try {
      if (!/^\d{6}$/.test(code.trim())) throw new Error('Enter the 6-digit code from your email.');
      if (password.length < 8)
        throw new Error('Your new password must contain at least 8 characters.');
      if (password !== confirmPassword) throw new Error('The passwords do not match.');
      setBusy(true);
      setError('');
      await apiData('/mobile/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: environment.tenantId,
          email: email.trim().toLowerCase(),
          code: code.trim(),
          password,
        }),
      });
      Alert.alert('Password updated', 'You can now sign in with your new password.', [
        {
          text: 'Log In',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
        },
      ]);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="Create New Password" onBell={false} fallbackRoute="ForgotPassword" />
      <Image source={images.logo} style={styles.formLogo} resizeMode="contain" />
      <Card>
        <Text style={styles.formTitle}>Check your email</Text>
        <Text style={styles.muted}>Enter the code we sent and choose a secure new password.</Text>
        <Field
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="6-digit code"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
        />
        <Field
          label="New Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <Field
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        {busy ? (
          <ActivityIndicator color={colors.orange} />
        ) : (
          <Button title="Update Password" onPress={submit} />
        )}
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
  const [showPassword, setShowPassword] = useState(false);
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
          secureTextEntry={!showPassword}
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword((visible) => !visible)}
          error={fieldErrors.password}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <View style={styles.passwordRequirement}>
          <Ionicons
            name={password.length >= 8 ? 'checkmark-circle' : 'information-circle-outline'}
            size={16}
            color={password.length >= 8 ? colors.green : colors.muted}
          />
          <Text
            style={[
              styles.passwordRequirementText,
              password.length >= 8 && { color: colors.green },
            ]}
          >
            Password must be between 8 and 128 characters
            {password.length ? ` · ${password.length}/128` : ''}
          </Text>
        </View>
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
  const values = [
    ['Safe Spaces', 'home-outline', colors.green],
    ['Creativity', 'color-palette-outline', colors.orange],
    ['Partnership', 'people-outline', colors.purple],
    ['Accessibility', 'star-outline', colors.blue],
  ] as const;

  return (
    <Screen style={styles.publicAboutScreen}>
      <Header title="Who We Are" onBell={false} fallbackRoute="Welcome" />
      <Image source={images.logo} style={styles.publicAboutLogo} resizeMode="contain" />

      <View style={styles.publicAboutHero}>
        <Text style={styles.publicQuote}>“We’re more than a network of private preschools.”</Text>
        <Text style={styles.publicAboutIntro}>
          We’re a foundation for future leaders, dreamers, and changemakers.
        </Text>
      </View>

      <Card style={styles.publicStoryCard}>
        <View style={styles.publicCardHeader}>
          <View style={styles.publicCardTitleRow}>
            <View style={[styles.publicAboutIcon, { backgroundColor: `${colors.green}16` }]}>
              <Ionicons name="book-outline" size={20} color={colors.green} />
            </View>
            <Text style={styles.sectionTitle}>Our Story</Text>
          </View>
          <Text style={styles.publicEstablished}>Established 2015</Text>
        </View>

        <View style={styles.publicStats}>
          {[
            ['2,550+', 'Children Helped'],
            ['2,159+', 'Graduates'],
            ['10+', 'Years of Excellence'],
          ].map(([value, label]) => (
            <View key={label} style={styles.publicStat}>
              <Text style={styles.publicStatValue}>{value}</Text>
              <Text style={styles.publicStatLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.publicAboutBody}>
          With a strong property-focused model, we create safe, affordable and accessible learning
          spaces, especially in townships and rural communities where opportunity is needed most.
        </Text>
      </Card>

      <Card style={styles.publicVisionCard}>
        <View style={styles.publicCardTitleRow}>
          <View style={[styles.publicAboutIcon, { backgroundColor: `${colors.orange}16` }]}>
            <Ionicons name="bulb-outline" size={20} color={colors.orange} />
          </View>
          <Text style={styles.sectionTitle}>Our Vision</Text>
        </View>
        <Text style={styles.publicAboutBody}>
          To expand our preschool network across South Africa and build a trusted national footprint
          through franchising.
        </Text>
      </Card>

      <Text style={styles.publicValuesHeading}>Our Values</Text>
      <View style={styles.publicValuesGrid}>
        {values.map(([label, icon, color]) => (
          <Card key={label} style={styles.publicValueCard}>
            <View style={[styles.publicAboutIcon, { backgroundColor: `${color}16` }]}>
              <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.publicValueTitle}>{label}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

export function ApplicationOneScreen() {
  useOnboardingCheckpoint('ApplicationOne');
  const navigation = useNavigation<any>();
  const { stepOne, setStepOne, saveStepOne, isAdditionalChild, finishAdditionalChild } =
    useApplication();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const returnHome = async () => {
    await finishAdditionalChild();
    navigation.navigate('MainApp', { screen: 'Tabs', params: { screen: 'Home' } });
  };
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
      if (!stepOne.relationship) nextErrors.relationship = 'Select your relationship to the child.';
      if (stepOne.additionalGuardianEnabled) {
        if (!stepOne.additionalGuardianName.trim())
          nextErrors.additionalGuardianName = 'Additional guardian name is required.';
        if (!stepOne.additionalGuardianRelationship)
          nextErrors.additionalGuardianRelationship =
            'Select the additional guardian relationship.';
        if (!stepOne.additionalGuardianPhone.trim())
          nextErrors.additionalGuardianPhone = 'Additional guardian phone is required.';
        else if (stepOne.additionalGuardianPhone.replace(/\D/g, '').length < 9)
          nextErrors.additionalGuardianPhone = 'Enter a valid phone number.';
        if (!stepOne.additionalGuardianEmail.trim())
          nextErrors.additionalGuardianEmail = 'Additional guardian email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stepOne.additionalGuardianEmail.trim()))
          nextErrors.additionalGuardianEmail = 'Enter a valid email address.';
      }
      if (!isValidSouthAfricanId(stepOne.childIdNumber))
        nextErrors.childIdNumber = 'Enter a valid 13-digit South African ID number.';
      if (!stepOne.childDateOfBirth.trim())
        nextErrors.childDateOfBirth = 'Date of birth is required.';
      else if (!isRealIsoDate(stepOne.childDateOfBirth))
        nextErrors.childDateOfBirth = 'Use a valid date in YYYY-MM-DD format.';
      else if (new Date(stepOne.childDateOfBirth) >= new Date())
        nextErrors.childDateOfBirth = 'Date of birth must be in the past.';
      else if (!idMatchesDateOfBirth(stepOne.childIdNumber, stepOne.childDateOfBirth))
        nextErrors.childDateOfBirth = 'Date of birth does not match the child’s ID number.';
      else if (!stageForDateOfBirth(stepOne.childDateOfBirth))
        nextErrors.childDateOfBirth = 'The child’s age is outside the supported admission range.';
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
      {isAdditionalChild && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel adding a child and return home"
          onPress={() => void returnHome()}
          style={styles.additionalChildBack}
        >
          <Ionicons name="chevron-back" size={20} color={colors.green} />
          <Text style={styles.additionalChildBackText}>Back to Home</Text>
        </Pressable>
      )}
      <Image source={images.logo} style={styles.applicationLogo} resizeMode="contain" />
      <Progress step={1} />
      <Text style={styles.stepLabel}>Step 1 of 3: Child & Parent Info</Text>
      <Text style={styles.formTitle}>Parent Application Form</Text>
      <FormSection icon="document-text-outline" title="Application Type" color={colors.green}>
        <ChoiceRow
          values={['NEW', 'REREGISTRATION']}
          value={stepOne.applicationType}
          onChange={(applicationType) =>
            setStepOne({ applicationType: applicationType as typeof stepOne.applicationType })
          }
        />
        {stepOne.applicationType === 'REREGISTRATION' && (
          <Text style={styles.muted}>
            Re-registration requires all supporting documents, but no registration fee or proof of
            payment.
          </Text>
        )}
      </FormSection>
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
              values={['Mother', 'Father', 'Guardian']}
              value={stepOne.relationship}
              onChange={(relationship) =>
                setStepOne({ relationship: relationship as typeof stepOne.relationship })
              }
            />
            {!!errors.relationship && <Text style={styles.error}>{errors.relationship}</Text>}
          </View>
        </View>
        <Button
          title={
            stepOne.additionalGuardianEnabled
              ? 'Remove additional guardian'
              : 'Add another guardian (if applicable)'
          }
          icon={stepOne.additionalGuardianEnabled ? 'remove-circle-outline' : 'person-add-outline'}
          color={colors.orange}
          outline
          onPress={() =>
            setStepOne({
              additionalGuardianEnabled: !stepOne.additionalGuardianEnabled,
              ...(!stepOne.additionalGuardianEnabled
                ? {}
                : {
                    additionalGuardianName: '',
                    additionalGuardianRelationship: '',
                    additionalGuardianEmail: '',
                    additionalGuardianPhone: '',
                  }),
            })
          }
        />
        {stepOne.additionalGuardianEnabled && (
          <View style={styles.additionalGuardianPanel}>
            <Text style={styles.subsectionTitle}>Additional Guardian</Text>
            <Field
              label="Full Name"
              placeholder="Second parent or guardian"
              value={stepOne.additionalGuardianName}
              onChangeText={(value) => change('additionalGuardianName', value)}
              error={errors.additionalGuardianName}
            />
            <ChoiceRow
              values={['Mother', 'Father', 'Guardian']}
              value={stepOne.additionalGuardianRelationship}
              onChange={(additionalGuardianRelationship) =>
                setStepOne({
                  additionalGuardianRelationship:
                    additionalGuardianRelationship as typeof stepOne.additionalGuardianRelationship,
                })
              }
            />
            {!!errors.additionalGuardianRelationship && (
              <Text style={styles.error}>{errors.additionalGuardianRelationship}</Text>
            )}
            <Field
              label="Email Address"
              placeholder="guardian@email.com"
              value={stepOne.additionalGuardianEmail}
              onChangeText={(value) => change('additionalGuardianEmail', value)}
              keyboardType="email-address"
              error={errors.additionalGuardianEmail}
            />
            <Field
              label="Phone Number"
              placeholder="082 000 0000"
              value={stepOne.additionalGuardianPhone}
              onChangeText={(value) => change('additionalGuardianPhone', value)}
              keyboardType="phone-pad"
              error={errors.additionalGuardianPhone}
            />
          </View>
        )}
      </FormSection>
      <FormSection icon="happy-outline" title="Child Details" color={colors.purple}>
        <Field
          label="Child’s Full Name"
          placeholder="Prince Tau"
          value={stepOne.childName}
          onChangeText={(value) => change('childName', value)}
          error={errors.childName}
        />
        <Field
          label="Child’s South African ID Number"
          placeholder="13-digit ID number"
          value={stepOne.childIdNumber}
          onChangeText={(value) => change('childIdNumber', value.replace(/\D/g, '').slice(0, 13))}
          keyboardType="number-pad"
          error={errors.childIdNumber}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="Date of Birth"
              placeholder="2022-05-27"
              value={stepOne.childDateOfBirth}
              onChangeText={(value) => {
                const childDateOfBirth = formatIsoDateInput(value);
                const stage = stageForDateOfBirth(childDateOfBirth);
                setStepOne({ childDateOfBirth, ...(stage ? { currentGrade: stage } : {}) });
                setErrors((current) => ({ ...current, childDateOfBirth: '' }));
              }}
              keyboardType="number-pad"
              error={errors.childDateOfBirth}
            />
            <Text style={styles.helper}>
              Enter year first: YYYY-MM-DD (for example 2022-05-27).
            </Text>
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
          label="Current Grade/Level"
          value={stepOne.currentGrade}
          options={SCHOOL_STAGES.map((stage) => ({
            label: stageOptionLabel(stage),
            value: stage,
          }))}
          onChange={() => undefined}
          error={errors.currentGrade}
        />
        <Text style={styles.muted}>
          Assigned automatically from the child’s verified date of birth.
        </Text>
        <Text style={styles.subsectionTitle}>
          Does your child have any special learning or physical support needs?
        </Text>
        <ChoiceRow
          values={['No', 'Yes']}
          value={stepOne.childHasDisability ? 'Yes' : 'No'}
          onChange={(value) => setStepOne({ childHasDisability: value === 'Yes' })}
        />
        {stepOne.childHasDisability && (
          <Field
            label="Please tell us how we can support your child"
            value={stepOne.disabilityDetails}
            onChangeText={(disabilityDetails) => setStepOne({ disabilityDetails })}
            multiline
          />
        )}
      </FormSection>
      {saving ? (
        <ActivityIndicator color={colors.green} />
      ) : (
        <Button title="Continue to Step 2" onPress={continueNext} />
      )}
    </Screen>
  );
}

export function ApplicationTwoScreen() {
  useOnboardingCheckpoint('ApplicationTwo');
  const navigation = useNavigation<any>();
  const { stepOne, stepTwo, setStepTwo, loadBranches, saveStepTwo } = useApplication();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selectedBranch = branches.find((branch) => branch.id === stepTwo.branchId);
  const schoolTypes = availableSchoolTypes(selectedBranch?.name ?? '');
  const change = (field: string, value: string | boolean) => {
    setStepTwo({ [field]: value });
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const selectBranch = (branch: Branch) => {
    const types = availableSchoolTypes(branch.name);
    const schoolType = types.includes(stepTwo.schoolType) ? stepTwo.schoolType : types[0];
    setStepTwo({
      branchId: branch.id,
      branchName: branch.name,
      schoolType,
      schoolStage: stepOne.currentGrade as SchoolStage,
    });
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
            branchName: branch.name,
            schoolType: types.includes(stepTwo.schoolType) ? stepTwo.schoolType : types[0],
            schoolStage: stepOne.currentGrade as SchoolStage,
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
      if (!stepTwo.reason) nextErrors.reason = 'Select why this branch suits your family.';
      if (!stepTwo.schoolType) nextErrors.schoolType = 'Select a type of school.';
      if (!stepTwo.schoolStage) nextErrors.schoolStage = 'Select a stage.';
      if (!stepTwo.preferredStartDate.trim())
        nextErrors.preferredStartDate = 'Preferred start date is required.';
      else if (
        !/^\d{4}-\d{2}-\d{2}$/.test(stepTwo.preferredStartDate) ||
        Number.isNaN(Date.parse(stepTwo.preferredStartDate))
      )
        nextErrors.preferredStartDate = 'Use a valid date in YYYY-MM-DD format.';
      if (stepTwo.attendedPreschool && !stepTwo.previousSchool.trim())
        nextErrors.previousSchool = 'Previous school name is required.';
      if (stepTwo.attendedPreschool && !stepTwo.previousSchoolPhone.trim())
        nextErrors.previousSchoolPhone = 'Previous school number is required.';
      else if (
        stepTwo.attendedPreschool &&
        stepTwo.previousSchoolPhone.replace(/\D/g, '').length < 9
      )
        nextErrors.previousSchoolPhone = 'Enter a valid school number.';
      if (
        stepTwo.transportRequested &&
        hasSoshanguveTransportFees(stepTwo.branchName) &&
        !stepTwo.transportRoute
      )
        nextErrors.transportRoute = 'Select a transport route.';
      if (stepTwo.aftercareRequested && !stepTwo.aftercareOption)
        nextErrors.aftercareOption = 'Select an aftercare option.';
      if (!stepTwo.referralSource) nextErrors.referralSource = 'Select where you heard about us.';
      if (!stepTwo.emergencyContactName.trim())
        nextErrors.emergencyContactName = 'Emergency contact name is required.';
      if (!stepTwo.emergencyContactPhone.trim())
        nextErrors.emergencyContactPhone = 'Emergency contact phone is required.';
      else if (stepTwo.emergencyContactPhone.replace(/\D/g, '').length < 9)
        nextErrors.emergencyContactPhone = 'Enter a valid emergency phone number.';
      else {
        const emergencyPhone = comparablePhoneNumber(stepTwo.emergencyContactPhone);
        const parentPhones = [
          stepOne.parentPhone,
          ...(stepOne.additionalGuardianEnabled ? [stepOne.additionalGuardianPhone] : []),
        ]
          .filter(Boolean)
          .map(comparablePhoneNumber);
        if (parentPhones.includes(emergencyPhone)) {
          nextErrors.emergencyContactPhone =
            'Use an alternative contact number, not an enrolling parent’s number.';
        }
      }
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
        <DropdownField
          label="Preferred Branch"
          value={stepTwo.branchId}
          options={branches.map((branch) => ({
            label: `${branch.name}${branch.city || branch.region ? ` · ${branch.city || branch.region}` : ''}`,
            value: branch.id,
          }))}
          onChange={(branchId) => {
            const branch = branches.find((item) => item.id === branchId);
            if (branch) selectBranch(branch);
          }}
          error={errors.branchId}
        />
        <DropdownField
          label="Why this branch?"
          value={stepTwo.reason}
          options={[
            { label: 'Close to home', value: 'CLOSE_TO_HOME' },
            { label: 'Close to work', value: 'CLOSE_TO_WORK' },
            { label: 'Convenient location', value: 'CONVENIENT' },
            { label: 'Affordable fees', value: 'AFFORDABLE' },
            { label: 'Recommended by family or friends', value: 'RECOMMENDED' },
            { label: 'School reputation and programme', value: 'REPUTATION' },
            { label: 'Other', value: 'OTHER' },
          ]}
          onChange={(reason) => change('reason', reason)}
          error={errors.reason}
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
            label: `${stageOptionLabel(stage)} · ${formatZar(packagePrice(stepTwo.schoolType, stage, selectedBranch?.name ?? stepTwo.branchName).monthlyFeeCents)} per month`,
            value: stage,
          }))}
          onChange={() => undefined}
          error={errors.schoolStage}
        />
        <Text style={styles.muted}>Carried over automatically from the child’s verified age.</Text>
        <PackageDetails
          schoolType={stepTwo.schoolType}
          stage={stepTwo.schoolStage}
          branchName={selectedBranch?.name ?? stepTwo.branchName}
        />
      </FormSection>
      <FormSection icon="calendar-outline" title="Enrollment Details" color={colors.orange}>
        <Field
          label="Preferred Start Date"
          placeholder="YYYY-MM-DD"
          value={stepTwo.preferredStartDate}
          onChangeText={(value) => change('preferredStartDate', formatIsoDateInput(value))}
          keyboardType="number-pad"
          error={errors.preferredStartDate}
        />
        <Text style={styles.helper}>
          Enter the year, month and day: YYYY-MM-DD (for example 2027-01-15).
        </Text>
        <DropdownField
          label="Attendance Option"
          value={stepTwo.enrollmentType}
          options={[{ label: 'Full Time', value: 'FULL_TIME' }]}
          onChange={() => setStepTwo({ enrollmentType: 'FULL_TIME' })}
        />
        {stepTwo.enrollmentType === 'FULL_TIME' && (
          <DropdownField
            label="Aftercare (optional)"
            value={stepTwo.aftercareRequested ? 'YES' : 'NO'}
            options={[
              { label: 'No aftercare', value: 'NO' },
              { label: 'Yes, include aftercare', value: 'YES' },
            ]}
            onChange={(value) =>
              setStepTwo({
                aftercareRequested: value === 'YES',
                aftercareOption: value === 'YES' ? stepTwo.aftercareOption : '',
              })
            }
          />
        )}
        {stepTwo.aftercareRequested && (
          <>
            <AftercareFeeDetails branchName={selectedBranch?.name ?? stepTwo.branchName} />
            <DropdownField
              label="Choose an aftercare option"
              value={stepTwo.aftercareOption}
              options={[
                { label: 'Ad-hoc · R50 / 30 min or R80 / hour', value: 'AD_HOC' },
                { label: 'Full-time (17:00–18:00) · R700 / month', value: 'FULL_TIME' },
                { label: 'Primary School · R800 / month', value: 'PRIMARY_SCHOOL' },
              ]}
              onChange={(aftercareOption) =>
                setStepTwo({ aftercareOption: aftercareOption as typeof stepTwo.aftercareOption })
              }
              error={errors.aftercareOption}
            />
          </>
        )}
        <DropdownField
          label="Transport (optional)"
          value={stepTwo.transportRequested ? 'YES' : 'NO'}
          options={[
            { label: 'No transport required', value: 'NO' },
            { label: 'Yes, choose a transport route', value: 'YES' },
          ]}
          onChange={(value) =>
            setStepTwo({ transportRequested: value === 'YES', transportRoute: '' })
          }
        />
        {stepTwo.transportRequested &&
          (hasSoshanguveTransportFees(selectedBranch?.name ?? stepTwo.branchName) ? (
            <>
              <SoshanguveTransportFees />
              <DropdownField
                label="Choose your transport location"
                value={stepTwo.transportRoute}
                options={SOSHANGUVE_TRANSPORT_FEES_2027.map((route) => ({
                  label: `${route.location} · ${formatZar(route.monthlyFeeCents)} / month · sibling ${formatZar(route.siblingFeeCents)}`,
                  value: route.location,
                }))}
                onChange={(transportRoute) => change('transportRoute', transportRoute)}
                error={errors.transportRoute}
              />
            </>
          ) : (
            <Text style={styles.muted}>
              Transport routes for this branch are not configured yet. The branch will confirm
              availability and pricing with you.
            </Text>
          ))}
        <DropdownField
          label="Where did you hear about us?"
          value={stepTwo.referralSource}
          options={[
            { label: 'Social media', value: 'SOCIAL_MEDIA' },
            { label: 'Word of mouth', value: 'WORD_OF_MOUTH' },
            { label: 'Radio', value: 'RADIO' },
            { label: 'Street boards', value: 'STREET_BOARDS' },
            { label: 'Website', value: 'WEBSITE' },
            { label: 'Vehicle branding', value: 'VEHICLE_BRANDING' },
            { label: 'Other', value: 'OTHER' },
          ]}
          onChange={(referralSource) => change('referralSource', referralSource)}
          error={errors.referralSource}
        />
        <Text style={styles.muted}>Has your child attended this school before?</Text>
        <ChoiceRow
          values={['Yes', 'No']}
          value={stepTwo.attendedPreschool ? 'Yes' : 'No'}
          onChange={(value) =>
            setStepTwo({
              attendedPreschool: value === 'Yes',
              ...(value === 'No' ? { previousSchool: '', previousSchoolPhone: '' } : {}),
            })
          }
        />
        {stepTwo.attendedPreschool && (
          <>
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
          </>
        )}
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
              onChangeText={(value) => {
                setStepTwo({ emergencyContactPhone: value });
                const enteredPhone = comparablePhoneNumber(value);
                const parentPhones = [
                  stepOne.parentPhone,
                  ...(stepOne.additionalGuardianEnabled ? [stepOne.additionalGuardianPhone] : []),
                ]
                  .filter(Boolean)
                  .map(comparablePhoneNumber);
                setErrors((current) => ({
                  ...current,
                  emergencyContactPhone:
                    enteredPhone.length >= 9 && parentPhones.includes(enteredPhone)
                      ? 'Use an alternative contact number, not an enrolling parent’s number.'
                      : '',
                }));
              }}
              error={errors.emergencyContactPhone}
            />
          </View>
        </View>
        <Text style={styles.muted}>
          Add someone other than the enrolling parent, such as a grandparent, relative or trusted
          neighbour. The school will contact the parents first.
        </Text>
      </FormSection>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            title="Back to Step 1"
            color={colors.green}
            outline
            onPress={() =>
              navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ApplicationOne')
            }
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
  useOnboardingCheckpoint('ApplicationReview');
  const navigation = useNavigation<any>();
  const {
    stepOne,
    stepTwo,
    setStepTwo,
    documents,
    documentReviews,
    uploadDocument,
    refreshApplicationDocuments,
    saveStepTwo,
    submit,
    loadBranches,
    reference,
    paymentStatus,
    startPayfastPayment,
    checkPayfastPayment,
  } = useApplication();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [consents, setConsents] = useState({
    informationAccurate: false,
    privacyAccepted: false,
    termsAccepted: false,
    enrolmentTermsAccepted: false,
    photoConsent: false,
    photoConsentAnswered: false,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const requiredDocuments: Array<{
    kind: DocumentKind;
    label: string;
    description: string;
    required: boolean;
  }> = [
    {
      kind: 'LEARNER_PHOTO',
      label: 'Learner photo',
      description: 'Recent, clear full-length photo',
      required: true,
    },
    {
      kind: 'BIRTH_CERTIFICATE',
      label: 'Child’s birth certificate',
      description: 'Clear copy of the full certificate',
      required: true,
    },
    {
      kind: 'PARENT_ID',
      label: 'Parent / guardian ID copy',
      description: 'At least one parent or legal guardian',
      required: true,
    },
    {
      kind: 'PARENT_ID_SECONDARY',
      label: 'Second parent ID copy',
      description: 'Upload if a second parent is listed (optional)',
      required: false,
    },
    {
      kind: 'MEDICAL_AID',
      label: 'Medical aid copy',
      description: 'Only if applicable (optional)',
      required: false,
    },
    {
      kind: 'CLINIC_CARD',
      label: 'Child’s full clinic card',
      description: 'Complete clinic or immunisation record',
      required: true,
    },
    {
      kind: 'PROOF_OF_ADDRESS',
      label: 'Proof of residence',
      description: 'Recent proof of residential address',
      required: true,
    },
    {
      kind: 'PROOF_OF_INCOME',
      label: 'Proof of income / employment confirmation',
      description: 'Recent supporting document',
      required: true,
    },
  ];
  const selectedBranch = branches.find((branch) => branch.id === stepTwo.branchId);
  const paymentComplete =
    stepOne.applicationType === 'REREGISTRATION' || paymentStatus === 'COMPLETE';
  const rejectedDocuments = requiredDocuments.filter(
    ({ kind }) => documentReviews[kind]?.reviewStatus === 'REJECTED',
  );

  useFocusEffect(
    React.useCallback(() => {
      void refreshApplicationDocuments().catch(() => undefined);
    }, [refreshApplicationDocuments]),
  );

  useEffect(() => {
    void loadBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [loadBranches]);

  useEffect(() => {
    if (stepOne.applicationType === 'REREGISTRATION') return;
    const refresh = () => {
      void checkPayfastPayment().catch(() => undefined);
      const retryOne = setTimeout(() => void checkPayfastPayment().catch(() => undefined), 1500);
      const retryTwo = setTimeout(() => void checkPayfastPayment().catch(() => undefined), 4000);
      return () => {
        clearTimeout(retryOne);
        clearTimeout(retryTwo);
      };
    };
    const cancelInitial = refresh();
    const appState = AppState.addEventListener(
      'change',
      (state) => state === 'active' && refresh(),
    );
    const deepLink = Linking.addEventListener('url', refresh);
    return () => {
      cancelInitial();
      appState.remove();
      deepLink.remove();
    };
  }, [stepOne.applicationType]);

  const payWithPayFast = async () => {
    try {
      setBusy('payfast');
      const checkoutUrl = await startPayfastPayment();
      await Linking.openURL(checkoutUrl);
    } catch (reason) {
      Alert.alert('Unable to start payment', (reason as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const upload = async (kind: DocumentKind, source: 'camera' | 'gallery' | 'files') => {
    try {
      setBusy(kind);
      await uploadDocument(kind, source);
    } catch (reason) {
      Alert.alert('Upload failed', (reason as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const chooseUploadSource = (kind: DocumentKind) => {
    Alert.alert('Add document', 'Choose where to upload from.', [
      { text: 'Camera', onPress: () => void upload(kind, 'camera') },
      { text: 'Photo Gallery', onPress: () => void upload(kind, 'gallery') },
      { text: 'Files', onPress: () => void upload(kind, 'files') },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
        (stepTwo.attendedPreschool && (!stepTwo.previousSchool || !stepTwo.previousSchoolPhone)) ||
        !stepTwo.feePayerFirstName ||
        !stepTwo.feePayerLastName ||
        !stepTwo.feePayerTermsAccepted
      ) {
        throw new Error('School preference information is incomplete. Select Edit to correct it.');
      }
      if (requiredDocuments.some(({ kind, required }) => required && !documents[kind])) {
        throw new Error(
          'Upload all required learner documents before submitting. Medical aid is optional.',
        );
      }
      if (rejectedDocuments.length > 0) {
        throw new Error(
          `Replace ${rejectedDocuments.map(({ label }) => label).join(', ')} with the correct document before submitting.`,
        );
      }
      if (!paymentComplete) {
        throw new Error(
          'Complete the PayFast application-fee payment before submitting your application.',
        );
      }
      if (!documents.FEE_PAYER_ID) {
        throw new Error('Upload the fee payer ID copy before submitting your application.');
      }
      if (
        !consents.photoConsentAnswered ||
        !consents.informationAccurate ||
        !consents.privacyAccepted ||
        !consents.termsAccepted ||
        !consents.enrolmentTermsAccepted
      ) {
        throw new Error('Answer the photo consent question and accept all required declarations.');
      }
      setBusy('submit');
      await saveStepTwo();
      await submit(consents.enrolmentTermsAccepted, consents.photoConsent);
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
          value={`${SCHOOL_PACKAGES[stepTwo.schoolType].label} · ${STAGE_LABELS[stepTwo.schoolStage]} · ${stepTwo.enrollmentType.replace('_', ' ')}${stepTwo.aftercareRequested ? ` + AFTERCARE (${stepTwo.aftercareOption.replaceAll('_', ' ') || 'option pending'})` : ''}${stepTwo.transportRequested ? ` + TRANSPORT (${stepTwo.transportRoute || 'route pending'})` : ''} · ${stepTwo.preferredStartDate}`}
          onEdit={() => navigation.navigate('ApplicationTwo')}
        />
        <SummaryRow
          label="Medical & Emergency"
          value={`${stepTwo.allergies || 'No allergies'} · ${stepTwo.emergencyContactName}`}
          onEdit={() => navigation.navigate('ApplicationTwo')}
        />
      </ReviewSection>
      <ReviewSection title="SECTION 2 — REQUIRED DOCUMENTS" icon="document-text">
        <View
          style={[
            styles.uploadCountBanner,
            rejectedDocuments.length > 0 && styles.documentAttentionBanner,
          ]}
        >
          <Ionicons
            name={rejectedDocuments.length > 0 ? 'alert-circle' : 'checkmark-circle'}
            size={24}
            color={rejectedDocuments.length > 0 ? colors.danger : colors.green2}
          />
          <Text style={styles.uploadCountText}>
            {rejectedDocuments.length > 0
              ? `${rejectedDocuments.length} document${rejectedDocuments.length === 1 ? '' : 's'} must be replaced`
              : `${requiredDocuments.filter(({ kind }) => documents[kind]).length} documents uploaded`}
          </Text>
        </View>
        {requiredDocuments.map(({ kind, label, description, required }) => {
          const review = documentReviews[kind];
          const rejected = review?.reviewStatus === 'REJECTED';
          return (
          <View key={kind} style={[styles.documentRow, rejected && styles.rejectedDocumentRow]}>
            <View style={styles.flex}>
              <Text style={styles.documentLabel}>{label}</Text>
              <Text style={styles.muted}>{description}</Text>
              {rejected && (
                <View style={styles.rejectionMessage}>
                  <Text style={styles.rejectionTitle}>Document rejected — replacement required</Text>
                  <Text style={styles.rejectionReason}>
                    {review?.rejectionReason || 'Please upload a clear and correct copy of this document.'}
                  </Text>
                </View>
              )}
              {!!documents[kind] && (
                <Text style={[styles.uploadedFilename, rejected && styles.rejectedFilename]}>
                  {rejected ? 'Needs replacement: ' : '✓ '}{documents[kind]}
                </Text>
              )}
              {attemptedSubmit && required && !documents[kind] && (
                <Text style={styles.error}>Required document</Text>
              )}
            </View>
            <Button
              title={busy === kind ? 'Uploading…' : rejected ? 'Upload correct document' : documents[kind] ? 'Replace' : 'Upload'}
              color={rejected ? colors.danger : colors.green}
              outline={Boolean(documents[kind]) && !rejected}
              onPress={() => chooseUploadSource(kind)}
            />
          </View>
          );
        })}
      </ReviewSection>
      <ReviewSection title="SECTION 3 — TERMS & CONSENT" icon="checkbox">
        <Text style={styles.consentQuestion}>
          Do you consent to Mobsie Kids taking and using photographs of your child for school
          activities and parent communications?
        </Text>
        <ChoiceRow
          values={['Yes', 'No']}
          value={consents.photoConsentAnswered ? (consents.photoConsent ? 'Yes' : 'No') : ''}
          onChange={(answer) =>
            setConsents((value) => ({
              ...value,
              photoConsent: answer === 'Yes',
              photoConsentAnswered: true,
            }))
          }
        />
        {attemptedSubmit && !consents.photoConsentAnswered && (
          <Text style={styles.error}>Select Yes or No for photo consent.</Text>
        )}
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
        <ConsentRow
          checked={consents.enrolmentTermsAccepted}
          label="I have read and agree to the Terms of Enrolment (clauses 1–16)."
          onPress={() =>
            setConsents((value) => ({
              ...value,
              enrolmentTermsAccepted: !value.enrolmentTermsAccepted,
            }))
          }
        />
        <View style={styles.policyLinks}>
          <Pressable onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.inlineLink}>View Privacy Policy</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TermsPolicy')}>
            <Text style={styles.inlineLink}>View Terms & Conditions</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('EnrolmentTermsPolicy')}>
            <Text style={styles.inlineLink}>View Terms of Enrolment (1–16)</Text>
          </Pressable>
        </View>
        {attemptedSubmit &&
          (!consents.informationAccurate ||
            !consents.privacyAccepted ||
            !consents.termsAccepted ||
            !consents.enrolmentTermsAccepted) && (
            <Text style={styles.error}>All required declarations must be accepted.</Text>
          )}
      </ReviewSection>
      <ReviewSection title="SECTION 4 — PAYMENT" icon="card">
        {stepOne.applicationType === 'REREGISTRATION' ? (
          <Card style={{ backgroundColor: colors.mint }}>
            <Text style={styles.sectionTitle}>Registration fee waived</Text>
            <Text style={styles.muted}>
              No registration payment is required for this re-registration.
            </Text>
          </Card>
        ) : (
          <>
            <PaymentSummary
              schoolType={stepTwo.schoolType}
              stage={stepTwo.schoolStage}
              branchName={selectedBranch?.name}
              applicationReference={reference}
              transportRequested={stepTwo.transportRequested}
              transportRoute={stepTwo.transportRoute}
              aftercareRequested={stepTwo.aftercareRequested}
              aftercareOption={stepTwo.aftercareOption}
            />
            <Button
              title={
                busy === 'payfast'
                  ? 'Opening PayFast…'
                  : paymentStatus === 'COMPLETE'
                    ? 'Payment complete'
                    : `Pay ${formatZar(packagePrice(stepTwo.schoolType, stepTwo.schoolStage, selectedBranch?.name ?? stepTwo.branchName).applicationFeeCents)} with PayFast`
              }
              color={colors.green2}
              disabled={busy === 'payfast' || paymentStatus === 'COMPLETE'}
              onPress={payWithPayFast}
            />
            {paymentStatus !== 'COMPLETE' && paymentStatus !== 'NOT_STARTED' && (
              <Button
                title="Check payment status"
                color={colors.green}
                outline
                onPress={() => void checkPayfastPayment()}
              />
            )}
            <Text style={paymentStatus === 'COMPLETE' ? styles.paymentSuccess : styles.muted}>
              {paymentStatus === 'COMPLETE'
                ? 'PayFast payment confirmed.'
                : 'Payment is confirmed securely by PayFast before submission.'}
            </Text>
          </>
        )}
        <Text style={styles.subsectionTitle}>Person responsible for school fees</Text>
        <Field
          label="First name"
          value={stepTwo.feePayerFirstName}
          onChangeText={(feePayerFirstName) => setStepTwo({ feePayerFirstName })}
          autoCapitalize="words"
        />
        <Field
          label="Surname"
          value={stepTwo.feePayerLastName}
          onChangeText={(feePayerLastName) => setStepTwo({ feePayerLastName })}
          autoCapitalize="words"
        />
        <View style={styles.documentRow}>
          <View style={styles.flex}>
            <Text style={styles.documentLabel}>Fee payer ID copy</Text>
            <Text style={styles.muted}>
              Upload a clear ID or passport copy for the person responsible for fees.
            </Text>
            {!!documents.FEE_PAYER_ID && <Text style={styles.muted}>{documents.FEE_PAYER_ID}</Text>}
            {attemptedSubmit && !documents.FEE_PAYER_ID && (
              <Text style={styles.error}>Fee payer ID copy is required</Text>
            )}
          </View>
          <Button
            title={
              busy === 'FEE_PAYER_ID' ? 'Uploading…' : documents.FEE_PAYER_ID ? 'Replace' : 'Upload'
            }
            color={colors.green}
            outline
            onPress={() => chooseUploadSource('FEE_PAYER_ID')}
          />
        </View>
        <ConsentRow
          checked={stepTwo.feePayerTermsAccepted}
          label="I am responsible for school fees and agree to the Terms & Conditions."
          onPress={() => setStepTwo({ feePayerTermsAccepted: !stepTwo.feePayerTermsAccepted })}
        />
        {attemptedSubmit &&
          (!stepTwo.feePayerFirstName ||
            !stepTwo.feePayerLastName ||
            !stepTwo.feePayerTermsAccepted) && (
            <Text style={styles.error}>Complete the fee payer details and consent.</Text>
          )}
        {attemptedSubmit && !paymentComplete && (
          <Text style={styles.error}>PayFast payment is required.</Text>
        )}
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
    </Screen>
  );
}

export function ApplicationSuccessScreen() {
  useOnboardingCheckpoint('ApplicationSuccess');
  const navigation = useNavigation<any>();
  const { stepOne, stepTwo, reference } = useApplication();
  return (
    <Screen style={styles.success}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={54} color="#fff" />
      </View>
      <Text style={styles.successTitle}>Application Received</Text>
      <Text style={styles.lead}>Your application has been submitted for review.</Text>
      <Card style={styles.confirmation}>
        <Text style={styles.whiteHeading}>Confirmation Details</Text>
        <SummaryLine label="Application Reference" value={displayReference(reference, 'Pending')} />
        <SummaryLine label="Child Name" value={stepOne.childName} />
        <SummaryLine label="School Type" value={SCHOOL_PACKAGES[stepTwo.schoolType].label} />
        <SummaryLine label="Stage" value={STAGE_LABELS[stepTwo.schoolStage]} />
        <SummaryLine label="Enrollment" value={stepTwo.enrollmentType.replace('_', ' ')} />
        <SummaryLine
          label="Aftercare"
          value={stepTwo.aftercareRequested ? 'Included' : 'Not selected'}
        />
        <SummaryLine label="Start Date" value={stepTwo.preferredStartDate} />
        <SummaryLine
          label="Application Fee"
          value={`${formatZar(packagePrice(stepTwo.schoolType, stepTwo.schoolStage, stepTwo.branchName).applicationFeeCents)} · Paid`}
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
  useOnboardingCheckpoint('Enrollment');
  const navigation = useNavigation<any>();
  const { token, refreshSession, markPendingApproval } = useAuth();
  const { refresh: refreshSchoolData } = useSchoolData();
  const {
    applicationId: localApplicationId,
    reference,
    stepOne,
    stepTwo,
    reset,
    isAdditionalChild,
    finishAdditionalChild,
  } = useApplication();
  const [details, setDetails] = useState<{
    id: string;
    reference: string;
    childName: string;
    branchId: string;
    branchName: string;
    schoolType: SchoolType;
    schoolStage: SchoolStage;
    preferredStartDate: string;
    enrollmentType: 'FULL_TIME' | 'PART_TIME';
    aftercareRequested: boolean;
    enrollmentComplete: boolean;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState('');
  const [primaryCollector, setPrimaryCollector] = useState('');
  const [secondaryCollector, setSecondaryCollector] = useState('');
  const [busy, setBusy] = useState(false);
  const openPendingScreen = (applicationReference?: string | null) => {
    markPendingApproval(applicationReference);
    navigation.reset({ index: 0, routes: [{ name: 'ApprovalPending' }] });
  };
  useEffect(() => {
    if (!token) return;
    setDetailsLoading(true);
    const referenceQuery = reference ? `?reference=${encodeURIComponent(reference)}` : '';
    apiData<typeof details>(`/mobile/enrollment${referenceQuery}`, { token })
      .then(async (saved) => {
        setDetails(saved);
        setDetailsError('');
        // Recover cleanly when the database save completed but an earlier
        // request was left waiting on email delivery.
        if (saved?.enrollmentComplete) {
          if (isAdditionalChild) {
            void finishAdditionalChild()
              .then(refreshSchoolData)
              .then(() => navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] }));
          } else {
            openPendingScreen(saved.reference);
          }
        }
      })
      .catch((error) => setDetailsError((error as Error).message))
      .finally(() => setDetailsLoading(false));
  }, [token, reference, isAdditionalChild]);
  const finish = async () => {
    try {
      const applicationId = details?.id || localApplicationId;
      if (!token || !applicationId)
        throw new Error('Your saved application could not be loaded. Please try again.');
      if (primaryCollector.trim().length < 2) {
        throw new Error('Enter the full name of the primary authorised collector.');
      }
      setBusy(true);
      await apiData<{ status: string; emailQueued: boolean }>('/mobile/enrollment', {
        method: 'POST',
        token,
        body: JSON.stringify({
          applicationId,
          // Compatibility for older API deployments that still validate this
          // removed field. It is generated internally and is never shown to,
          // chosen by, or used by the parent. The current API ignores it.
          pickupPassword: `removed-${applicationId.slice(0, 12)}`,
          primaryCollector,
          secondaryCollector,
        }),
      });
      const submittedReference = details?.reference || reference;
      if (isAdditionalChild) {
        await finishAdditionalChild();
        await refreshSchoolData();
        Alert.alert(
          'Child added',
          `${childName || 'The new child'} is awaiting school approval. You can keep using the app with your other child while you wait.`,
        );
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
      } else {
        openPendingScreen(submittedReference);
        await reset();
      }
      // Reconcile with Neon just after the immediate local transition. This
      // replaces the manual app refresh that was previously required.
      if (!isAdditionalChild) setTimeout(() => refreshSession().catch(() => undefined), 500);
    } catch (error) {
      Alert.alert('Enrolment failed', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const refreshEnrollmentStatus = async () => {
    if (!token) return;
    try {
      setBusy(true);
      const saved = await apiData<typeof details>('/mobile/enrollment', { token });
      setDetails(saved);
      if (saved?.enrollmentComplete) {
        openPendingScreen(saved.reference);
        return;
      }
      await refreshSession();
      Alert.alert(
        'Not submitted yet',
        'Complete the collector details and select Confirm Enrolment first.',
      );
    } catch (error) {
      Alert.alert('Unable to refresh', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (detailsLoading) {
    return (
      <Screen>
        <Header title="Complete Enrolment" onBell={false} />
        <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
      </Screen>
    );
  }
  if (detailsError && !details) {
    return (
      <Screen>
        <Header title="Complete Enrolment" onBell={false} />
        <Card>
          <Text style={styles.error}>{detailsError}</Text>
        </Card>
        <Button title="Go Back" outline onPress={() => navigation.goBack()} />
      </Screen>
    );
  }
  const childName = details?.childName || stepOne.childName;
  const schoolType = details?.schoolType || stepTwo.schoolType;
  const schoolStage = details?.schoolStage || stepTwo.schoolStage;
  return (
    <Screen>
      <Header title="Complete Enrolment" onBell={false} />
      <Text style={styles.formTitle}>Confirm {childName}’s Place</Text>
      <FormSection icon="school-outline" title="Enrolment Confirmation" color={colors.green}>
        <Field
          label="Application Reference"
          value={displayReference(details?.reference || reference)}
        />
        <Field label="Preferred Branch" value={details?.branchName || stepTwo.branchName || ''} />
        <Field label="School Type" value={SCHOOL_PACKAGES[schoolType].label} />
        <Field
          label="Stage & Monthly Fee"
          value={`${STAGE_LABELS[schoolStage]} · ${formatZar(packagePrice(schoolType, schoolStage, details?.branchName || stepTwo.branchName).monthlyFeeCents)}`}
        />
        <Field
          label="Start Date"
          value={details?.preferredStartDate || stepTwo.preferredStartDate || ''}
        />
        <Field
          label="Attendance"
          value={`${(details?.enrollmentType || stepTwo.enrollmentType).replace('_', ' ')}${(details?.aftercareRequested ?? stepTwo.aftercareRequested) ? ' + AFTERCARE' : ''}`}
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
        <>
          <Button title="Confirm Enrolment" onPress={finish} />
          <Button
            title="Refresh Status"
            color={colors.green}
            outline
            onPress={refreshEnrollmentStatus}
          />
        </>
      )}
    </Screen>
  );
}

export function ApprovalPendingScreen() {
  const navigation = useNavigation<any>();
  const { user, token, refreshSession, markApproved, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const readApprovalStatus = async () => {
    if (!token) return false;
    const referenceQuery = user?.applicationReference
      ? `?reference=${encodeURIComponent(user.applicationReference)}`
      : '';
    const application = await apiData<{ status?: string }>(`/mobile/enrollment${referenceQuery}`, {
      token,
      cacheTtlMs: 0,
      forceRefresh: true,
    });
    const approved = application?.status === 'APPROVED' || application?.status === 'ENROLLED';
    if (approved) {
      markApproved();
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    }
    return approved;
  };

  useEffect(() => {
    const check = () => readApprovalStatus().catch(() => refreshSession().catch(() => undefined));
    check();
    // Approval happens on the dashboard, so keep this screen in sync without
    // requiring the parent to pull-to-refresh or restart the app.
    // Dashboard approval is not time-critical to the second. A 15-second
    // interval avoids hammering the API while this screen remains open.
    const timer = setInterval(check, 15_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [token]);
  const checkNow = async () => {
    try {
      setChecking(true);
      const approved = await readApprovalStatus();
      if (!approved) {
        Alert.alert(
          'Application pending',
          'Your application has not been approved yet. We’ll notify you as soon as the school approves it.',
        );
      }
    } catch (error) {
      Alert.alert('Unable to check status', (error as Error).message);
    } finally {
      setChecking(false);
    }
  };
  return (
    <Screen style={styles.success}>
      <Image source={images.logo} style={styles.applicationLogo} resizeMode="contain" />
      <View style={[styles.successIcon, { backgroundColor: colors.amber }]}>
        <Ionicons name="time-outline" size={48} color="#fff" />
      </View>
      <Text style={styles.successTitle}>Waiting for approval</Text>
      <Text style={[styles.lead, { textAlign: 'center' }]}>
        Your application has been received and is currently under review.
      </Text>
      <Card style={styles.confirmation}>
        <Text style={styles.whiteHeading}>Application status</Text>
        <SummaryLine
          label="Reference"
          value={displayReference(user?.applicationReference, 'Submitted')}
        />
        <SummaryLine label="Status" value="Pending review" />
      </Card>
      <Text style={[styles.muted, { textAlign: 'center' }]}>
        We’ll email you when the application is approved. This screen will then open your parent
        home automatically.
      </Text>
      {checking ? (
        <ActivityIndicator color={colors.green} />
      ) : (
        <Button title="Check Approval Status" color={colors.green} onPress={checkNow} />
      )}
      <Button title="Sign Out" color={colors.danger} outline onPress={logout} />
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
  const slug =
    route.params?.slug === 'privacy'
      ? 'privacy'
      : route.params?.slug === 'enrolment'
        ? 'enrolment'
        : 'terms';
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
      <Header
        title={
          slug === 'privacy'
            ? 'Privacy Policy'
            : slug === 'enrolment'
              ? 'Terms of Enrolment'
              : 'Terms & Conditions'
        }
        onBell={false}
      />
      <Pressable
        style={styles.policyBack}
        onPress={() =>
          navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ApplicationReview')
        }
      >
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
            <ScrollView style={styles.dropdownOptions} showsVerticalScrollIndicator>
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
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PackageDetails({
  schoolType,
  stage,
  branchName,
}: {
  schoolType: SchoolType;
  stage: SchoolStage;
  branchName?: string;
}) {
  const schoolPackage = SCHOOL_PACKAGES[schoolType];
  const price = packagePrice(schoolType, stage, branchName ?? '');
  const offerings = offeringsForBranch(schoolType, branchName ?? '');
  return (
    <View style={styles.packageCard}>
      <Text style={styles.subsectionTitle}>What the school fees include</Text>
      <View style={styles.packageHeader}>
        <View style={styles.packageIcon}>
          <Ionicons name="school-outline" size={20} color={colors.green} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.packageName}>
            {price.feeYear ? `${price.feeYear} Fee Structure` : schoolPackage.packageName}
          </Text>
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
        {price.annualFeeCents !== null && (
          <PriceItem
            label="Annual discounted (11 months)"
            value={formatZar(price.annualFeeCents)}
          />
        )}
        {price.siblingMonthlyFeeCents !== null && (
          <PriceItem
            label="Sibling monthly (11 months)"
            value={formatZar(price.siblingMonthlyFeeCents)}
          />
        )}
      </View>
      <Text style={styles.offerTitle}>What this school offers</Text>
      {offerings.map((offering) => (
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

function AftercareFeeDetails({ branchName }: { branchName?: string }) {
  if (!hasOfficialAftercareFees(branchName ?? '')) {
    return (
      <View style={styles.feeNotice}>
        <Ionicons name="information-circle-outline" size={18} color={colors.orange} />
        <Text style={styles.feeNoticeText}>
          Contact the selected branch to confirm aftercare availability and pricing.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.aftercareCard}>
      <View style={styles.feeCardHeading}>
        <Ionicons name="time-outline" size={20} color={colors.purple} />
        <View style={styles.flex}>
          <Text style={styles.feeCardTitle}>2027 Aftercare Fee Structure</Text>
          <Text style={styles.feeCardSubtitle}>Hebron · Soshanguve · Mamelodi</Text>
        </View>
      </View>
      <View style={styles.safetyNotice}>
        <Ionicons name="alert-circle-outline" size={18} color="#A35400" />
        <Text style={styles.safetyNoticeText}>
          Collect your child by 18:00. Aftercare teachers may only remain on the premises until
          18:00.
        </Text>
      </View>
      <FeeOption
        title="Ad-hoc Aftercare"
        description={AFTERCARE_FEES_2027.adHoc.paymentNote}
        prices={`${formatZar(AFTERCARE_FEES_2027.adHoc.halfHourCents)} / 30 min · ${formatZar(AFTERCARE_FEES_2027.adHoc.hourlyCents)} / hour`}
      />
      <FeeOption
        title={`Full-time Aftercare (${AFTERCARE_FEES_2027.fullTime.hours})`}
        description={AFTERCARE_FEES_2027.fullTime.paymentNote}
        prices={`${formatZar(AFTERCARE_FEES_2027.fullTime.monthlyFeeCents)} / month`}
      />
      <FeeOption
        title="Primary School Aftercare"
        description={AFTERCARE_FEES_2027.primarySchool.paymentNote}
        prices={`${formatZar(AFTERCARE_FEES_2027.primarySchool.afternoonFeeCents)} / afternoon · ${formatZar(AFTERCARE_FEES_2027.primarySchool.monthlyFeeCents)} / month`}
      />
      <Text style={styles.feeReference}>Payment reference: your child’s name and surname</Text>
    </View>
  );
}

function FeeOption({
  title,
  description,
  prices,
}: {
  title: string;
  description: string;
  prices: string;
}) {
  return (
    <View style={styles.feeOption}>
      <View style={styles.flex}>
        <Text style={styles.feeOptionTitle}>{title}</Text>
        <Text style={styles.feeOptionDescription}>{description}</Text>
      </View>
      <Text style={styles.feeOptionPrice}>{prices}</Text>
    </View>
  );
}

function SoshanguveTransportFees() {
  return (
    <View style={styles.transportSection}>
      <View style={styles.feeCardHeading}>
        <Ionicons name="bus-outline" size={19} color={colors.blue} />
        <View style={styles.flex}>
          <Text style={styles.feeCardTitle}>2027 Soshanguve Transport Fees</Text>
          <Text style={styles.feeCardSubtitle}>Monthly fee · published sibling fee</Text>
        </View>
      </View>
      <View style={styles.transportHeaderRow}>
        <Text style={styles.transportHeaderLocation}>Location</Text>
        <Text style={styles.transportHeaderPrice}>Amount / month</Text>
        <Text style={styles.transportHeaderSibling}>Sibling price</Text>
      </View>
      {SOSHANGUVE_TRANSPORT_FEES_2027.map((fee) => (
        <View key={fee.location} style={styles.transportRow}>
          <Text style={styles.transportLocation}>{fee.location}</Text>
          <Text style={styles.transportPrice}>{formatZar(fee.monthlyFeeCents)}</Text>
          <Text style={styles.transportSibling}>{formatZar(fee.siblingFeeCents)}</Text>
        </View>
      ))}
      <Text style={styles.transportHint}>Transport is not included in the monthly school fee.</Text>
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

function PaymentSummary({
  schoolType,
  stage,
  branchName,
  applicationReference,
  transportRequested,
  transportRoute,
  aftercareRequested,
  aftercareOption,
}: {
  schoolType: SchoolType;
  stage: SchoolStage;
  branchName?: string;
  applicationReference?: string | null;
  transportRequested?: boolean;
  transportRoute?: string;
  aftercareRequested?: boolean;
  aftercareOption?: '' | 'AD_HOC' | 'FULL_TIME' | 'PRIMARY_SCHOOL';
}) {
  const schoolPackage = SCHOOL_PACKAGES[schoolType];
  const price = packagePrice(schoolType, stage, branchName);
  const transport = transportRequested
    ? SOSHANGUVE_TRANSPORT_FEES_2027.find((item) => item.location === transportRoute)
    : undefined;
  const monthlyAftercareCents =
    aftercareRequested && aftercareOption === 'FULL_TIME'
      ? AFTERCARE_FEES_2027.fullTime.monthlyFeeCents
      : aftercareRequested && aftercareOption === 'PRIMARY_SCHOOL'
        ? AFTERCARE_FEES_2027.primarySchool.monthlyFeeCents
        : 0;
  const finalMonthlyCents =
    price.monthlyFeeCents + (transport?.monthlyFeeCents ?? 0) + monthlyAftercareCents;
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
      {aftercareRequested && aftercareOption === 'AD_HOC' && (
        <PaymentRow label="Ad-hoc aftercare" value="Pay as used · paid directly to teachers" />
      )}
      {monthlyAftercareCents > 0 && (
        <PaymentRow
          label={
            aftercareOption === 'FULL_TIME' ? 'Full-time aftercare' : 'Primary School aftercare'
          }
          value={`${formatZar(monthlyAftercareCents)} / month`}
        />
      )}
      {transport && (
        <>
          <PaymentRow
            label={`Transport · ${transport.location}`}
            value={`${formatZar(transport.monthlyFeeCents)} / month`}
          />
          <PaymentRow
            label="Published sibling transport price"
            value={formatZar(transport.siblingFeeCents)}
          />
        </>
      )}
      {(transport || monthlyAftercareCents > 0) && (
        <PaymentRow label="Final monthly total" value={formatZar(finalMonthlyCents)} strong />
      )}
      {price.annualFeeCents !== null && (
        <PaymentRow
          label="Annual discounted fee (11 months)"
          value={formatZar(price.annualFeeCents)}
        />
      )}
      {price.siblingMonthlyFeeCents !== null && (
        <PaymentRow
          label="Sibling fee per month (11 months)"
          value={formatZar(price.siblingMonthlyFeeCents)}
        />
      )}
      <View style={styles.bankDetails}>
        <Text style={styles.bankTitle}>Secure PayFast payment</Text>
        <Text style={styles.muted}>
          Pay using the payment methods available on PayFast. Mobsie Connect never stores your card
          details.
        </Text>
        <PaymentRow
          label="Payment reference"
          value={displayReference(applicationReference, 'Save your preferences first')}
          strong
        />
        <Text style={styles.bankHint}>
          Your application updates automatically after PayFast confirms the payment.
        </Text>
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
  helper: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: -2, marginBottom: 6 },
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
  heroKids: { height: 280, marginTop: 2, width: '112%' },
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
  applicationLogo: { alignSelf: 'center', height: 92, width: 180 },
  formTitle: {
    color: colors.ink,
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    marginVertical: 18,
    textAlign: 'center',
  },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  subsectionTitle: {
    color: colors.ink,
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    marginTop: 16,
  },
  consentQuestion: {
    color: colors.ink,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    lineHeight: 16,
    marginBottom: 4,
  },
  additionalGuardianPanel: {
    backgroundColor: '#FFF8F1',
    borderColor: `${colors.orange}35`,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  error: { color: colors.danger, fontSize: 11 },
  authLoading: { alignItems: 'center', gap: 8, marginVertical: 14 },
  authLoadingText: { color: colors.green, fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  passwordRequirement: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 5,
    marginTop: -3,
  },
  passwordRequirementText: { color: colors.muted, flex: 1, fontSize: 10, lineHeight: 15 },
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
  dropdownOptions: { maxHeight: 420 },
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
  aftercareCard: {
    backgroundColor: '#FBF7FC',
    borderColor: '#8B3A8B35',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  feeCardHeading: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 },
  feeCardTitle: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 12 },
  feeCardSubtitle: { color: colors.muted, fontSize: 8, marginTop: 1 },
  safetyNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E3',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
    padding: 9,
  },
  safetyNoticeText: { color: '#713800', flex: 1, fontSize: 8, lineHeight: 13 },
  feeOption: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: colors.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 7,
    padding: 9,
  },
  feeOptionTitle: { color: colors.ink, fontFamily: 'Poppins_600SemiBold', fontSize: 9 },
  feeOptionDescription: { color: colors.muted, fontSize: 7, lineHeight: 11, marginTop: 2 },
  feeOptionPrice: {
    color: colors.purple,
    flexShrink: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 8,
    lineHeight: 13,
    maxWidth: '45%',
    textAlign: 'right',
  },
  feeReference: {
    color: colors.green,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8,
    marginTop: 9,
    textAlign: 'center',
  },
  feeNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF8EC',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 7,
    marginTop: 8,
    padding: 9,
  },
  feeNoticeText: { color: colors.text, flex: 1, fontSize: 9, lineHeight: 14 },
  transportSection: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  transportRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 27,
  },
  transportHeaderRow: {
    backgroundColor: '#F1F8F5',
    borderRadius: radius.sm,
    flexDirection: 'row',
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  transportHeaderLocation: {
    color: colors.green,
    flex: 1.2,
    fontFamily: 'Poppins_700Bold',
    fontSize: 7,
  },
  transportHeaderPrice: {
    color: colors.orange,
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 7,
    textAlign: 'right',
  },
  transportHeaderSibling: {
    color: '#000000',
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 7,
    textAlign: 'right',
  },
  transportLocation: {
    color: colors.text,
    flex: 1.2,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8,
  },
  transportPrice: {
    color: colors.ink,
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8,
    textAlign: 'right',
  },
  transportSibling: { color: '#000000', flex: 1, fontSize: 8, textAlign: 'right' },
  transportHint: { color: colors.orange, fontSize: 8, lineHeight: 12, marginTop: 8 },
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
  paymentSuccess: {
    color: colors.green2,
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    marginTop: 8,
  },
  bankDetails: {
    backgroundColor: '#FFFFFF',
    borderColor: `${colors.green}26`,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginTop: 8,
    padding: 8,
  },
  bankTitle: { color: colors.green, fontFamily: 'Poppins_700Bold', fontSize: 10, marginBottom: 2 },
  bankHint: { color: colors.muted, fontSize: 8, lineHeight: 12, marginTop: 4 },
  stepLabel: { color: colors.green, fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginTop: 8 },
  additionalChildBack: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
    paddingVertical: 6,
  },
  additionalChildBackText: {
    color: colors.green,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
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
  documentRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rejectedDocumentRow: {
    backgroundColor: '#FFF4F2',
    borderColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  documentAttentionBanner: {
    backgroundColor: '#FFF0ED',
    borderColor: colors.danger,
    borderWidth: 1,
  },
  rejectionMessage: {
    backgroundColor: '#FFFFFF',
    borderLeftColor: colors.danger,
    borderLeftWidth: 3,
    marginTop: 7,
    padding: 8,
  },
  rejectionTitle: { color: colors.danger, fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  rejectionReason: { color: colors.ink, fontSize: 9, lineHeight: 14, marginTop: 3 },
  rejectedFilename: { color: colors.danger },
  documentLabel: { color: colors.ink, flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  uploadCountBanner: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    padding: 12,
  },
  uploadCountText: { color: colors.green, fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  uploadedFilename: { color: colors.green2, fontSize: 9, marginTop: 3 },
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
    alignSelf: 'stretch',
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    lineHeight: 29,
    textAlign: 'left',
    width: '100%',
  },
  publicAboutScreen: { backgroundColor: '#FBFAF6', paddingHorizontal: 16 },
  publicAboutLogo: { alignSelf: 'center', height: 88, marginBottom: 8, width: 180 },
  publicAboutHero: {
    alignSelf: 'stretch',
    backgroundColor: colors.green,
    borderBottomRightRadius: 28,
    borderRadius: 20,
    borderTopLeftRadius: 28,
    marginBottom: 14,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  publicAboutIntro: {
    alignSelf: 'stretch',
    color: '#E9F8EF',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'left',
    width: '100%',
  },
  publicStoryCard: {
    borderLeftColor: colors.orange,
    borderLeftWidth: 5,
    marginBottom: 12,
  },
  publicVisionCard: {
    backgroundColor: '#FFF8EC',
    borderColor: `${colors.orange}30`,
    borderWidth: 1,
    marginBottom: 18,
  },
  publicCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  publicCardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  publicAboutIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  publicEstablished: {
    color: colors.orange,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9,
  },
  publicStats: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    paddingBottom: 14,
  },
  publicStat: { alignItems: 'center', flex: 1 },
  publicStatValue: {
    color: colors.green,
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  publicStatLabel: {
    color: colors.muted,
    fontSize: 8,
    lineHeight: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  publicAboutBody: { color: colors.text, fontSize: 10, lineHeight: 17 },
  publicValuesHeading: {
    color: colors.ink,
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    marginBottom: 10,
  },
  publicValuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 20,
  },
  publicValueCard: {
    alignItems: 'center',
    borderTopColor: colors.purple,
    borderTopWidth: 3,
    minWidth: '46%',
    flexGrow: 1,
    gap: 8,
  },
  publicValueTitle: {
    color: colors.ink,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
  confirmation: { backgroundColor: colors.green, marginVertical: 20, width: '100%' },
  whiteHeading: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 15, marginBottom: 10 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  whiteText: { color: '#fff', fontSize: 10 },
  whiteBold: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
});
