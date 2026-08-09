export interface DeliveryMilestone {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  owner: string;
  status: 'Complete' | 'On track' | 'Scheduled';
  comment?: string;
}

/** Imported from "Mobsie Kids Timing Plan 14.07.2026 - App Team.xlsx". */
export const deliveryMilestones: DeliveryMilestone[] = [
  {
    id: 'presentation',
    title: 'Presentation to Mr Yaw',
    startDate: '2026-07-08',
    endDate: '2026-07-08',
    owner: 'IH',
    status: 'Complete',
  },
  {
    id: 'creative',
    title: 'Creative Amendments',
    startDate: '2026-07-09',
    endDate: '2026-07-14',
    owner: 'IH',
    status: 'Complete',
  },
  {
    id: 'assets',
    title: 'Dispatch App Assets to Developer',
    startDate: '2026-07-14',
    endDate: '2026-07-14',
    owner: 'IH',
    status: 'Complete',
  },
  {
    id: 'phase-1',
    title: 'App Development – Phase 1',
    startDate: '2026-07-14',
    endDate: '2026-07-19',
    owner: 'IH',
    status: 'On track',
  },
  {
    id: 'developer-presentation',
    title: 'Developer Presentation',
    startDate: '2026-07-20',
    endDate: '2026-07-20',
    owner: 'App Developer',
    status: 'Scheduled',
    comment: 'Time TBC',
  },
  {
    id: 'phase-2',
    title: 'App Development – Phase 2',
    startDate: '2026-07-20',
    endDate: '2026-07-26',
    owner: 'App Developer',
    status: 'Scheduled',
  },
  {
    id: 'final-presentation',
    title: 'Final Developer Presentation',
    startDate: '2026-07-27',
    endDate: '2026-07-27',
    owner: 'App Developer',
    status: 'Scheduled',
    comment: 'Time TBC',
  },
  {
    id: 'launch',
    title: 'App Launch',
    startDate: '2026-08-01',
    endDate: '2026-08-01',
    owner: 'App Developer',
    status: 'Scheduled',
    comment: 'TBC',
  },
];

export const appChecklist = [
  'Logo',
  'Landing Page',
  'Contact Details',
  'Branches',
  'Our Story',
  'Our Team',
  'Gallery',
  'App Look & Feel',
  'Enrollment & Payments',
  'Day-to-day Communications',
  'Shop',
  'Activity Planner',
  'Quarterly Reports',
  'Emergency Information',
  'Attendance Register',
  'Newsletter',
  'Consent Forms',
  'Feedback Channels',
] as const;
