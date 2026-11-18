export const SCHOOL_TYPES = ['PRIVATE_PRESCHOOL', 'CHILD_DAY_CARE', 'NPO_PRESCHOOL'] as const;

export const SCHOOL_STAGES = ['STAGE_1', 'STAGE_2', 'STAGE_3', 'STAGE_4', 'GRADE_R'] as const;

export type SchoolType = (typeof SCHOOL_TYPES)[number];
export type SchoolStage = (typeof SCHOOL_STAGES)[number];

/** The admissions stages used consistently by the mobile app and dashboard. */
export const STAGE_DETAILS: Record<
  SchoolStage,
  {
    label: string;
    grade: string;
    ageBand: string;
    cutoffDate: string;
    description: string;
    className: string;
  }
> = {
  STAGE_1: {
    label: 'Stage 1',
    grade: '0000',
    ageBand: '6–18 months',
    cutoffDate: '30 June',
    description: 'Age 6 months, turning 18 months by 30 June in the year of admission.',
    className: 'Bambino Class',
  },
  STAGE_2: {
    label: 'Stage 2',
    grade: '000',
    ageBand: '2–3 years',
    cutoffDate: '30 June',
    description: 'Age 2 years, turning 3 years by 30 June in the year of admission.',
    className: 'Shape Class',
  },
  STAGE_3: {
    label: 'Stage 3',
    grade: '00',
    ageBand: '3–4 years',
    cutoffDate: '30 June',
    description: 'Age 3 years, turning 4 years by 30 June in the year of admission.',
    className: 'Colours Class',
  },
  STAGE_4: {
    label: 'Stage 4',
    grade: '0',
    ageBand: '4–5 years',
    cutoffDate: '30 June',
    description: 'Age 4 years, turning 5 years by 30 June in the year of admission.',
    className: 'Alphabet Class',
  },
  GRADE_R: {
    label: 'Grade R',
    grade: 'R',
    ageBand: '5–6 years',
    cutoffDate: '30 June',
    description: 'Age 5 years, turning 6 years by 30 June in the year of admission.',
    className: 'Numbers Class',
  },
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

type BranchFeeStructure = {
  applicationFeeCents: number;
  annualFeesCents: Record<SchoolStage, number>;
  monthlyFeesCents: Record<SchoolStage, number>;
  siblingMonthlyFeesCents: Record<SchoolStage, number>;
};

/** Official 2027 aftercare fees for Hebron, Soshanguve and Mamelodi. */
export const AFTERCARE_FEES_2027 = {
  adHoc: {
    halfHourCents: 5_000,
    hourlyCents: 8_000,
    paymentNote: 'Paid directly to the teachers',
  },
  fullTime: {
    monthlyFeeCents: 70_000,
    hours: '17:00–18:00',
    paymentNote: 'Paid into the school bank account',
  },
  primarySchool: {
    afternoonFeeCents: 15_000,
    monthlyFeeCents: 80_000,
    paymentNote: 'Includes lunch and homework assistance',
  },
} as const;

/** Official Soshanguve 2027 transport fees. Sibling values are as published. */
export const SOSHANGUVE_TRANSPORT_FEES_2027 = [
  { location: 'Ext 1', monthlyFeeCents: 80_000, siblingFeeCents: 145_000 },
  { location: 'Ext 2', monthlyFeeCents: 90_000, siblingFeeCents: 160_000 },
  { location: 'Ext 10', monthlyFeeCents: 90_000, siblingFeeCents: 160_000 },
  { location: 'Block VV', monthlyFeeCents: 55_000, siblingFeeCents: 95_000 },
  { location: 'Block L, K, M', monthlyFeeCents: 70_000, siblingFeeCents: 125_000 },
  { location: 'Block XX', monthlyFeeCents: 70_000, siblingFeeCents: 125_000 },
  { location: 'Mabopane', monthlyFeeCents: 90_000, siblingFeeCents: 165_000 },
  { location: 'Itsoseng', monthlyFeeCents: 95_000, siblingFeeCents: 175_000 },
  { location: 'Hebron', monthlyFeeCents: 100_000, siblingFeeCents: 180_000 },
  { location: 'Block H', monthlyFeeCents: 95_000, siblingFeeCents: 175_000 },
  { location: 'Extension', monthlyFeeCents: 80_000, siblingFeeCents: 145_000 },
  { location: 'Block UU, WW', monthlyFeeCents: 65_000, siblingFeeCents: 120_000 },
] as const;

/** Official 2027 fee structures supplied by Mobsie Kids. */
const BRANCH_FEES_2027: Record<'mamelodi' | 'soshanguve' | 'hebron', BranchFeeStructure> = {
  mamelodi: {
    applicationFeeCents: 95_000,
    monthlyFeesCents: {
      STAGE_1: 150_000,
      STAGE_2: 130_000,
      STAGE_3: 130_000,
      STAGE_4: 110_000,
      GRADE_R: 110_000,
    },
    annualFeesCents: {
      STAGE_1: 1_450_000,
      STAGE_2: 1_285_000,
      STAGE_3: 1_285_000,
      STAGE_4: 1_050_000,
      GRADE_R: 1_050_000,
    },
    siblingMonthlyFeesCents: {
      STAGE_1: 135_000,
      STAGE_2: 120_000,
      STAGE_3: 120_000,
      STAGE_4: 100_000,
      GRADE_R: 100_000,
    },
  },
  soshanguve: {
    applicationFeeCents: 95_000,
    monthlyFeesCents: {
      STAGE_1: 220_000,
      STAGE_2: 220_000,
      STAGE_3: 210_000,
      STAGE_4: 210_000,
      GRADE_R: 205_000,
    },
    annualFeesCents: {
      STAGE_1: 2_180_000,
      STAGE_2: 2_180_000,
      STAGE_3: 2_105_000,
      STAGE_4: 2_105_000,
      GRADE_R: 2_100_000,
    },
    siblingMonthlyFeesCents: {
      STAGE_1: 205_000,
      STAGE_2: 205_000,
      STAGE_3: 195_000,
      STAGE_4: 195_000,
      GRADE_R: 190_000,
    },
  },
  hebron: {
    applicationFeeCents: 95_000,
    monthlyFeesCents: {
      STAGE_1: 120_000,
      STAGE_2: 110_000,
      STAGE_3: 110_000,
      STAGE_4: 100_000,
      GRADE_R: 100_000,
    },
    annualFeesCents: {
      STAGE_1: 1_150_000,
      STAGE_2: 1_050_000,
      STAGE_3: 1_050_000,
      STAGE_4: 950_000,
      GRADE_R: 950_000,
    },
    siblingMonthlyFeesCents: {
      STAGE_1: 105_000,
      STAGE_2: 95_000,
      STAGE_3: 95_000,
      STAGE_4: 85_000,
      GRADE_R: 85_000,
    },
  },
};

export const STAGE_LABELS: Record<SchoolStage, string> = {
  STAGE_1: STAGE_DETAILS.STAGE_1.label,
  STAGE_2: STAGE_DETAILS.STAGE_2.label,
  STAGE_3: STAGE_DETAILS.STAGE_3.label,
  STAGE_4: STAGE_DETAILS.STAGE_4.label,
  GRADE_R: STAGE_DETAILS.GRADE_R.label,
};

export function stageOptionLabel(stage: SchoolStage) {
  const detail = STAGE_DETAILS[stage];
  return `${detail.label} · Grade ${detail.grade} · ${detail.ageBand}`;
}

export const SCHOOL_PACKAGES: Record<SchoolType, SchoolPackage> = {
  PRIVATE_PRESCHOOL: {
    label: 'Grade A School',
    packageName: 'Grade A School',
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
      { included: true, text: 'Breakfast, lunch and snacks included' },
      { included: true, text: 'Toiletries and detergents included' },
      { included: true, text: 'All stationery included' },
      { included: true, text: 'Swimming, e-learning, gardening, yoga and chess' },
      { included: true, text: 'Birthday cake and party pack included' },
    ],
  },
  CHILD_DAY_CARE: {
    label: 'Grade B School',
    packageName: 'Grade B School',
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
      { included: false, text: 'Parents provide daily meals and snacks' },
      { included: false, text: 'Toiletries and detergents are not included' },
      { included: false, text: 'Stationery is not included' },
      { included: false, text: 'Birthday package is not included' },
    ],
  },
  NPO_PRESCHOOL: {
    label: 'Grade B School',
    packageName: 'Grade B School',
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
      { included: false, text: 'Stationery is not included' },
      { included: false, text: 'Birthday package is not included' },
    ],
  },
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');

export function hasOfficialAftercareFees(branchName: string) {
  const branch = normalize(branchName);
  return ['hebron', 'soshanguve', 'mamelodi'].some((name) => branch.includes(name));
}

export function hasSoshanguveTransportFees(branchName: string) {
  return normalize(branchName).includes('soshanguve');
}

/**
 * School grading is branch based, not a choice made by the parent.
 * Soshanguve is the only Grade A school for now; every other campus is Grade B.
 */
export function schoolTypeForBranch(branchName: string): SchoolType {
  return normalize(branchName).includes('soshanguve') ? 'PRIVATE_PRESCHOOL' : 'CHILD_DAY_CARE';
}

function branchFees(branchName: string) {
  const branch = normalize(branchName);
  const key = (Object.keys(BRANCH_FEES_2027) as Array<keyof typeof BRANCH_FEES_2027>).find(
    (candidate) => branch.includes(candidate),
  );
  return key ? BRANCH_FEES_2027[key] : null;
}

export function publicFeeStructure(branchName: string) {
  const fees = branchFees(branchName);
  if (!fees) return null;
  return SCHOOL_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    monthlyFeeCents: fees.monthlyFeesCents[stage],
    annualFeeCents: fees.annualFeesCents[stage],
    siblingMonthlyFeeCents: fees.siblingMonthlyFeesCents[stage],
  }));
}

export function availableSchoolTypes(branchName: string): SchoolType[] {
  return [schoolTypeForBranch(branchName)];
}

/** Campus-specific inclusions published with the official fee structure. */
export function offeringsForBranch(schoolType: SchoolType, branchName = ''): Offering[] {
  if (normalize(branchName).includes('mamelodi')) {
    return [
      { included: true, text: 'Breakfast and lunch included' },
      { included: true, text: 'Stationery included' },
      { included: true, text: 'Extra-mural activities included' },
      { included: true, text: 'Toiletries and detergents included' },
      { included: true, text: 'Birthday cake, decorations and party packs included' },
      { included: false, text: 'Uniform is not included' },
      { included: false, text: 'Field trips are not included' },
      { included: false, text: 'Transport is not included' },
    ];
  }
  return SCHOOL_PACKAGES[schoolType].offerings;
}

export function formatZar(cents: number) {
  return `R ${new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)}`;
}

export function packagePrice(schoolType: SchoolType, stage: SchoolStage, branchName = '') {
  const schoolPackage = SCHOOL_PACKAGES[schoolType];
  const official2027 = branchFees(branchName);
  return {
    // The package tables are the previously supplied 2026 figures. Only a
    // matched branch fee table may be presented as the official 2027 rate.
    feeYear: official2027 ? 2027 : 2026,
    applicationFeeCents: official2027?.applicationFeeCents ?? schoolPackage.applicationFeeCents,
    acceptanceFeeCents: official2027 ? 0 : schoolPackage.acceptanceFeeCents,
    monthlyFeeCents: official2027?.monthlyFeesCents[stage] ?? schoolPackage.stageFeesCents[stage],
    annualFeeCents: official2027?.annualFeesCents[stage] ?? null,
    siblingMonthlyFeeCents: official2027?.siblingMonthlyFeesCents[stage] ?? null,
  };
}
