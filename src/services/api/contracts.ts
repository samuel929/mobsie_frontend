import type { StaffMember } from '../../data/staff';

export interface StudentSummary {
  id: string;
  name: string;
  grade: string;
  attendancePercent: number;
  overallAverage: number;
}

export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface ProductDto {
  id: string;
  name: string;
  priceInCents: number;
  category: string;
  imageUrl?: string;
}

export interface SchoolApi {
  getStudent(studentId: string): Promise<StudentSummary>;
  getStaff(): Promise<StaffMember[]>;
  getNotifications(): Promise<NotificationDto[]>;
  getProducts(): Promise<ProductDto[]>;
  submitFeedback(message: string, rating: number): Promise<void>;
  submitConsent(formId: string, signature: string): Promise<void>;
}
