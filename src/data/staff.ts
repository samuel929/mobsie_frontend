export interface StaffMember {
  id: string;
  name: string;
  role: string;
  location: 'Hebron' | 'Soshanguve' | 'Mamelodi' | 'Skycity';
}

/** Imported from "Our team - Mobsie Kids updated .xlsx" on 2026-07-15. */
export const staffMembers: StaffMember[] = [
  {
    id: 'semakaleng-laka',
    name: 'Semakaleng Laka',
    role: 'Branch Principal & Driver',
    location: 'Hebron',
  },
  {
    id: 'ellen-sepeng',
    name: 'Ellen Sepeng',
    role: 'Kitchen Support & Teacher Assistant',
    location: 'Hebron',
  },
  {
    id: 'natasha',
    name: 'Natasha',
    role: 'Guardian Teacher',
    location: 'Hebron',
  },
  {
    id: 'tumisanf-ntshabele',
    name: 'Tumisanf Ntshabele',
    role: 'Mentor – President of the NPO',
    location: 'Hebron',
  },
  {
    id: 'eutricia-mokoena',
    name: 'Eutricia Mokoena',
    role: 'Branch Principal & Guardian Teacher',
    location: 'Soshanguve',
  },
  {
    id: 'mmule-mudawe',
    name: 'Mmule Mudawe',
    role: 'Guardian Teacher',
    location: 'Soshanguve',
  },
  {
    id: 'constance-mpeki',
    name: 'Constance Mpeki',
    role: 'Kitchen Support & Teacher Assistant',
    location: 'Soshanguve',
  },
  {
    id: 'boledi-maja',
    name: 'Boledi Maja',
    role: 'Teacher Assistant & Driver',
    location: 'Soshanguve',
  },
  {
    id: 'tebogo-nonyane',
    name: 'Tebogo Nonyane',
    role: 'Guardian Teacher',
    location: 'Soshanguve',
  },
  {
    id: 'juliet-baloyi',
    name: 'Juliet Baloyi',
    role: 'Guardian Teacher',
    location: 'Soshanguve',
  },
  {
    id: 'palesa-ramapulana',
    name: 'Palesa Ramapulana',
    role: 'Branch Principal & Guardian Teacher',
    location: 'Mamelodi',
  },
  {
    id: 'johana-pitseng',
    name: 'Johana Pitseng',
    role: 'Guardian Teacher',
    location: 'Mamelodi',
  },
  {
    id: 'moipoine-pilane',
    name: 'Moipoine Pilane',
    role: 'Assistant Teacher',
    location: 'Mamelodi',
  },
  {
    id: 'pauline-selatile',
    name: 'Pauline Selatile',
    role: 'Kitchen Support',
    location: 'Mamelodi',
  },
  {
    id: 'peggy-modipedi',
    name: 'Peggy Modipedi',
    role: 'Branch Principal',
    location: 'Skycity',
  },
  {
    id: 'thuli-mngomezulu',
    name: 'Thuli Mngomezulu',
    role: 'Kitchen Support & Teacher Assistant',
    location: 'Skycity',
  },
  {
    id: 'nonhlanhla-nxumalo',
    name: 'Nonhlanhla Nxumalo',
    role: 'Guardian Teacher',
    location: 'Skycity',
  },
  {
    id: 'nkateko-kgosana',
    name: 'Nkateko Kgosana',
    role: 'Teacher Assistant',
    location: 'Skycity',
  },
];

export const staffLocations = ['Hebron', 'Soshanguve', 'Mamelodi', 'Skycity'] as const;
