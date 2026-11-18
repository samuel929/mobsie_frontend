import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../auth/AuthContext';
import { environment } from '../config/environment';
import { apiData } from '../services/api/client';
import { SchoolStage, SchoolType } from '../data/schoolPackages';

export type Branch = {
  id: string;
  name: string;
  city: string;
  region: string;
  address: string;
  phone: string;
  email: string;
  imageUrl: string | null;
  principalName: string | null;
  principalPhone: string | null;
};

export type TeamMember = {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  title: string;
  bio: string | null;
  yearsExperience: number;
  imageUrl: string;
  isPrincipal: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
};

export type StepOne = {
  applicationType: 'NEW' | 'REREGISTRATION';
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  relationship: '' | 'Mother' | 'Father' | 'Guardian';
  additionalGuardianEnabled: boolean;
  additionalGuardianName: string;
  additionalGuardianRelationship: '' | 'Mother' | 'Father' | 'Guardian';
  additionalGuardianEmail: string;
  additionalGuardianPhone: string;
  childName: string;
  childIdNumber: string;
  childDateOfBirth: string;
  childGender: 'BOY' | 'GIRL' | 'OTHER';
  currentGrade: string;
  childHasDisability: boolean;
  disabilityDetails: string;
};

export type StepTwo = {
  branchId: string;
  branchName: string;
  reason: string;
  schoolType: SchoolType;
  schoolStage: SchoolStage;
  preferredStartDate: string;
  enrollmentType: 'FULL_TIME' | 'PART_TIME';
  aftercareRequested: boolean;
  aftercareOption: '' | 'AD_HOC' | 'FULL_TIME' | 'PRIMARY_SCHOOL';
  transportRequested: boolean;
  transportRoute: string;
  previousSchool: string;
  previousSchoolPhone: string;
  referralSource:
    | ''
    | 'SOCIAL_MEDIA'
    | 'WORD_OF_MOUTH'
    | 'RADIO'
    | 'STREET_BOARDS'
    | 'WEBSITE'
    | 'VEHICLE_BRANDING'
    | 'OTHER';
  attendedPreschool: boolean;
  allergies: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  feePayerFirstName: string;
  feePayerLastName: string;
  feePayerTermsAccepted: boolean;
};

export type DocumentKind =
  | 'LEARNER_PHOTO'
  | 'BIRTH_CERTIFICATE'
  | 'PARENT_ID'
  | 'PARENT_ID_SECONDARY'
  | 'MEDICAL_AID'
  | 'CLINIC_CARD'
  | 'PROOF_OF_INCOME'
  | 'IMMUNIZATION_RECORD'
  | 'PROOF_OF_ADDRESS'
  | 'PREVIOUS_REPORT'
  | 'FEE_PAYER_ID'
  | 'PROOF_OF_PAYMENT';

export type DocumentReview = {
  id: string;
  kind: DocumentKind;
  originalName: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  reuploadRequestedAt: string | null;
};

type ApplicationValue = {
  stepOne: StepOne;
  stepTwo: StepTwo;
  applicationId: string | null;
  applicationToken: string | null;
  reference: string | null;
  documents: Partial<Record<DocumentKind, string>>;
  documentReviews: Partial<Record<DocumentKind, DocumentReview>>;
  paymentStatus: string;
  isAdditionalChild: boolean;
  setStepOne: (change: Partial<StepOne>) => void;
  setStepTwo: (change: Partial<StepTwo>) => void;
  loadBranches: () => Promise<Branch[]>;
  loadTeam: (branchId?: string) => Promise<TeamMember[]>;
  saveStepOne: () => Promise<void>;
  saveStepTwo: () => Promise<void>;
  uploadDocument: (kind: DocumentKind, source?: 'camera' | 'gallery' | 'files') => Promise<void>;
  refreshApplicationDocuments: () => Promise<void>;
  startPayfastPayment: () => Promise<string>;
  checkPayfastPayment: () => Promise<string>;
  submit: (enrolmentTermsAccepted: boolean, photoConsent: boolean) => Promise<void>;
  reset: () => Promise<void>;
  startAdditionalChild: () => Promise<void>;
  finishAdditionalChild: () => Promise<void>;
};

const initialStepOne: StepOne = {
  applicationType: 'NEW',
  parentName: '',
  parentEmail: '',
  parentPhone: '',
  relationship: '',
  additionalGuardianEnabled: false,
  additionalGuardianName: '',
  additionalGuardianRelationship: '',
  additionalGuardianEmail: '',
  additionalGuardianPhone: '',
  childName: '',
  childIdNumber: '',
  childDateOfBirth: '',
  childGender: 'BOY',
  currentGrade: 'Nursery',
  childHasDisability: false,
  disabilityDetails: '',
};

const initialStepTwo: StepTwo = {
  branchId: '',
  branchName: '',
  reason: '',
  schoolType: 'PRIVATE_PRESCHOOL',
  schoolStage: 'STAGE_1',
  preferredStartDate: '',
  enrollmentType: 'FULL_TIME',
  aftercareRequested: false,
  aftercareOption: '',
  transportRequested: false,
  transportRoute: '',
  previousSchool: '',
  previousSchoolPhone: '',
  referralSource: '',
  attendedPreschool: false,
  allergies: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  feePayerFirstName: '',
  feePayerLastName: '',
  feePayerTermsAccepted: false,
};

const ApplicationContext = createContext<ApplicationValue | null>(null);

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [stepOne, replaceStepOne] = useState<StepOne>({
    ...initialStepOne,
    parentName: user?.name ?? '',
    parentEmail: user?.email ?? '',
    parentPhone: user?.phone ?? '',
  });
  const [stepTwo, replaceStepTwo] = useState<StepTwo>(initialStepTwo);
  const stepTwoRef = useRef<StepTwo>(initialStepTwo);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationToken, setApplicationToken] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Partial<Record<DocumentKind, string>>>({});
  const [documentReviews, setDocumentReviews] = useState<
    Partial<Record<DocumentKind, DocumentReview>>
  >({});
  const [paymentStatus, setPaymentStatus] = useState('NOT_STARTED');
  const [isAdditionalChild, setIsAdditionalChild] = useState(false);

  const clearApplicationState = (parent = user) => {
    replaceStepOne({
      ...initialStepOne,
      parentName: parent?.name ?? '',
      parentEmail: parent?.email ?? '',
      parentPhone: parent?.phone ?? '',
    });
    stepTwoRef.current = initialStepTwo;
    replaceStepTwo(initialStepTwo);
    setApplicationId(null);
    setApplicationToken(null);
    setReference(null);
    setDocuments({});
    setDocumentReviews({});
    setPaymentStatus('NOT_STARTED');
  };

  useEffect(() => {
    AsyncStorage.getItem('mc_adding_child').then((value) => setIsAdditionalChild(value === 'true'));
    AsyncStorage.getItem('mc_application').then(async (stored) => {
      if (!stored) return;
      try {
        const draft = JSON.parse(stored) as {
          ownerId?: string;
          applicationId?: string;
          applicationToken?: string;
          reference?: string;
          stepOne?: Partial<StepOne>;
          stepTwo?: Partial<StepTwo>;
        };
        if (draft.stepOne) replaceStepOne((current) => ({ ...current, ...draft.stepOne }));
        if (draft.stepTwo) {
          const savedStepTwo = { ...initialStepTwo, ...draft.stepTwo };
          stepTwoRef.current = savedStepTwo;
          replaceStepTwo(savedStepTwo);
        }
        setApplicationId(draft.applicationId ?? null);
        setApplicationToken(draft.applicationToken ?? null);
        setReference(draft.reference ?? null);
        if (draft.applicationId && draft.applicationToken) {
          const saved = await apiData<
            StepOne & {
              reference: string;
              preferences?: Partial<StepTwo>;
              documents?: DocumentReview[];
            }
          >(`/applications/${draft.applicationId}`, { applicationToken: draft.applicationToken });
          replaceStepOne((current) => ({
            ...current,
            parentName: saved.parentName,
            parentEmail: saved.parentEmail,
            parentPhone: saved.parentPhone,
            relationship: saved.relationship,
            additionalGuardianEnabled: Boolean(saved.additionalGuardianName),
            additionalGuardianName: saved.additionalGuardianName ?? '',
            additionalGuardianRelationship: saved.additionalGuardianRelationship ?? '',
            additionalGuardianEmail: saved.additionalGuardianEmail ?? '',
            additionalGuardianPhone: saved.additionalGuardianPhone ?? '',
            childName: saved.childName,
            childIdNumber: saved.childIdNumber ?? '',
            childDateOfBirth: saved.childDateOfBirth,
            childGender: saved.childGender,
            currentGrade: saved.currentGrade,
            applicationType: saved.applicationType,
            childHasDisability: saved.childHasDisability,
            disabilityDetails: saved.disabilityDetails,
          }));
          if (saved.preferences) {
            const preferences = {
              ...initialStepTwo,
              ...saved.preferences,
              previousSchool: saved.preferences.previousSchool ?? '',
              previousSchoolPhone: saved.preferences.previousSchoolPhone ?? '',
              transportRoute: saved.preferences.transportRoute ?? '',
              aftercareOption: saved.preferences.aftercareOption ?? '',
            };
            stepTwoRef.current = preferences;
            replaceStepTwo(preferences);
          }
          setReference(saved.reference);
          if (saved.documents) {
            setDocuments(
              Object.fromEntries(saved.documents.map((document) => [document.kind, document.originalName])),
            );
            setDocumentReviews(
              Object.fromEntries(saved.documents.map((document) => [document.kind, document])),
            );
          }
        }
      } catch {
        // Keep the local application identifiers so a temporary API problem
        // does not discard a parent's submitted application.
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem('mc_application').then(async (stored) => {
      if (!stored) {
        clearApplicationState(user);
        return;
      }
      try {
        const draft = JSON.parse(stored) as { ownerId?: string };
        // Legacy drafts did not record an owner and cannot safely be reused.
        if (draft.ownerId !== user.id) {
          clearApplicationState(user);
          await AsyncStorage.removeItem('mc_application');
        }
      } catch {
        clearApplicationState(user);
        await AsyncStorage.removeItem('mc_application');
      }
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    replaceStepOne((current) => ({
      ...current,
      parentName: current.parentName || user.name,
      parentEmail: current.parentEmail || user.email,
      parentPhone: current.parentPhone || user.phone || '',
    }));
  }, [user]);

  const tenantQuery = () => {
    if (!environment.tenantId) throw new Error('EXPO_PUBLIC_TENANT_ID is not configured.');
    return `tenantId=${encodeURIComponent(environment.tenantId)}`;
  };

  const loadBranches = async () => {
    const items = await apiData<Branch[]>(`/branches?${tenantQuery()}&limit=100`);
    const seen = new Set<string>();
    return items
      .map((branch) => ({
        ...branch,
        name: branch.name.replace(/sky\s*city/gi, 'Sky City'),
      }))
      .filter((branch) => {
        const key = branch.name
          .toLowerCase()
          .replace(/\bbranch\b/g, '')
          .replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const loadTeam = (branchId?: string) =>
    apiData<TeamMember[]>(
      `/team?${tenantQuery()}&limit=100${branchId ? `&branchId=${encodeURIComponent(branchId)}` : ''}`,
    );

  const saveStepOne = async () => {
    if (!token || !user) throw new Error('Sign in before starting an application.');
    if (applicationId && applicationToken) {
      const updated = await apiData<{ id: string; reference: string }>(
        `/applications/${applicationId}`,
        {
          method: 'PUT',
          applicationToken,
          body: JSON.stringify(stepOne),
        },
      );
      setReference(updated.reference);
      return;
    }
    const result = await apiData<{
      application: { id: string; reference: string };
      accessToken: string;
    }>(`/applications?${tenantQuery()}`, {
      method: 'POST',
      token,
      body: JSON.stringify(stepOne),
    });
    setApplicationId(result.application.id);
    setApplicationToken(result.accessToken);
    setReference(result.application.reference);
    await AsyncStorage.setItem(
      'mc_application',
      JSON.stringify({
        ownerId: user.id,
        applicationId: result.application.id,
        applicationToken: result.accessToken,
        reference: result.application.reference,
      }),
    );
  };

  const requireApplication = () => {
    if (!applicationId || !applicationToken) {
      throw new Error('Complete the parent and child information first.');
    }
    return { applicationId, applicationToken };
  };

  const refreshApplicationDocuments = useCallback(async () => {
    if (!applicationId || !applicationToken) return;
    const saved = await apiData<{ documents?: DocumentReview[] }>(
      `/applications/${applicationId}`,
      { applicationToken, cacheTtlMs: 0, forceRefresh: true },
    );
    const latest = saved.documents ?? [];
    setDocuments(
      Object.fromEntries(latest.map((document) => [document.kind, document.originalName])),
    );
    setDocumentReviews(Object.fromEntries(latest.map((document) => [document.kind, document])));
  }, [applicationId, applicationToken]);

  const saveStepTwo = async () => {
    const { branchName: _branchName, ...storedPreferences } = stepTwoRef.current;
    const preferences = {
      ...storedPreferences,
      // Compatibility with older API deployments that required these fields.
      // The current API normalises the values back to NULL for a "No" answer.
      previousSchool: stepTwoRef.current.attendedPreschool
        ? stepTwoRef.current.previousSchool
        : 'Not applicable',
      previousSchoolPhone: stepTwoRef.current.attendedPreschool
        ? stepTwoRef.current.previousSchoolPhone
        : '0000000000',
      feePayerFirstName: stepTwoRef.current.feePayerFirstName.trim(),
      feePayerLastName: stepTwoRef.current.feePayerLastName.trim(),
      feePayerTermsAccepted: Boolean(stepTwoRef.current.feePayerTermsAccepted),
    };
    const application = requireApplication();
    const result = await apiData<{ saved: true; reference: string }>(
      `/applications/${application.applicationId}/preferences`,
      {
        method: 'PUT',
        applicationToken: application.applicationToken,
        body: JSON.stringify(preferences),
      },
    );
    setReference(result.reference);
    await AsyncStorage.mergeItem('mc_application', JSON.stringify({ reference: result.reference }));
  };

  const uploadDocument = async (
    kind: DocumentKind,
    source: 'camera' | 'gallery' | 'files' = 'files',
  ) => {
    const application = requireApplication();
    const ImagePicker = require('expo-image-picker');
    const FileSystem = require('expo-file-system/legacy');
    let file: { uri: string; name: string; mimeType?: string | null; size?: number } | null = null;
    if (source === 'files') {
      const DocumentPicker = require('expo-document-picker');
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled) return;
      file = picked.assets[0];
    } else {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          `Allow ${source === 'camera' ? 'camera' : 'photo library'} access to upload this image.`,
        );
      const picked =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      file = {
        uri: asset.uri,
        name: asset.fileName || `${kind.toLowerCase()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      };
    }
    if (!file) return;
    if (file.size && file.size > 8 * 1024 * 1024) {
      throw new Error('Documents must be smaller than 8 MB.');
    }
    const mimeType =
      file.mimeType === 'image/png'
        ? 'image/png'
        : file.mimeType === 'image/jpeg' || file.mimeType === 'image/jpg'
          ? 'image/jpeg'
          : 'application/pdf';
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    try {
      await apiData<{ id: string }>(`/applications/${application.applicationId}/documents`, {
        method: 'POST',
        applicationToken: application.applicationToken,
        body: JSON.stringify({
          kind,
          originalName: file.name,
          mimeType,
          fileData: `data:${mimeType};base64,${base64}`,
        }),
      });
    } catch (error) {
      if (
        kind === 'PARENT_ID_SECONDARY' &&
        error instanceof Error &&
        /invalid option|PARENT_ID_SECONDARY/i.test(error.message)
      ) {
        throw new Error(
          'The second-parent ID upload needs the latest server update. Please try again after the dashboard deployment completes.',
        );
      }
      throw error;
    }
    setDocuments((current) => ({ ...current, [kind]: file!.name }));
    setDocumentReviews((current) => ({
      ...current,
      [kind]: {
        id: current[kind]?.id ?? '',
        kind,
        originalName: file!.name,
        reviewStatus: 'PENDING',
        rejectionReason: null,
        reuploadRequestedAt: null,
      },
    }));
  };

  const checkPayfastPayment = async () => {
    const application = requireApplication();
    const result = await apiData<{ status: string }>(
      `/applications/${application.applicationId}/payments/payfast`,
      {
        applicationToken: application.applicationToken,
        cacheTtlMs: 0,
        forceRefresh: true,
      },
    );
    setPaymentStatus(result.status);
    return result.status;
  };

  const startPayfastPayment = async () => {
    await saveStepTwo();
    const application = requireApplication();
    const returnUrl = Linking.createURL('payment/return');
    const result = await apiData<{ checkoutUrl: string; status: string }>(
      `/applications/${application.applicationId}/payments/payfast`,
      {
        method: 'POST',
        applicationToken: application.applicationToken,
        body: JSON.stringify({ returnUrl }),
      },
    );
    setPaymentStatus(result.status);
    return result.checkoutUrl;
  };

  const submit = async (enrolmentTermsAccepted: boolean, photoConsent: boolean) => {
    const application = requireApplication();
    const result = await apiData<{ reference: string }>(
      `/applications/${application.applicationId}/submit`,
      {
        method: 'POST',
        applicationToken: application.applicationToken,
        body: JSON.stringify({
          informationAccurate: true,
          privacyAccepted: true,
          termsAccepted: true,
          enrolmentTermsAccepted,
          photoConsent,
          submit: true,
        }),
      },
    );
    console.log('Submit response:', result);
    setReference(result.reference);
  };

  const reset = async () => {
    clearApplicationState();
    setIsAdditionalChild(false);
    await AsyncStorage.multiRemove(['mc_application', 'mc_adding_child']);
  };

  const startAdditionalChild = async () => {
    clearApplicationState(user);
    setIsAdditionalChild(true);
    await AsyncStorage.multiRemove(['mc_application', 'mc_onboarding_route']);
    await AsyncStorage.setItem('mc_adding_child', 'true');
  };

  const finishAdditionalChild = async () => {
    clearApplicationState(user);
    setIsAdditionalChild(false);
    await AsyncStorage.multiRemove(['mc_application', 'mc_adding_child', 'mc_onboarding_route']);
  };

  const value = useMemo<ApplicationValue>(
    () => ({
      stepOne,
      stepTwo,
      applicationId,
      applicationToken,
      reference,
      documents,
      documentReviews,
      paymentStatus,
      isAdditionalChild,
      setStepOne: (change) =>
        replaceStepOne((current) => {
          const next = { ...current, ...change };
          if (user)
            void AsyncStorage.mergeItem(
              'mc_application',
              JSON.stringify({ ownerId: user.id, stepOne: next }),
            );
          return next;
        }),
      setStepTwo: (change) =>
        replaceStepTwo((current) => {
          const next = { ...current, ...change };
          stepTwoRef.current = next;
          if (user)
            void AsyncStorage.mergeItem(
              'mc_application',
              JSON.stringify({ ownerId: user.id, stepTwo: next }),
            );
          return next;
        }),
      loadBranches,
      loadTeam,
      saveStepOne,
      saveStepTwo,
      uploadDocument,
      refreshApplicationDocuments,
      startPayfastPayment,
      checkPayfastPayment,
      submit,
      reset,
      startAdditionalChild,
      finishAdditionalChild,
    }),
    [
      stepOne,
      stepTwo,
      applicationId,
      applicationToken,
      reference,
      documents,
      documentReviews,
      refreshApplicationDocuments,
      paymentStatus,
      isAdditionalChild,
      token,
      user,
    ],
  );

  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>;
}

export function useApplication() {
  const value = useContext(ApplicationContext);
  if (!value) throw new Error('useApplication must be inside ApplicationProvider');
  return value;
}
