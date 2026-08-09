import { colors } from '../theme';

export const dailyActivities = [
  {
    time: '07:00',
    title: 'Drop-off',
    detail: 'Prince arrived and joined free play.',
    icon: 'car',
    color: colors.green2,
  },
  {
    time: '08:00',
    title: 'Morning Assembly',
    detail: 'Songs, greetings and the weather chart.',
    icon: 'sunny',
    color: colors.blue,
  },
  {
    time: '09:00',
    title: 'Mathematics',
    detail: 'Counting objects from 1 to 20.',
    icon: 'calculator',
    color: colors.purple,
  },
  {
    time: '10:30',
    title: 'Snack Break',
    detail: 'Fruit, yoghurt and water.',
    icon: 'nutrition',
    color: colors.orange,
  },
  {
    time: '11:00',
    title: 'Reading Time',
    detail: 'The Very Hungry Caterpillar.',
    icon: 'book',
    color: '#D95C83',
  },
  {
    time: '12:00',
    title: 'Lunch',
    detail: 'Rice, chicken and vegetables.',
    icon: 'restaurant',
    color: colors.green2,
  },
  {
    time: '13:00',
    title: 'Nap / Rest',
    detail: 'Quiet classroom rest period.',
    icon: 'moon',
    color: colors.blue,
  },
  {
    time: '14:30',
    title: 'Art & Crafts',
    detail: 'Painted paper flowers.',
    icon: 'color-palette',
    color: colors.purple,
  },
  {
    time: '15:30',
    title: 'Pick-up',
    detail: 'Ready for collection.',
    icon: 'home',
    color: colors.green2,
  },
] as const;

export const forms = [
  {
    id: 'excursion',
    title: 'Excursion Consent',
    due: 'Due 20 Jul 2026',
    signed: false,
  },
  {
    id: 'photo',
    title: 'Photography Consent',
    due: 'Due 22 Jul 2026',
    signed: false,
  },
  {
    id: 'medical',
    title: 'Medical Consent',
    due: 'Signed 15 Jul 2026',
    signed: true,
  },
  {
    id: 'transport',
    title: 'Transport Consent',
    due: 'Signed 12 Jul 2026',
    signed: true,
  },
  {
    id: 'general',
    title: 'General Consent',
    due: 'Signed 10 Jul 2026',
    signed: true,
  },
] as const;

export const notifications = [
  {
    title: 'Homework Reminder',
    body: 'Prince has a number activity due tomorrow.',
    time: '8:30 AM',
    color: colors.orange,
  },
  {
    title: 'Early Dismissal Today',
    body: 'Collection is at 13:00 due to staff training.',
    time: '7:15 AM',
    color: colors.blue,
  },
  {
    title: 'Tuition Fee Due',
    body: 'Monthly tuition payment is due in 3 days.',
    time: 'Yesterday',
    color: '#E64D47',
  },
  {
    title: 'Sports Day Postponed',
    body: 'Sports Day has moved to Friday, 21 August.',
    time: 'Yesterday',
    color: colors.purple,
  },
  {
    title: 'Happy Birthday Timmy!',
    body: 'Wishing Timmy a wonderful birthday.',
    time: 'Mon',
    color: '#D95C83',
  },
  {
    title: 'Parent Meeting',
    body: 'Reminder: parent-teacher meeting at 17:00.',
    time: 'Mon',
    color: colors.green2,
  },
] as const;

export const products = [
  {
    id: 'backpack',
    name: 'Mobsie Connect Backpack',
    category: 'Featured',
    price: 450,
    icon: 'bag-handle',
    color: colors.purple,
  },
  {
    id: 'lunchbox',
    name: 'Mobsie Connect Lunchbox',
    category: 'Featured',
    price: 280,
    icon: 'fast-food',
    color: colors.green,
  },
  {
    id: 'bottle',
    name: 'Mobsie Connect Water Bottle',
    category: 'New Arrival',
    price: 180,
    icon: 'water',
    color: colors.orange,
  },
  {
    id: 'pencilcase',
    name: 'Mobsie Connect Pencil Case',
    category: 'New Arrival',
    price: 120,
    icon: 'pencil',
    color: colors.blue,
  },
  {
    id: 'uniform',
    name: 'School Uniform Set',
    category: 'Uniform',
    price: 350,
    icon: 'shirt',
    color: '#64748B',
  },
] as const;
