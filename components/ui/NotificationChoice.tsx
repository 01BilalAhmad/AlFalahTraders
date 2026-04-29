// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { sendRecoverySms } from '@/utils/sendRecoverySms';
import { sendRecoveryWhatsapp } from '@/utils/sendRecoveryWhatsapp';
import { formatPKR } from '@/utils/format';

export type NotificationMethod = 'sms' | 'whatsapp' | 'skip';

interface NotifPayload {
  shopPhone: string;
  shopName: string;
  openingBalance: number;
  recoveryAmount: number;
  remainingBalance: number;
}

interface Props {
  visible: boolean;
  payload: NotifPayload | null;
  onDone: (method: NotificationMethod) => void;
}

export function NotificationChoice({ visible, payload, onDone }: Props) {
  const [sending, setSending] = useState<'sms' | 'whatsapp' | null>(null);

  if (!payload) return null;

  const handleSms = async () => {
    setSending('sms');
    try {
      await sendRecoverySms({
        shopPhone: payload.shopPhone,
        shopName: payload.shopName,
        openingBalance: payload.openingBalance,
        recoveryAmount: payload.recoveryAmount,
        remainingBalance: payload.remainingBalance,
      });
    } catch { /* best effort */ }
    setSending(null);
    onDone('sms');
  };

  const handleWhatsapp = async () => {
    setSending('whatsapp');
    try {
      await sendRecoveryWhatsapp({
        shopPhone: payload.shopPhone,
        shopName: payload.shopName,
        openingBalance: payload.openingBalance,
        recoveryAmount: payload.recoveryAmount,
        remainingBalance: payload.remainingBalance,
      });
    } catch { /* best effort */ }
    setSending(null);
    onDone('whatsapp');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onDone('skip')}>
      <Pressable style={styles.backdrop} onPress={() => onDone('skip')} />
      <View style={styles.centered}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="notifications-active" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Notify Customer</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{payload.shopName}</Text>
            </View>
            <Pressable onPress={() => onDone('skip')} hitSlop={12}>
              <MaterialIcons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Recovery Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Opening Balance</Text>
              <Text style={styles.summaryValue}>{formatPKR(payload.openingBalance)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Recovery</Text>
              <Text style={[styles.summaryValue, { color: Colors.primary }]}>
                - {formatPKR(payload.recoveryAmount)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Remaining</Text>
              <Text style={[styles.summaryValue, styles.summaryTotalValue]}>
                {formatPKR(payload.remainingBalance)}
              </Text>
            </View>
          </View>

          <Text style={styles.question}>Send recovery notification to customer?</Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.smsBtn, sending === 'whatsapp' && styles.disabled]}
              onPress={handleSms}
              disabled={sending !== null}
            >
              {sending === 'sms' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="sms" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.actionBtnText}>SMS</Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.waBtn, sending === 'sms' && styles.disabled]}
              onPress={handleWhatsapp}
              disabled={sending !== null}
            >
              {sending === 'whatsapp' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="chat" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </Pressable>
          </View>

          <Pressable style={styles.skipBtn} onPress={() => onDone('skip')}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  summary: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotal: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  summaryTotalLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.bold,
  },
  summaryValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.semibold,
  },
  summaryTotalValue: {
    fontSize: FontSize.base,
    color: Colors.danger,
    fontWeight: FontWeight.bold,
  },
  question: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: Radius.md,
  },
  smsBtn: {
    backgroundColor: Colors.blue,
  },
  waBtn: {
    backgroundColor: '#22C55E',
  },
  disabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
});
