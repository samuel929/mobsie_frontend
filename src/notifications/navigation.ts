type Navigation = { navigate: (screen: string, params?: Record<string, unknown>) => void };

const tabScreens = new Set(['Home', 'Invoices', 'Messages', 'Profile']);
const drawerScreens = new Set([
  'Learning',
  'DailyActivity',
  'StudentReport',
  'Gallery',
  'Team',
  'Branches',
  'Services',
  'Store',
  'Cart',
  'Orders',
  'Forms',
  'Notifications',
  'Newsletter',
  'Feedback',
  'About',
  'Calendar',
]);

export function openNotificationDestination(
  navigation: Navigation,
  data: Record<string, unknown> | null | undefined,
) {
  const requested = typeof data?.screen === 'string' ? data.screen : 'Notifications';
  if (tabScreens.has(requested)) {
    navigation.navigate('Tabs', { screen: requested, params: { ...data } });
    return;
  }
  if (requested === 'ApplicationReview') {
    navigation.navigate('ApplicationReview', { ...data });
    return;
  }
  const screen = drawerScreens.has(requested) ? requested : 'Notifications';
  navigation.navigate(screen, { ...data });
}

export function rootNotificationParams(data: Record<string, unknown> | null | undefined) {
  const requested = typeof data?.screen === 'string' ? data.screen : 'Notifications';
  if (tabScreens.has(requested)) {
    return { screen: 'Tabs', params: { screen: requested, params: { ...data } } };
  }
  if (requested === 'ApplicationReview') {
    return { screen: 'ApplicationReview', params: { ...data } };
  }
  const screen = drawerScreens.has(requested) ? requested : 'Notifications';
  return { screen, params: { ...data } };
}

