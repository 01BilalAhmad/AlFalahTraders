// Powered by OnSpace.AI
// Direct SMS - sends silently without opening any messaging app
import { Platform } from 'react-native';
import * as Sms from 'expo-sms';
import * as ExpoModules from 'expo-modules-core';
import { formatPKR } from '@/utils/format';

interface SmsPayload {
  shopPhone: string;
  shopName: string;
  openingBalance: number;
  recoveryAmount: number;
  remainingBalance: number;
}

// Try to load native direct SMS module (Android only)
let DirectSmsModule: any = null;
try {
  DirectSmsModule = ExpoModules.requireModule('DirectSms');
} catch {
  console.log('[DirectSMS] Native module not available, will fallback to expo-sms');
}

function formatPhoneNumber(raw: string): string {
  let phone = raw.trim();
  if (!phone.startsWith('+') && !phone.startsWith('0')) {
    phone = '+92' + phone;
  } else if (phone.startsWith('0')) {
    phone = '+92' + phone.substring(1);
  }
  return phone;
}

function buildMessage(shopName: string, openingBalance: number, recoveryAmount: number, remainingBalance: number): string {
  const today = new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `AlFalah Traders - Recovery Update\n\n`
    + `Dear ${shopName},\n\n`
    + `Your account has been updated:\n\n`
    + `Opening Balance: ${formatPKR(openingBalance)}\n`
    + `Recovery Received: ${formatPKR(recoveryAmount)}\n`
    + `Remaining Balance: ${formatPKR(remainingBalance)}\n\n`
    + `Date: ${today}\n\n`
    + `Thank you for your payment!\n`
    + `AlFalah Traders`;
}

export async function sendRecoverySms(payload: SmsPayload): Promise<boolean> {
  const { shopPhone, shopName, openingBalance, recoveryAmount, remainingBalance } = payload;

  if (!shopPhone || shopPhone.trim().length === 0) {
    console.log('[SMS] No phone number provided, skipping SMS');
    return false;
  }

  const phoneNumber = formatPhoneNumber(shopPhone);
  const message = buildMessage(shopName, openingBalance, recoveryAmount, remainingBalance);

  try {
    // === METHOD 1: Native Direct SMS (Android - silent, no UI) ===
    if (Platform.OS === 'android' && DirectSmsModule) {
      console.log('[DirectSMS] Using native direct SMS (silent send)');

      // Check permission first
      const hasPermission = await DirectSmsModule.checkPermission();
      if (!hasPermission) {
        console.log('[DirectSMS] Requesting SEND_SMS permission...');
        try {
          await DirectSmsModule.requestPermission();
        } catch (permErr: any) {
          console.warn('[DirectSMS] Permission denied, falling back to expo-sms');
          return await fallbackExpoSms(phoneNumber, message);
        }
      }

      // Check if SMS is available (SIM ready + permission)
      const available = await DirectSmsModule.isAvailable();
      if (!available) {
        console.warn('[DirectSMS] SMS not available (no SIM or no permission), falling back');
        return await fallbackExpoSms(phoneNumber, message);
      }

      // Send directly - no UI popup!
      const result = await DirectSmsModule.sendDirectSms(phoneNumber, message);
      console.log('[DirectSMS] Send result:', result);
      return !!result;
    }

    // === METHOD 2: Fallback to expo-sms (opens messaging app) ===
    return await fallbackExpoSms(phoneNumber, message);

  } catch (error: any) {
    console.error('[SMS] Error:', error?.message || error);
    // If native fails, try fallback
    if (Platform.OS === 'android' && DirectSmsModule) {
      try {
        return await fallbackExpoSms(phoneNumber, message);
      } catch {
        return false;
      }
    }
    return false;
  }
}

async function fallbackExpoSms(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const isAvailable = await Sms.isAvailableAsync();
    if (!isAvailable) {
      console.log('[SMS Fallback] SMS not available on this device');
      return false;
    }

    const { result } = await Sms.sendSMSAsync([phoneNumber], message);
    console.log('[SMS Fallback] Result:', result);
    return result === 'sent';
  } catch (error: any) {
    console.error('[SMS Fallback] Error:', error?.message || error);
    return false;
  }
}
