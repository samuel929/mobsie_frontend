export const SCHOOL_TYPES = ['PRIVATE_PRESCHOOL', 'CHILD_DAY_CARE', 'NPO_PRESCHOOL'] as const;

export const SCHOOL_STAGES = ['STAGE_1', 'STAGE_2', 'STAGE_3', 'STAGE_4', 'GRADE_R'] as const;

export type SchoolType = (typeof SCHOOL_TYPES)[number];
export type SchoolStage = (typeof SCHOOL_STAGES)[number];

export type StageDetail = {
  label: string;
  gradeCode: string;
  ageRange: string;
  className: string;
};

/** Grade-to-stage mapping from the 2026 Mobsie Kids curriculum alignment. */
export const STAGE_DETAILS: Record<SchoolStage, StageDetail> = {
  STAGE_1: { label: 'Stage 1', gradeCode: '0000', ageRange: '6–18 months', className: 'Bambino Class' },
  STAGE_2: { label: 'Stage 2', gradeCode: '000', ageRange: '2–3 years', className: 'Shapes Class' },
  STAGE_3: { label: 'Stage 3', gradeCode: '00', ageRange: '3–4 years', className: 'Colours Class' },
  STAGE_4: { label: 'Stage 4', gradeCode: '0', ageRange: '4–5 years', className: 'Alphabets Class' },
  GRADE_R: { label: 'Grade R', gradeCode: 'R', ageRange: '5–6 years', className: 'Numbers Class' },
};

type Offering = {
  included: boolean;
  text: string;
};

export type SchoolPackage = {
  label: string;
  packageName: string;
  applicationFeeCents: number;
  acceptanceFeeCents: number;
  stageFeesCents: Record<SchoolStage, number>;
  offerings: Offering[];
};

export const STAGE_LABELS: Record<SchoolStage, string> = {
  STAGE_1: 'Stage 1 · Bambino',
  STAGE_2: 'Stage 2 · Shapes',
  STAGE_3: 'Stage 3 · Colours',
  STAGE_4: 'Stage 4 · Alphabets',
  GRADE_R: 'Grade R · Numbers',
};

const branchCodes: Record<string, string> = {
  soshanguve: 'S1', mamelodi: 'M1', thembisa: 'T1', tembisa: 'T1',
  skycity: 'SC1', hebron: 'H1', soweto: 'S2', cosmocity: 'C1',
};

export function branchCode(branchName: string) {
  const normalized = normalize(branchName);
  const key = Object.keys(branchCodes).find((candidate) => normalized.includes(candidate));
  return key ? branchCodes[key] : normalized.slice(0, 4).toUpperCase();
}

export function stageDisplay(stage: SchoolStage) {
  const item = STAGE_DETAILS[stage];
  return `${item.label} · ${item.className} · ${item.ageRange} (Grade ${item.gradeCode})`;
}

export const SCHOOL_FEES_BANKING = {
  bank: 'FNB',
  accountName: 'Mobsie Kids',
  accountsByBranchCode: {
    S1: '63115075920', S2: '63115075920', M1: '63114977036',
    C1: '63115074394', SC1: '63115075508',
  } as Record<string, string>,
  referenceHint: 'Use the child reference number or full name as payment reference.',
  supportPhone: '065 737 8254',
  supportEmail: 'operations@mobsiekids.co.za',
} as const;

export const UNIFORM_BANKING = {
  bank: 'ABSA', accountName: 'Mobsie Kids', accountNumber: '4103226260',
  referenceHint: 'Use the child reference number or full name as payment reference.',
  supportPhone: '065 737 8254', supportEmail: 'operations@mobsiekids.co.za',
} as const;

export const TRANSPORT_BANKING = {
  bank: 'ABSA', accountName: 'Mobsie Properties', accountNumber: '4103226260',
  referenceHint: 'Use the child reference number or full name as payment reference.',
  supportPhone: '063 704 6734', supportEmail: 'operations@mobsiekids.co.za',
} as const;

export function bankingForBranch(branchName?: string) {
  const code = branchName ? branchCode(branchName) : '';
  return { ...SCHOOL_FEES_BANKING, branchCode: code, accountNumber: SCHOOL_FEES_BANKING.accountsByBranchCode[code] ?? null };
}

export const SCHOOL_PACKAGES: Record<SchoolType, SchoolPackage> = {
  PRIVATE_PRESCHOOL: {
    label: 'Private Preschool',
    packageName: 'Hassle Free Package',
    applicationFeeCents: 50_000,
    acceptanceFeeCents: 130_000,
    stageFeesCents: {
      STAGE_1: 185_000,
      STAGE_2: 185_000,
      STAGE_3: 175_000,
      STAGE_4: 170_000,
      GRADE_R: 170_000,
    },
    offerings: [
      { included: true, text: 'Uniform starter pack included' },
      { included: true, text: 'Breakfast, lunch and snacks included' },
      { included: true, text: 'Toiletries and detergents included' },
      { included: true, text: 'All stationery included' },
      { included: true, text: 'Swimming, e-learning, gardening, yoga and chess' },
      { included: true, text: 'Birthday cake and party pack included' },
      { included: false, text: 'Field trips and transport are not included' },
    ],
  },
  CHILD_DAY_CARE: {
    label: 'Child Day Care',
    packageName: 'Essential Care Package',
    applicationFeeCents: 95_000,
    acceptanceFeeCents: 0,
    stageFeesCents: {
      STAGE_1: 100_000,
      STAGE_2: 95_000,
      STAGE_3: 95_000,
      STAGE_4: 90_000,
      GRADE_R: 90_000,
    },
    offerings: [
      { included: false, text: 'Uniform is not included' },
      { included: false, text: 'Parents provide daily meals and snacks' },
      { included: false, text: 'Toiletries and detergents are not included' },
      { included: false, text: 'Stationery is not included' },
      { included: false, text: 'Birthday package is not included' },
      { included: false, text: 'Field trips and transport are not included' },
    ],
  },
  NPO_PRESCHOOL: {
    label: 'NPO Preschool',
    packageName: 'Standard Package',
    applicationFeeCents: 55_000,
    acceptanceFeeCents: 0,
    stageFeesCents: {
      STAGE_1: 85_000,
      STAGE_2: 80_000,
      STAGE_3: 80_000,
      STAGE_4: 75_000,
      GRADE_R: 75_000,
    },
    offerings: [
      { included: true, text: 'Breakfast and lunch included; snacks excluded' },
      { included: true, text: 'Toiletries and detergents included' },
      { included: true, text: 'Extra-mural activities included' },
      { included: false, text: 'Uniform is not included' },
      { included: false, text: 'Stationery is not included' },
      { included: false, text: 'Birthday package is not included' },
      { included: false, text: 'Field trips and transport are not included' },
    ],
  },
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');

export function availableSchoolTypes(branchName: string): SchoolType[] {
  const branch = normalize(branchName);
  if (branch.includes('hebron')) return ['NPO_PRESCHOOL'];
  if (branch.includes('soweto') || branch.includes('tembisa') || branch.includes('thembisa')) {
    return ['PRIVATE_PRESCHOOL'];
  }
  return ['PRIVATE_PRESCHOOL', 'CHILD_DAY_CARE'];
}

export function formatZar(cents: number) {
  return `R ${new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)}`;
}

export function packagePrice(schoolType: SchoolType, stage: SchoolStage) {
  const schoolPackage = SCHOOL_PACKAGES[schoolType];
  return {
    applicationFeeCents: schoolPackage.applicationFeeCents,
    acceptanceFeeCents: schoolPackage.acceptanceFeeCents,
    monthlyFeeCents: schoolPackage.stageFeesCents[stage],
  };
}
