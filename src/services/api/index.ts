import { environment } from '../../config/environment';
import { apiRequest } from './client';
import type { SchoolApi } from './contracts';
import { mockSchoolApi } from './mockSchoolApi';

const remoteSchoolApi: SchoolApi = {
  getStudent: (studentId) => apiRequest(`/students/${studentId}`),
  getStaff: () => apiRequest('/staff'),
  getNotifications: () => apiRequest('/notifications'),
  getProducts: () => apiRequest('/products'),
  submitFeedback: (message, rating) =>
    apiRequest('/feedback', { method: 'POST', body: JSON.stringify({ message, rating }) }),
  submitConsent: (formId, signature) =>
    apiRequest(`/consent-forms/${formId}/sign`, {
      method: 'POST',
      body: JSON.stringify({ signature }),
    }),
};

/** Swap between deterministic dummy data and a real REST backend with one environment flag. */
export const schoolApi = environment.useMockApi ? mockSchoolApi : remoteSchoolApi;
export type { SchoolApi } from './contracts';
