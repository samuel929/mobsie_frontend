import { notifications, products } from '../../data/features';
import { staffMembers } from '../../data/staff';
import type { SchoolApi } from './contracts';

const delay = (milliseconds = 180) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const mockSchoolApi: SchoolApi = {
  async getStudent(studentId) {
    await delay();
    return {
      id: studentId,
      name: 'Prince Tau',
      grade: 'Grade 1 · Class 1A',
      attendancePercent: 95,
      overallAverage: 78,
    };
  },
  async getStaff() {
    await delay();
    return staffMembers;
  },
  async getNotifications() {
    await delay();
    return notifications.map((item, index) => ({
      id: `notification-${index + 1}`,
      title: item.title,
      body: item.body,
      createdAt: new Date(2026, 6, 15 - index).toISOString(),
      read: index > 1,
    }));
  },
  async getProducts() {
    await delay();
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      priceInCents: product.price * 100,
      category: product.category,
    }));
  },
  async submitFeedback() {
    await delay(300);
  },
  async submitConsent() {
    await delay(300);
  },
};
