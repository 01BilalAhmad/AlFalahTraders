// Powered by OnSpace.AI
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Shop, Transaction } from './api';

const KEYS = {
  USER: 'af_user',
  TOKEN: 'af_token',
  SHOPS: 'af_shops',
  OFFLINE_QUEUE: 'af_offline_queue',
  LAST_SYNC: 'af_last_sync',
};

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
};
