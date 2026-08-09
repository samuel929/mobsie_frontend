import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../auth/AuthContext';
import { environment } from '../config/environment';
import { apiData } from '../services/api/client';

export type MobileStudent = {
  id: string; name: string; dateOfBirth: string; grade: string; className: string;
  attendanceRate: number; enrollmentStatus: string; branchId: string; branchName: string;
};
export type MobileEvent = {
  id: string; branchId: string | null; branchName: string | null; title: string;
  description: string | null; category: string; startsAt: string; endsAt: string; allDay: boolean;
};
export type AcademicRecord = {
  studentId: string; subject: string; term: number; year: number; score: number;
  grade: string; teacherComment: string | null;
};
export type MobileMessage = {
  id: string; senderType: 'PARENT' | 'SCHOOL'; senderName: string; body: string;
  readAt?: string | null; createdAt: string;
};
export type MobileApplication = {
  id: string; reference: string; childName: string; currentGrade: string; status: string;
  branchId: string | null; branchName: string | null; preferredStartDate: string | null;
};
export type Product = {
  id: string; name: string; category: string; price: number; stock: number;
  status: string; imageUrl: string | null;
};
export type CartLine = Product & { quantity: number };
export type MobileOrder = {
  id: string; reference: string; totalInCents: number; status: string; createdAt?: string;
  branchName?: string | null; items?: Array<{ name: string; quantity: number }>;
};
export type MobileDailyActivity = {
  id?: string;
  title: string;
  startTime: string;
  endTime: string;
  detail?: string;
  branchId?: string;
  branchName?: string;
  className?: string;
  repeat?: 'EVERY_DAY' | 'WEEKDAYS' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  icon?: string;
  color?: string;
};
type Feed = {
  applications: MobileApplication[]; students: MobileStudent[]; academics: AcademicRecord[];
  attendance: Array<{ studentId: string; date: string; status: string }>;
  events: MobileEvent[]; messages: MobileMessage[]; homework: any[]; newsletters: any[];
  notifications: any[]; forms: any[]; gallery: any[];
  dailyActivities: MobileDailyActivity[];
};
type DataValue = Feed & {
  dailyActivities: MobileDailyActivity[];
  loading: boolean; products: Product[]; cart: CartLine[]; orders: MobileOrder[];
  refresh: () => Promise<void>; addToCart: (product: Product) => void;
  changeQuantity: (id: string, delta: number) => void; clearCart: () => void;
  checkout: (branchId?: string | null) => Promise<MobileOrder>;
  sendMessage: (body: string) => Promise<void>;
  submitFeedback: (message: string, rating: number, category?: string) => Promise<void>;
};
const empty: Feed = {
  applications: [], students: [], academics: [], attendance: [], events: [], messages: [],
  homework: [], newsletters: [], notifications: [], forms: [], gallery: [],
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
  const refresh = useCallback(async () => {
    if (!token) { setFeed(empty); setProducts([]); setOrders([]); return; }
    setLoading(true);
    try {
      const [nextFeed, nextProducts, nextOrders] = await Promise.all([
        apiData<Feed>('/mobile/feed', { token }),
        apiData<Product[]>(`/shop/products?tenantId=${encodeURIComponent(environment.tenantId)}&limit=100`),
        apiData<MobileOrder[]>('/mobile/shop/orders', { token }),
      ]);
      setFeed({
        ...empty,
        ...nextFeed,
        dailyActivities: Array.isArray(nextFeed.dailyActivities)
          ? nextFeed.dailyActivities
          : [],
      });
      setProducts(nextProducts.filter((product) => product.status === 'ACTIVE'));
      setOrders(nextOrders);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => { refresh().catch(() => undefined); }, [refresh]);
  const addToCart = (product: Product) => setCart((current) => {
    const found = current.find((line) => line.id === product.id);
    if (found) return current.map((line) => line.id === product.id ? { ...line, quantity: Math.min(line.quantity + 1, product.stock) } : line);
    return product.stock > 0 ? [...current, { ...product, quantity: 1 }] : current;
  });
  const changeQuantity = (id: string, delta: number) => setCart((current) =>
    current.map((line) => line.id === id ? { ...line, quantity: Math.min(line.stock, line.quantity + delta) } : line)
      .filter((line) => line.quantity > 0));
  const checkout = async (branchId?: string | null) => {
    if (!token) throw new Error('Sign in to check out.');
    const created = await apiData<MobileOrder[]>('/mobile/shop/orders', {
      method: 'POST', token,
      body: JSON.stringify({ branchId: branchId || null, items: cart.map((line) => ({ productId: line.id, quantity: line.quantity })) }),
    });
    setCart([]);
    await refresh();
    return created[0];
  };
  const sendMessage = async (body: string) => {
    if (!token) throw new Error('Sign in to send a message.');
    await apiData('/mobile/messages', { method: 'POST', token, body: JSON.stringify({ body }) });
    await refresh();
  };
  const submitFeedback = async (message: string, rating: number, category = 'GENERAL') => {
    if (!token) throw new Error('Sign in to submit feedback.');
    await apiData('/mobile/feedback', {
      method: 'POST', token, body: JSON.stringify({ message, rating, category }),
    });
  };
  const value = useMemo<DataValue>(() => ({
    ...feed, products, orders, cart, loading, refresh, addToCart, changeQuantity,
    clearCart: () => setCart([]), checkout, sendMessage, submitFeedback,
  }), [feed, products, orders, cart, loading, refresh, token]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export function useSchoolData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('useSchoolData must be inside SchoolDataProvider');
  return value;
}
