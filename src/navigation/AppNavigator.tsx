import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { useSchoolData } from '../data/SchoolContext';
import { Avatar } from '../components/ui';
import { colors } from '../theme';
import {
  ApplicationOneScreen,
  ApplicationReviewScreen,
  ApplicationSuccessScreen,
  ApplicationTwoScreen,
  ApprovalPendingScreen,
  EnrollmentScreen,
  ForgotPasswordScreen,
  LegalPolicyScreen,
  LoginScreen,
  ResetPasswordScreen,
  PublicAboutScreen,
  SignUpScreen,
  WelcomeScreen,
} from '../screens/onboarding/OnboardingScreens';
import {
  AboutScreen,
  BranchesScreen,
  CalendarScreen,
  GalleryScreen,
  HomeScreen,
  LearningScreen,
  MessagesScreen,
  ProfileScreen,
  ServicesScreen,
  TeamScreen,
} from '../screens/main/MainScreens';
import {
  DailyActivityScreen,
  FeedbackScreen,
  FormsScreen,
  NewsletterScreen,
  NotificationsScreen,
  OrdersScreen,
  CartScreen,
  StoreScreen,
  StudentReportScreen,
} from '../screens/features/FeatureScreens';
import { DeregistrationScreen } from '../screens/profile/DeregistrationScreen';
import { rootNotificationParams } from '../notifications/navigation';

const Root = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tabs = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef<any>();

function FixedBottomNavigation({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { messages } = useSchoolData();
  const unreadMessages = messages.filter(
    (message) => message.senderType === 'SCHOOL' && !message.readAt,
  ).length;
  const items = [
    ['Home', 'home-outline'],
    ['Calendar', 'calendar-outline'],
    ['Messages', 'chatbubble-outline'],
    ['Profile', 'person-outline'],
  ] as const;
  return (
    <View style={[styles.fixedBottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {items.map(([label, icon]) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={`Open ${label}`}
          onPress={() => navigation.navigate('Tabs', { screen: label })}
          style={styles.fixedBottomItem}
        >
          <View style={label === 'Home' ? [styles.tabIcon, styles.activeTabIcon] : styles.tabIcon}>
            <Ionicons name={icon} size={22} color={label === 'Home' ? colors.green : '#7C817F'} />
            {label === 'Messages' && unreadMessages > 0 && (
              <View style={styles.messageBadge}>
                <Text style={styles.messageBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.fixedBottomLabel, label === 'Home' && styles.fixedBottomLabelActive]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function withFixedBottomNavigation(Component: React.ComponentType<any>) {
  return function FixedBottomScreen(props: any) {
    return (
      <View style={styles.fixedBottomScreen}>
        <View style={styles.fixedBottomContent}>
          <Component {...props} />
        </View>
        <FixedBottomNavigation navigation={props.navigation} />
      </View>
    );
  };
}

const LearningWithBottomNav = withFixedBottomNavigation(LearningScreen);
const DailyActivityWithBottomNav = withFixedBottomNavigation(DailyActivityScreen);
const StudentReportWithBottomNav = withFixedBottomNavigation(StudentReportScreen);
const GalleryWithBottomNav = withFixedBottomNavigation(GalleryScreen);
const TeamWithBottomNav = withFixedBottomNavigation(TeamScreen);
const BranchesWithBottomNav = withFixedBottomNavigation(BranchesScreen);
const ServicesWithBottomNav = withFixedBottomNavigation(ServicesScreen);
const StoreWithBottomNav = withFixedBottomNavigation(StoreScreen);
const CartWithBottomNav = withFixedBottomNavigation(CartScreen);
const OrdersWithBottomNav = withFixedBottomNavigation(OrdersScreen);
const FormsWithBottomNav = withFixedBottomNavigation(FormsScreen);
const NotificationsWithBottomNav = withFixedBottomNavigation(NotificationsScreen);
const NewsletterWithBottomNav = withFixedBottomNavigation(NewsletterScreen);
const FeedbackWithBottomNav = withFixedBottomNavigation(FeedbackScreen);
const AboutWithBottomNav = withFixedBottomNavigation(AboutScreen);

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Calendar: 'calendar-outline',
  Messages: 'chatbubble-outline',
  Profile: 'person-outline',
};

function BottomTabs() {
  const { messages } = useSchoolData();
  const unreadMessages = messages.filter(
    (message) => message.senderType === 'SCHOOL' && !message.readAt,
  ).length;
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: '#7C817F',
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.tabIcon, focused && styles.activeTabIcon]}>
            <Ionicons name={tabIcons[route.name]} size={23} color={color} />
            {route.name === 'Messages' && unreadMessages > 0 && (
              <View style={styles.messageBadge}>
                <Text style={styles.messageBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text>
              </View>
            )}
          </View>
        ),
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Calendar" component={CalendarScreen} />
      <Tabs.Screen name="Messages" component={MessagesScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { logout, user } = useAuth();
  return (
    <View style={styles.drawerRoot}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
        <View style={styles.drawerProfile}>
          <Avatar name={user?.name ?? 'Parent'} size={48} />
          <View>
            <Text style={styles.drawerName}>{user?.name ?? 'Parent'}</Text>
            <Text style={styles.drawerEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <Pressable style={styles.logout} onPress={logout}>
        <Ionicons name="log-out-outline" color={colors.danger} size={20} />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(22, 25, 24, 0.48)',
        drawerStyle: { width: '72%', backgroundColor: '#FFF8EF' },
        drawerActiveBackgroundColor: '#DDEADF',
        drawerActiveTintColor: colors.green,
        drawerInactiveTintColor: colors.text,
        drawerLabelStyle: { fontFamily: 'Poppins_500Medium', fontSize: 11, marginLeft: -14 },
      }}
    >
      <Drawer.Screen
        name="Tabs"
        component={BottomTabs}
        listeners={({ navigation }) => ({
          drawerItemPress: (event) => {
            event.preventDefault();
            navigation.navigate('Tabs', { screen: 'Home' });
            navigation.closeDrawer();
          },
        })}
        options={{
          title: 'Home',
          drawerIcon: ({ color }) => (
            <Ionicons style={{ marginRight: 20 }} name="home-outline" size={19} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Learning"
        component={LearningWithBottomNav}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons style={{ marginRight: 20 }} name="book-outline" size={19} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="DailyActivity"
        component={DailyActivityWithBottomNav}
        options={{
          title: 'Daily Activity',
          drawerIcon: ({ color }) => (
            <Ionicons
              style={{ marginRight: 20 }}
              name="document-text-outline"
              size={19}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="StudentReport"
        component={StudentReportWithBottomNav}
        options={{
          title: 'Progress Reports',
          drawerIcon: ({ color }) => (
            <Ionicons
              style={{ marginRight: 20 }}
              name="bar-chart-outline"
              size={19}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Gallery"
        component={GalleryWithBottomNav}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons style={{ marginRight: 20 }} name="images-outline" size={19} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Team"
        component={TeamWithBottomNav}
        options={{
          title: 'Our Team',
          drawerIcon: ({ color }) => (
            <Ionicons style={{ marginRight: 20 }} name="people-outline" size={19} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Branches"
        component={BranchesWithBottomNav}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons style={{ marginRight: 20 }} name="location-outline" size={19} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Services"
        component={ServicesWithBottomNav}
        options={{
          title: 'Services & Fees',
          drawerIcon: ({ color }) => (
            <Ionicons
              style={{ marginRight: 20 }}
              name="briefcase-outline"
              size={19}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Store"
        component={StoreWithBottomNav}
        options={{
          title: 'School Shop',
          drawerIcon: ({ color }) => (
            <Ionicons style={{ marginRight: 20 }} name="cart-outline" size={19} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Cart"
        component={CartWithBottomNav}
        options={{
          title: 'Shopping Cart',
          drawerIcon: ({ color }) => (
            <Ionicons
              style={{ marginRight: 20 }}
              name="bag-check-outline"
              size={19}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Orders"
        component={OrdersWithBottomNav}
        options={{
          title: 'My Orders',
          drawerIcon: ({ color }) => (
            <Ionicons style={{ marginRight: 20 }} name="receipt-outline" size={19} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Forms"
        component={FormsWithBottomNav}
        options={{
          title: 'Forms & Consent',
          drawerIcon: ({ color }) => (
            <Ionicons style={{ marginRight: 20 }} name="checkbox-outline" size={19} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Newsletter"
        component={NewsletterWithBottomNav}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons
              style={{ marginRight: 20 }}
              name="newspaper-outline"
              size={19}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Notifications"
        component={NotificationsWithBottomNav}
        options={{
          title: 'Notifications',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="Feedback"
        component={FeedbackWithBottomNav}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons
              style={{ marginRight: 20 }}
              name="chatbox-ellipses-outline"
              size={19}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="About"
        component={AboutWithBottomNav}
        options={{
          title: 'About Us',
          drawerIcon: ({ color }) => (
            <Ionicons
              style={{ marginRight: 20 }}
              name="information-circle-outline"
              size={19}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Deregistration"
        component={DeregistrationScreen}
        options={{
          title: 'Learner Deregistration',
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  const { user, loading, loggedOut, onboardingRoute } = useAuth();
  const handledNotification = useRef<string | null>(null);
  useEffect(() => {
    if (user?.accessState !== 'APPROVED') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response || !navigationRef.isReady()) return;
      const requestId = response.notification.request.identifier;
      if (handledNotification.current === requestId) return;
      handledNotification.current = requestId;
      const data = response.notification.request.content.data as Record<string, unknown>;
      navigationRef.navigate('MainApp', rootNotificationParams(data));
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then(open);
    return () => subscription.remove();
  }, [user?.accessState]);
  if (loading) {
    return (
      <View style={styles.navigatorLoading}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }
  return (
    <NavigationContainer ref={navigationRef}>
      <Root.Navigator
        key={
          user
            ? `authenticated-${user.accessState}-${onboardingRoute ?? 'none'}`
            : loggedOut
              ? 'logged-out'
              : 'guest'
        }
        initialRouteName={
          user?.accessState === 'APPROVED'
            ? 'MainApp'
            : user?.accessState === 'PENDING_APPROVAL'
              ? 'ApprovalPending'
              : user
                ? (onboardingRoute ?? 'ApplicationOne')
                : loggedOut
                  ? 'Login'
                  : 'Welcome'
        }
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        {user?.accessState === 'APPROVED' ? (
          <Root.Screen name="MainApp" component={MainDrawer} options={{ animation: 'fade' }} />
        ) : user?.accessState === 'PENDING_APPROVAL' ? (
          <Root.Screen
            name="ApprovalPending"
            component={ApprovalPendingScreen}
            options={{ animation: 'fade' }}
          />
        ) : user ? null : (
          <>
            <Root.Screen name="Welcome" component={WelcomeScreen} />
            <Root.Screen name="Login" component={LoginScreen} />
            <Root.Screen name="SignUp" component={SignUpScreen} />
            <Root.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Root.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Root.Screen name="AboutPublic" component={PublicAboutScreen} />
          </>
        )}
        <Root.Screen name="ApplicationOne" component={ApplicationOneScreen} />
        <Root.Screen name="ApplicationTwo" component={ApplicationTwoScreen} />
        <Root.Screen name="ApplicationReview" component={ApplicationReviewScreen} />
        <Root.Screen name="ApplicationSuccess" component={ApplicationSuccessScreen} />
        <Root.Screen name="Enrollment" component={EnrollmentScreen} />
        <Root.Screen
          name="PrivacyPolicy"
          component={LegalPolicyScreen}
          initialParams={{ slug: 'privacy' }}
        />
        <Root.Screen
          name="TermsPolicy"
          component={LegalPolicyScreen}
          initialParams={{ slug: 'terms' }}
        />
        <Root.Screen
          name="EnrolmentTermsPolicy"
          component={LegalPolicyScreen}
          initialParams={{ slug: 'enrolment' }}
        />
      </Root.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  navigatorLoading: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    flex: 1,
    justifyContent: 'center',
  },
  fixedBottomScreen: { backgroundColor: colors.cream, flex: 1 },
  fixedBottomContent: { flex: 1 },
  fixedBottomBar: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopColor: '#EEEAE4',
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 18,
    paddingTop: 7,
    shadowColor: '#17211F',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  fixedBottomItem: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  fixedBottomLabel: {
    color: '#7C817F',
    fontFamily: 'Poppins_500Medium',
    fontSize: 8,
    marginTop: 1,
  },
  fixedBottomLabelActive: { color: colors.green },
  tabBar: {
    height: 76,
    paddingBottom: 9,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopColor: '#EEEAE4',
  },
  tabLabel: { fontFamily: 'Poppins_500Medium', fontSize: 9 },
  tabIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 40,
  },
  activeTabIcon: { backgroundColor: '#E7F5EF' },
  messageBadge: {
    alignItems: 'center',
    backgroundColor: '#E5484D',
    borderColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 18,
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -3,
    top: -3,
  },
  messageBadgeText: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 8,
    lineHeight: 11,
  },
  drawerRoot: { flex: 1 },
  drawerContent: { paddingTop: 25 },
  drawerProfile: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  drawerName: { color: colors.ink, fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  drawerEmail: { color: colors.muted, fontSize: 8 },
  logout: {
    alignItems: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 24,
  },
  logoutText: { color: colors.danger, fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
});
