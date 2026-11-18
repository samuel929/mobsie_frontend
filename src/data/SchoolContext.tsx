import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../auth/AuthContext';
import { environment } from '../config/environment';
import { apiData } from '../services/api/client';

export type MobileStudent = {
  id: string;
  name: string;
  dateOfBirth: string;
  grade: string;
  className: string;
  attendanceRate: number;
  enrollmentStatus: string;
  branchId: string;
  branchName: string;
};
export type MobileEvent = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  title: string;
  description: string | null;
  category: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
};
export type AcademicRecord = {
  studentId: string;
  subject: string;
  term: number;
  year: number;
  score: number;
  grade: string;
  teacherComment: string | null;
};
export type MobileMessage = {
  id: string;
  senderType: 'PARENT' | 'SCHOOL';
  senderName: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
};
export type MobileFeedback = {
  id: string;
  category: string;
  message: string;
  rating: number | null;
  status: 'NEW' | 'OPEN' | 'READ' | 'RESOLVED' | string;
  createdAt: string;
  reply?: string | null;
  repliedAt?: string | null;
  repliedByName?: string | null;
};
export type MobileApplication = {
  id: string;
  reference: string;
  childName: string;
  currentGrade: string;
  status: string;
  branchId: string | null;
  branchName: string | null;
  preferredStartDate: string | null;
};
export type ChildProfile = {
  key: string;
  name: string;
  status: string;
  reference: string | null;
  student: MobileStudent | null;
  application: MobileApplication | null;
  pending: boolean;
};
export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  imageUrl: string | null;
  colors?: string[];
};
export type CartLine = Product & { quantity: number; selectedColor?: string; cartKey: string };
export type MobileOrder = {
  id: string;
  reference: string;
  totalInCents: number;
  status: string;
  createdAt?: string;
  branchName?: string | null;
  checkoutUrl?: string;
  items?: Array<{
    productId?: string;
    name: string;
    quantity: number;
    unitPriceInCents?: number;
    selectedColor?: string | null;
  }>;
};
export type MobileDailyActivity = {
  id?: string;
  title: string;
  startTime: string;
  endTime: string;
  detail?: string;
  description?: string;
  branchId?: string;
  branchName?: string;
  className?: string;
  /** ISO calendar day supplied by the dashboard timetable. */
  activityDate?: string;
  activityType?: string;
  repeat?:
    | 'EVERY_DAY'
    | 'WEEKDAYS'
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY';
  icon?: string;
  color?: string;
};
type Feed = {
  applications: MobileApplication[];
  students: MobileStudent[];
  academics: AcademicRecord[];
  attendance: Array<{ studentId: string; date: string; status: string }>;
  events: MobileEvent[];
  messages: MobileMessage[];
  homework: any[];
  newsletters: any[];
  notifications: any[];
  forms: any[];
  gallery: any[];
  feedback: MobileFeedback[];
  dailyActivities: MobileDailyActivity[];
};
type DataValue = Feed & {
  dailyActivities: MobileDailyActivity[];
  loading: boolean;
  products: Product[];
  cart: CartLine[];
  orders: MobileOrder[];
  error: string | null;
  refresh: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshMessages: (markRead?: boolean) => Promise<void>;
  addToCart: (product: Product, selectedColor?: string) => void;
  changeQuantity: (cartKey: string, delta: number) => void;
  clearCart: () => void;
  checkout: (branchId?: string | null) => Promise<MobileOrder>;
  sendMessage: (body: string) => Promise<void>;
  markMessagesRead: () => Promise<void>;
  submitFeedback: (message: string, rating: number, category?: string) => Promise<void>;
  childProfiles: ChildProfile[];
  activeChild: ChildProfile | null;
  selectChild: (key: string) => Promise<void>;
};
const empty: Feed = {
  applications: [],
  students: [],
  academics: [],
  attendance: [],
  events: [],
  messages: [],
  homework: [],
  newsletters: [],
  notifications: [],
  forms: [],
  gallery: [],
  feedback: [],
  dailyActivities: [],
};
const DataContext = createContext<DataValue | null>(null);

export function SchoolDataProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [feed, setFeed] = useState<Feed>(empty);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChildKey, setActiveChildKey] = useState<string | null>(null);
  const realtimeRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageReadPersistenceSupported = useRef(true);
  const refreshOrders = useCallback(async () => {
    if (!token) {
      setOrders([]);
      return;
    }
    const latest = await apiData<MobileOrder[]>('/mobile/shop/orders', {
      token,
      forceRefresh: true,
      cacheTtlMs: 0,
    });
    setOrders(Array.isArray(latest) ? latest : []);
  }, [token]);
  const refreshMessages = useCallback(async (markRead = false) => {
    if (!token) {
      setFeed((current) => ({ ...current, messages: [] }));
      return;
    }
    const latest = await apiData<MobileMessage[]>('/mobile/messages', {
      token,
      forceRefresh: true,
      cacheTtlMs: 0,
    });
    const readAt = new Date().toISOString();
    const hasUnreadSchoolMessages = latest.some(
      (message) => message.senderType === 'SCHOOL' && !message.readAt,
    );
    // Clear the badge as soon as the parent views the conversation. Do not
    // hold the UI hostage to a slow or not-yet-deployed persistence endpoint.
    setFeed((current) => ({
      ...current,
      messages: latest.map((message) =>
        markRead && message.senderType === 'SCHOOL' && !message.readAt
          ? { ...message, readAt }
          : message,
      ),
    }));
    if (markRead && hasUnreadSchoolMessages && messageReadPersistenceSupported.current) {
      try {
        await apiData('/mobile/messages', { method: 'PATCH', token });
      } catch {
        // The production API may briefly lag behind an OTA app update. Keep
        // messages read locally and avoid repeating a known unsupported call.
        messageReadPersistenceSupported.current = false;
      }
    }
  }, [token]);
  const refresh = useCallback(async () => {
    if (!token) {
      setFeed(empty);
      setProducts([]);
      setOrders([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // The family feed is core app data.  A temporary shop failure must not
      // prevent calendar, profile, messages, forms or daily activity loading.
      const [feedResult, productsResult, ordersResult, formsResult, feedbackResult] =
        await Promise.allSettled([
          apiData<Feed>('/mobile/feed', { token }),
          apiData<Product[]>(
            `/shop/products?tenantId=${encodeURIComponent(environment.tenantId)}&limit=100`,
          ),
          apiData<MobileOrder[]>('/mobile/shop/orders', { token }),
          apiData<any[]>('/mobile/consent-forms', { token }),
          apiData<MobileFeedback[]>('/mobile/feedback', { token }),
        ]);

      const nextFeed: Feed = feedResult.status === 'fulfilled' ? feedResult.value : empty;

      if (feedResult.status === 'rejected') throw feedResult.reason;
      setFeed({
        ...empty,
        ...nextFeed,
        forms: formsResult.status === 'fulfilled' ? formsResult.value : nextFeed.forms,
        feedback: feedbackResult.status === 'fulfilled' ? feedbackResult.value : [],
        events: Array.isArray(nextFeed.events) ? nextFeed.events : [],
        dailyActivities: Array.isArray(nextFeed.dailyActivities) ? nextFeed.dailyActivities : [],
      });
      if (productsResult.status === 'fulfilled') {
        setProducts(productsResult.value.filter((product) => product.status === 'ACTIVE'));
      }
      if (ordersResult.status === 'fulfilled') setOrders(ordersResult.value);
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not refresh your school data.';
      console.warn('[Mobsie] Family feed refresh failed:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);
  useEffect(() => {
    if (!token) return;
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      if (data?.screen === 'Messages') refreshMessages().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [refreshMessages, token]);
  useEffect(() => {
    AsyncStorage.getItem('mc_active_child')
      .then(setActiveChildKey)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!token || !environment.realtimeEnabled) return;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let attempts = 0;

    const connect = () => {
      const websocketUrl = environment.apiBaseUrl
        .replace(/^http:/, 'ws:')
        .replace(/^https:/, 'wss:')
        .replace(/\/api\/?$/, '/api/realtime');
      socket = new WebSocket(websocketUrl);
      socket.onopen = () => {
        attempts = 0;
        socket?.send(JSON.stringify({ type: 'authenticate', token }));
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as { type?: string; topic?: string };
          if (
            !message.topic ||
            !['messages', 'calendar', 'daily_activity', 'newsletter'].includes(message.topic)
          )
            return;
          if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current);
          realtimeRefreshTimer.current = setTimeout(() => refresh().catch(() => undefined), 250);
        } catch {
          // Ignore malformed frames and keep the live connection available.
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        attempts += 1;
        reconnectTimer = setTimeout(connect, Math.min(30_000, 1_000 * 2 ** Math.min(attempts, 5)));
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current);
      socket?.close();
    };
  }, [refresh, token]);
  const addToCart = (product: Product, selectedColor?: string) =>
    setCart((current) => {
      const cartKey = `${product.id}:${selectedColor ?? ''}`;
      const found = current.find((line) => line.cartKey === cartKey);
      const productQuantity = current
        .filter((line) => line.id === product.id)
        .reduce((sum, line) => sum + line.quantity, 0);
      if (found)
        return current.map((line) =>
          line.cartKey === cartKey && productQuantity < product.stock
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      return productQuantity < product.stock
        ? [...current, { ...product, quantity: 1, selectedColor, cartKey }]
        : current;
    });
  const changeQuantity = (cartKey: string, delta: number) =>
    setCart((current) =>
      current
        .map((line) =>
          line.cartKey !== cartKey
            ? line
            : {
                ...line,
                quantity:
                  delta > 0
                    ? Math.min(
                        line.quantity + delta,
                        line.stock -
                          current
                            .filter((other) => other.id === line.id && other.cartKey !== cartKey)
                            .reduce((sum, other) => sum + other.quantity, 0),
                      )
                    : line.quantity + delta,
              },
        )
        .filter((line) => line.quantity > 0),
    );
  const checkout = async (branchId?: string | null) => {
    if (!token) throw new Error('Sign in to check out.');
    const response = await apiData<MobileOrder[] | MobileOrder>('/mobile/shop/orders', {
      method: 'POST',
      token,
      body: JSON.stringify({
        branchId: branchId || null,
        returnUrl: Linking.createURL('shop/payment/return'),
        items: cart.map((line) => ({
          productId: line.id,
          quantity: line.quantity,
          selectedColor: line.selectedColor,
        })),
      }),
    });
    const created = Array.isArray(response) ? response[0] : response;
    if (!created) throw new Error('The order was saved but its confirmation could not be loaded.');
    // Show the new order immediately, then reconcile with the database. This
    // avoids an empty order-history screen during navigation or slow networks.
    setOrders((current) => [created, ...current.filter((order) => order.id !== created.id)]);
    setCart([]);
    await refreshOrders();
    return created;
  };
  const sendMessage = async (body: string) => {
    if (!token) throw new Error('Sign in to send a message.');
    await apiData('/mobile/messages', { method: 'POST', token, body: JSON.stringify({ body }) });
    await refresh();
  };
  const markMessagesRead = useCallback(async () => {
    if (!token) return;
    const readAt = new Date().toISOString();
    setFeed((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.senderType === 'SCHOOL' && !message.readAt ? { ...message, readAt } : message,
      ),
    }));
    try {
      await apiData('/mobile/messages', { method: 'PATCH', token });
    } catch (readError) {
      await refresh().catch(() => undefined);
      throw readError;
    }
  }, [refresh, token]);
  const submitFeedback = async (message: string, rating: number, category = 'GENERAL') => {
    if (!token) throw new Error('Sign in to submit feedback.');
    await apiData('/mobile/feedback', {
      method: 'POST',
      token,
      body: JSON.stringify({ message, rating, category }),
    });
    await refresh();
  };
  const childProfiles = useMemo<ChildProfile[]>(() => {
    const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
    const usedApplications = new Set<string>();
    const enrolled = feed.students.map((student) => {
      const application =
        feed.applications.find((item) => {
          if (usedApplications.has(item.id)) return false;
          return normalize(item.childName) === normalize(student.name);
        }) ?? null;
      if (application) usedApplications.add(application.id);
      return {
        key: `student:${student.id}`,
        name: student.name,
        status: application?.status || student.enrollmentStatus || 'ENROLLED',
        reference: application?.reference || null,
        student,
        application,
        pending:
          Boolean(application) &&
          !['APPROVED', 'ENROLLED'].includes(String(application!.status).toUpperCase()),
      };
    });
    const applications = feed.applications
      .filter((application) => !usedApplications.has(application.id))
      .map((application) => ({
        key: `application:${application.id}`,
        name: application.childName,
        status: application.status,
        reference: application.reference || null,
        student: null,
        application,
        pending: !['APPROVED', 'ENROLLED'].includes(String(application.status).toUpperCase()),
      }));
    return [...enrolled, ...applications];
  }, [feed.applications, feed.students]);
  const activeChild = useMemo(
    () => childProfiles.find((child) => child.key === activeChildKey) ?? childProfiles[0] ?? null,
    [activeChildKey, childProfiles],
  );
  useEffect(() => {
    if (!activeChild || activeChild.key === activeChildKey) return;
    setActiveChildKey(activeChild.key);
    AsyncStorage.setItem('mc_active_child', activeChild.key).catch(() => undefined);
  }, [activeChild, activeChildKey]);
  const selectChild = useCallback(async (key: string) => {
    setActiveChildKey(key);
    await AsyncStorage.setItem('mc_active_child', key);
  }, []);
  const scopedFeed = useMemo<Feed>(() => {
    if (!activeChild) return feed;
    if (!activeChild.student || activeChild.pending)
      return {
        ...feed,
        students: [],
        applications: activeChild.application ? [activeChild.application] : [],
      };
    return {
      ...feed,
      students: [
        activeChild.student,
        ...feed.students.filter((item) => item.id !== activeChild.student!.id),
      ],
      applications: activeChild.application
        ? [
            activeChild.application,
            ...feed.applications.filter((item) => item.id !== activeChild.application!.id),
          ]
        : feed.applications,
    };
  }, [activeChild, feed]);
  const value = useMemo<DataValue>(
    () => ({
      ...scopedFeed,
      products,
      orders,
      cart,
      loading,
      error,
      refresh,
      refreshOrders,
      refreshMessages,
      addToCart,
      changeQuantity,
      clearCart: () => setCart([]),
      checkout,
      sendMessage,
      markMessagesRead,
      submitFeedback,
      childProfiles,
      activeChild,
      selectChild,
    }),
    [
      scopedFeed,
      products,
      orders,
      cart,
      loading,
      error,
      refresh,
      refreshOrders,
      refreshMessages,
      token,
      childProfiles,
      activeChild,
      selectChild,
      markMessagesRead,
    ],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export function useSchoolData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('useSchoolData must be inside SchoolDataProvider');
  return value;
}
