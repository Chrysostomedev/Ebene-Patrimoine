import axiosInstance from "../../core/axios";
import { NotifSource } from "../../hooks/provider/useNotifications";

export interface ApiNotification {
  id: string;
  type: string;
  data: {
    title?: string;
    message?: string;
    summary?: string;
    body?: string;
    source?: string;
    entity_id?: number | string;
    entity_label?: string;
    href?: string;
  };
  read_at: string | null;
  created_at: string;
}

export interface NotificationResponse {
  data: ApiNotification[];
  current_page: number;
  last_page: number;
  total: number;
}

const BASE = "/provider/notifications";

export const providerNotificationService = {
  /**
   * GET /provider/notifications
   */
  getNotifications: async (page = 1): Promise<NotificationResponse> => {
    const res = await axiosInstance.get(BASE, { params: { page } });
    // Laravel Paginate returns { data: { data: [...], current_page: ... } } via BaseController
    const d = res.data?.data ?? res.data;
    return {
      data:         d?.data ?? (Array.isArray(d) ? d : []),
      current_page: d?.current_page ?? 1,
      last_page:    d?.last_page    ?? 1,
      total:        d?.total        ?? 0,
    };
  },

  /**
   * GET /provider/notifications/unread
   */
  getUnreadNotifications: async (): Promise<ApiNotification[]> => {
    const res = await axiosInstance.get(`${BASE}/unread`);
    return res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
  },

  /**
   * POST /provider/notifications/{id}/read
   */
  markAsRead: async (id: string): Promise<void> => {
    await axiosInstance.post(`${BASE}/${id}/read`);
  },

  /**
   * POST /provider/notifications/read-all
   */
  markAllAsRead: async (): Promise<void> => {
    await axiosInstance.post(`${BASE}/read-all`);
  },

  /**
   * DELETE /provider/notifications/{id}
   */
  deleteNotification: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${id}`);
  },
};
