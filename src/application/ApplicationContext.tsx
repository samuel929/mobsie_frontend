import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

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
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  relationship: 'Mother' | 'Father' | 'Guardian' | 'Other';
  childName: string;
  childDateOfBirth: string;
  childGender: 'BOY' | 'GIRL' | 'OTHER';
  currentGrade: string;
};

export type StepTwo = {
  branchId: string;
  reason: string;
  schoolType: SchoolType;
  schoolStage: SchoolStage;
  preferredStartDate: string;
  enrollmentType: 'FULL_TIME' | 'PART_TIME';
  previousSchool: string;
  previousSchoolPhone: string;
  referralSource: 'SOCIAL_MEDIA' | 'WORD_OF_MOUTH' | 'RADIO';
  attendedPreschool: boolean;
  allergies: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type DocumentKind =
  | 'BIRTH_CERTIFICATE'
  | 'IMMUNIZATION_RECORD'
  | 'PARENT_ID'
  | 'PARENT_ID_SECONDARY'
  | 'PROOF_OF_ADDRESS'
  | 'PREVIOUS_REPORT'
  | 'LEARNER_PHOTO'
  | 'CLINIC_CARD'
  | 'PROOF_OF_INCOME';

type ApplicationValue = {
  stepOne: StepOne;
  stepTwo: StepTwo;
  applicationId: string | null;
  applicationToken: string | null;
  reference: string | null;
  documents: Partial<Record<DocumentKind, string>>;
  setStepOne: (change: Partial<StepOne>) => void;
  setStepTwo: (change: Partial<StepTwo>) => void;
  loadBranches: () => Promise<Branch[]>;
  loadTeam: (branchId?: string) => Promise<TeamMember[]>;
  saveStepOne: () => Promise<void>;
  saveStepTwo: () => Promise<void>;
  uploadDocument: (kind: DocumentKind) => Promise<void>;
  submit: () => Promise<void>;
  reset: () => Promise<void>;
};

const initialStepOne: StepOne = {
  parentName: '',
  parentEmail: '',
  parentPhone: '',
  relationship: 'Mother',
  childName: '',
  childDateOfBirth: '',
  childGender: 'BOY',
  currentGrade: 'Stage 1 · Bambino Class · 6–18 months (Grade 0000)',
};

const initialStepTwo: StepTwo = {
  branchId: '',
  reason: '',
  schoolType: 'PRIVATE_PRESCHOOL',
  schoolStage: 'STAGE_1',
  preferredStartDate: '',
  enrollmentType: 'FULL_TIME',
  previousSchool: '',
  previousSchoolPhone: '',
  referralSource: 'SOCIAL_MEDIA',
  attendedPreschool: false,
  allergies: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
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
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationToken, setApplicationToken] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Partial<Record<DocumentKind, string>>>({});

  const clearApplicationState = (parent = user) => {
    replaceStepOne({
      ...initialStepOne,
      parentName: parent?.name ?? '',
      parentEmail: parent?.email ?? '',
      parentPhone: parent?.phone ?? '',
    });
    replaceStepTwo(initialStepTwo);
    setApplicationId(null);
    setApplicationToken(null);
    setReference(null);
    setDocuments({});
  };

  useEffect(() => {
    AsyncStorage.getItem('mc_application').then((stored) => {
      if (!stored) return;
      try {
        const draft = JSON.parse(stored) as {
          ownerId?: string;
          applicationId?: string;
          applicationToken?: string;
          reference?: string;
        };
        setApplicationId(draft.applicationId ?? null);
        setApplicationToken(draft.applicationToken ?? null);
        setReference(draft.reference ?? null);
      } catch {
        AsyncStorage.removeItem('mc_application');
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

  const loadBranches = () => apiData<Branch[]>(`/branches?${tenantQuery()}&limit=100`);
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

  const saveStepTwo = async () => {
    const application = requireApplication();
    const result = await apiData<{ saved: true; reference: string }>(
      `/applications/${application.applicationId}/preferences`,
      {
        method: 'PUT',
        applicationToken: application.applicationToken,
        body: JSON.stringify(stepTwo),
      },
    );
    setReference(result.reference);
    await AsyncStorage.mergeItem('mc_application', JSON.stringify({ reference: result.reference }));
  };

  const uploadDocument = async (kind: DocumentKind) => {
    const application = requireApplication();
    // Required dynamically so Expo web can still bundle when native selection is unused.
    const DocumentPicker = require('expo-document-picker');
    const FileSystem = require('expo-file-system/legacy');
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) return;
    const file = picked.assets[0];
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
    setDocuments((current) => ({ ...current, [kind]: file.name }));
  };

  const submit = async () => {
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
          submit: true,
        }),
      },
    );
    setReference(result.reference);
  };

  const reset = async () => {
    clearApplicationState();
    await AsyncStorage.removeItem('mc_application');
  };

  const value = useMemo<ApplicationValue>(
    () => ({
      stepOne,
      stepTwo,
      applicationId,
      applicationToken,
      reference,
      documents,
      setStepOne: (change) => replaceStepOne((current) => ({ ...current, ...change })),
      setStepTwo: (change) => replaceStepTwo((current) => ({ ...current, ...change })),
      loadBranches,
      loadTeam,
      saveStepOne,
      saveStepTwo,
      uploadDocument,
      submit,
      reset,
    }),
    [stepOne, stepTwo, applicationId, applicationToken, reference, documents, token, user],
  );

  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>;
}

export function useApplication() {
  const value = useContext(ApplicationContext);
  if (!value) throw new Error('useApplication must be inside ApplicationProvider');
  return value;
}
