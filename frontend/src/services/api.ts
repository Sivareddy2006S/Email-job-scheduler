import axios from 'axios';
import type {
  EmailRecord,
  PaginatedEmails,
  ScheduleRequest,
  ScheduleResponse,
  SlackConnection,
  User,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Centralized handling of auth expiration: redirect to login on 401s
// coming from protected endpoints (but not from the initial /auth/me probe).
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/me')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  googleLoginUrl: `${API_BASE_URL}/auth/google`,
  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};

export const emailApi = {
  async schedule(payload: ScheduleRequest): Promise<ScheduleResponse> {
    const { data } = await apiClient.post<ScheduleResponse>('/emails/schedule', payload);
    return data;
  },
  async listScheduled(page = 1): Promise<PaginatedEmails> {
    const { data } = await apiClient.get<PaginatedEmails>('/emails/scheduled', { params: { page } });
    return data;
  },
  async listSent(page = 1): Promise<PaginatedEmails> {
    const { data } = await apiClient.get<PaginatedEmails>('/emails/sent', { params: { page } });
    return data;
  },
  async search(query: string): Promise<{ items: EmailRecord[] }> {
    const { data } = await apiClient.get<{ items: EmailRecord[] }>('/emails/search', {
      params: { q: query },
    });
    return data;
  },
};

export const slackApi = {
  connectUrl: `${API_BASE_URL}/slack/connect`,
  async status(): Promise<SlackConnection> {
    const { data } = await apiClient.get<SlackConnection>('/slack/status');
    return data;
  },
  async disconnect(): Promise<void> {
    await apiClient.post('/slack/disconnect');
  },
};
