// Powered by OnSpace.AI
import * as Sms from 'expo-sms';
import { formatPKR } from '@/utils/format';

interface SmsPayload {
  shopPhone: string;
  shopName: string;
  openingBalance: number;
  recoveryAmount: number;
  remainingBalance: number;
}

export async function sendRecoverySms(payload: SmsPayload): Promise<boolean> {
  const { shopPhone, shopName, openingBalance, recoveryAmount, remainingBalance } = payload;

  if (!shopPhone || shopPhone.trim().length === 0) {
    console.log('[SMS] No phone number provided, skipping SMS');
    return false;
  }

  // Ensure phone has country code
  let phoneNumber = shopPhone.trim();
  if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('0')) {
    phoneNumber = '+92' + phoneNumber;
  } else if (phoneNumber.startsWith('0')) {
    phoneNumber = '+92' + phoneNumber.substring(1);
  }

  const today = new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const message = `AlFalah Traders - Recovery Update\n\n`
    + `Dear ${shopName},\n\n`
    + `Your account has been updated:\n\n`
    + `Opening Balance: ${formatPKR(openingBalance)}\n`
    + `Recovery Received: ${formatPKR(recoveryAmount)}\n`
    + `Remaining Balance: ${formatPKR(remainingBalance)}\n\n`
    + `Date: ${today}\n\n`
    + `Thank you for your payment!\n`
    + `AlFalah Traders`;

  try {
    const isAvailable = await Sms.isAvailableAsync();
    if (!isAvailable) {
      console.log('[SMS] SMS not available on this device');
      return false;
    }

    const { result } = await Sms.sendSMSAsync(
      [phoneNumber],
      message,
      {
        // Allow user to review/edit before sending
      }
    );

    // result: 'sent', 'cancelled', 'unknown'
    console.log(`[SMS] Result: ${result}`);
    return result === 'sent';
  } catch (error: any) {
    console.error('[SMS] Error sending SMS:', error?.message || error);
    return false;
  }
}
