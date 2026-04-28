// Powered by OnSpace.AI
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Shop } from './api';

const KEYS = {
  USER: 'af_user',
  TOKEN: 'af_token',
  SHOPS: 'af_shops',
  OFFLINE_QUEUE: 'af_offline_queue',
  LAST_SYNC: 'af_last_sync',
  PENDING_NOTIFICATIONS: 'af_pending_notifications',
};

export interface PendingNotification {
  id: string; // unique: shopId + timestamp
  shopId: string;
  shopName: string;
  shopPhone: string;
  area: string;
  openingBalance: number;
  recoveryAmount: number;
  remainingBalance: number;
  createdAt: string;
  date: string; // YYYY-MM-DD for daily grouping
}

export interface OfflineRecovery {
  localId: string;
  shopId: string;
  shopName: string;
  amount: number;
  description?: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAddress?: string;
  createdBy: string;
  createdAt: string;
}

export const StorageService = {
  saveUser: async (user: User, token: string) => {
    await AsyncStorage.multiSet([
      [KEYS.USER, JSON.stringify(user)],
      [KEYS.TOKEN, token],
    ]);
  },

  getUser: async (): Promise<User | null> => {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

  getToken: async (): Promise<string | null> => {
    return AsyncStorage.getItem(KEYS.TOKEN);
  },

  clearSession: async () => {
    await AsyncStorage.multiRemove([KEYS.USER, KEYS.TOKEN]);
  },

  saveShops: async (shops: Shop[]) => {
    await AsyncStorage.setItem(KEYS.SHOPS, JSON.stringify(shops));
    await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
  },

  getShops: async (): Promise<Shop[]> => {
    const raw = await AsyncStorage.getItem(KEYS.SHOPS);
    return raw ? JSON.parse(raw) : [];
  },

  getLastSync: async (): Promise<string | null> => {
    return AsyncStorage.getItem(KEYS.LAST_SYNC);
  },

  addOfflineRecovery: async (recovery: OfflineRecovery) => {
    const raw = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
    const queue: OfflineRecovery[] = raw ? JSON.parse(raw) : [];
    queue.push(recovery);
    await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  },

  getOfflineQueue: async (): Promise<OfflineRecovery[]> => {
    const raw = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  },

  removeFromOfflineQueue: async (localIds: string[]) => {
    const raw = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
    const queue: OfflineRecovery[] = raw ? JSON.parse(raw) : [];
    const filtered = queue.filter((r) => !localIds.includes(r.localId));
    await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(filtered));
  },

  clearOfflineQueue: async () => {
    await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify([]));
  },

  // --- Pending Notifications Tracking ---
  addPendingNotification: async (notification: PendingNotification) => {
    const raw = await AsyncStorage.getItem(KEYS.PENDING_NOTIFICATIONS);
    const list: PendingNotification[] = raw ? JSON.parse(raw) : [];
    // Avoid duplicates by same shopId on same date
    const exists = list.some(
      (n) => n.shopId === notification.shopId && n.date === notification.date
    );
    if (!exists) {
      list.push(notification);
      await AsyncStorage.setItem(KEYS.PENDING_NOTIFICATIONS, JSON.stringify(list));
    }
  },

  getPendingNotifications: async (date?: string): Promise<PendingNotification[]> => {
    const raw = await AsyncStorage.getItem(KEYS.PENDING_NOTIFICATIONS);
    const list: PendingNotification[] = raw ? JSON.parse(raw) : [];
    if (date) {
      // Return only today's pending notifications
      return list.filter((n) => n.date === date);
    }
    return list;
  },

  removePendingNotification: async (id: string) => {
    const raw = await AsyncStorage.getItem(KEYS.PENDING_NOTIFICATIONS);
    const list: PendingNotification[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((n) => n.id !== id);
    await AsyncStorage.setItem(KEYS.PENDING_NOTIFICATIONS, JSON.stringify(filtered));
  },

  clearPendingNotifications: async (date?: string) => {
    if (date) {
      const raw = await AsyncStorage.getItem(KEYS.PENDING_NOTIFICATIONS);
      const list: PendingNotification[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((n) => n.date !== date);
      await AsyncStorage.setItem(KEYS.PENDING_NOTIFICATIONS, JSON.stringify(filtered));
    } else {
      await AsyncStorage.setItem(KEYS.PENDING_NOTIFICATIONS, JSON.stringify([]));
    }
  },
};
