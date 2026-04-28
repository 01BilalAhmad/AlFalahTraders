// Powered by OnSpace.AI
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { sendRecoverySms } from '@/utils/sendRecoverySms';
import { sendRecoveryWhatsapp } from '@/utils/sendRecoveryWhatsapp';

interface NotificationPayload {
  shopPhone: string;
  shopName: string;
  openingBalance: number;
  recoveryAmount: number;
  remainingBalance: number;
}

export type NotificationMethod = 'sms' | 'whatsapp';

interface NotificationChoiceProps {
  visible: boolean;
  payload: NotificationPayload | null;
  onDone: (method: NotificationMethod) => void;
}

export function NotificationChoice({ visible, payload, onDone }: NotificationChoiceProps) {
  const [sending, setSending] = useState(false);
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSending(false);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.8);
      opacity.setValue(0);
    }
  }, [visible]);

  const handleSms = async () => {
    if (!payload) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    try {
      const sent = await sendRecoverySms(payload);
      if (sent) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('[NotificationChoice] SMS error:', err);
    }
    setSending(false);
    onDone('sms');
  };

  const handleWhatsapp = async () => {
    if (!payload) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    try {
      await sendRecoveryWhatsapp(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('[NotificationChoice] WhatsApp error:', err);
    }
    setSending(false);
    onDone('whatsapp');
  };

  if (!payload) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.backdrop} disabled={sending}>
        <Animated.View style={[styles.backdropFade, { opacity }]} />
      </Pressable>

      <View style={styles.center}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          {/* Header icon */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={['#059669', '#047857']}
              style={styles.iconGradient}
            >
              <MaterialIcons name="notifications-active" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Send Recovery Notification</Text>
          <Text style={styles.subtitle}>
            Choose how to notify <Text style={styles.shopHighlight}>{payload.shopName}</Text>
          </Text>

          {/* Shop info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoDot} />
              <Text style={styles.infoLabel}>Recovery Amount</Text>
              <Text style={styles.infoValue}>
                Rs. {payload.recoveryAmount.toLocaleString()}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: '#FCA5A5' }]} />
              <Text style={styles.infoLabel}>Remaining Balance</Text>
              <Text style={[styles.infoValue, { color: Colors.danger }]}>
                Rs. {payload.remainingBalance.toLocaleString()}
              </Text>
            </View>
          </View>

          <Text style={styles.mandatoryNote}>
            * Notification is compulsory for every recovery
          </Text>

          {/* SMS Button */}
          <Pressable
            style={({ pressed }) => [styles.btnSms, pressed && styles.btnPressed]}
            onPress={handleSms}
            disabled={sending}
          >
            <LinearGradient
              colors={['#059669', '#047857']}
              style={styles.btnGradient}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="sms" size={22} color="#FFFFFF" />
                  <View style={styles.btnTextWrap}>
                    <Text style={styles.btnTitle}>Send via SMS</Text>
                    <Text style={styles.btnSub}>Direct send from SIM (no app opens)</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* WhatsApp Button */}
          <Pressable
            style={({ pressed }) => [styles.btnWhatsapp, pressed && styles.btnPressed]}
            onPress={handleWhatsapp}
            disabled={sending}
          >
            <LinearGradient
              colors={['#25D366', '#128C7E']}
              style={styles.btnGradient}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="chat" size={22} color="#FFFFFF" />
                  <View style={styles.btnTextWrap}>
                    <Text style={styles.btnTitle}>Send via WhatsApp</Text>
                    <Text style={styles.btnSub}>Opens WhatsApp with pre-filled message</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backdropFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    zIndex: 1,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 380,
    ...Shadow.xl,
  },
  iconWrap: {
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  shopHighlight: {
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  infoLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  mandatoryNote: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontWeight: FontWeight.medium,
  },
  btnSms: {
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  btnWhatsapp: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnTextWrap: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  btnTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  btnSub: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
});
