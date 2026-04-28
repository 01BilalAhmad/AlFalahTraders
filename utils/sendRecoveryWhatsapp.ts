// Powered by OnSpace.AI
// WhatsApp utility - opens WhatsApp with pre-filled message
import { Linking, Alert, Platform } from 'react-native';
import { formatPKR } from '@/utils/format';

interface WhatsappPayload {
  shopPhone: string;
  shopName: string;
  openingBalance: number;
  recoveryAmount: number;
  remainingBalance: number;
}

export function buildRecoveryMessage(
  shopName: string,
  openingBalance: number,
  recoveryAmount: number,
  remainingBalance: number,
): string {
  const today = new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `Al FALAH Credit System - Recovery Update\n\n`
    + `Dear ${shopName},\n\n`
    + `Your account has been updated:\n\n`
    + `Opening Balance: ${formatPKR(openingBalance)}\n`
    + `Recovery Received: ${formatPKR(recoveryAmount)}\n`
    + `Remaining Balance: ${formatPKR(remainingBalance)}\n\n`
    + `Date: ${today}\n\n`
    + `Thank you for your payment!\n`
    + `Al FALAH Credit System`;
}

/**
 * Open WhatsApp with pre-filled message to the given phone number.
 * Returns true if WhatsApp was opened, false otherwise.
 */
export async function sendRecoveryWhatsapp(payload: WhatsappPayload): Promise<boolean> {
  const { shopPhone } = payload;

  if (!shopPhone || shopPhone.trim().length === 0) {
    Alert.alert('No Phone Number', 'This shop has no phone number to send WhatsApp.');
    return false;
  }

  // Format phone: remove everything except digits
  let phone = shopPhone.trim().replace(/[^0-9]/g, '');

  // If starts with 0, remove leading 0 (Pakistan format: 03XX -> 92XXX)
  if (phone.startsWith('0')) {
    phone = phone.substring(1);
  }

  // If starts with +92, remove +
  if (phone.startsWith('+92')) {
    phone = phone.substring(1); // keeps 92...
  }

  // If doesn't start with country code, add 92
  if (!phone.startsWith('92')) {
    phone = '92' + phone;
  }

  // Remove any remaining non-digits just in case
  phone = phone.replace(/[^0-9]/g, '');

  const message = buildRecoveryMessage(
    payload.shopName,
    payload.openingBalance,
    payload.recoveryAmount,
    payload.remainingBalance,
  );

  // WhatsApp deep link
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${phone}?text=${encodedMessage}`;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      // Fallback: try opening WhatsApp directly via package
      if (Platform.OS === 'android') {
        const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.whatsapp';
        Alert.alert(
          'WhatsApp Not Installed',
          'WhatsApp is not installed on this device. Would you like to install it?',
          [
            { text: 'Install', onPress: () => Linking.openURL(playStoreUrl) },
            { text: 'Use SMS Instead', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert('WhatsApp Not Available', 'Please install WhatsApp to send recovery notifications.');
      }
      return false;
    }
  } catch (error: any) {
    Alert.alert('Error', 'Could not open WhatsApp. Please try again.');
    return false;
  }
}
