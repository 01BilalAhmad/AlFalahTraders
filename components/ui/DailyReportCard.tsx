import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getTodayLabel } from '@/utils/format';


interface DailyReportProps {
  visible: boolean;
  onClose: () => void;
  shopsVisited: number;
  totalShops: number;
  totalRecovery: number;
  smsSent: number;
  whatsappSent: number;
  pendingMessages: number;
  orderbookerName: string;
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) return `Rs.${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `Rs.${(amount / 1000).toFixed(1)}K`;
  return `Rs.${amount.toLocaleString()}`;
}

export function DailyReportCard({
  visible,
  onClose,
  shopsVisited,
  totalShops,
  totalRecovery,
  smsSent,
  whatsappSent,
  pendingMessages,
  orderbookerName,
}: DailyReportProps) {
  const cardRef = useRef<View>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const totalMessages = smsSent + whatsappSent;
  const todayLabel = getTodayLabel();
  const visitPct = totalShops > 0 ? Math.round((shopsVisited / totalShops) * 100) : 0;

  const buildTextMessage = () => {
    return [
      `📋 *Al FALAH Credit System*`,
      `📊 Daily Recovery Report`,
      ``,
      `📅 ${todayLabel}`,
      `👤 ${orderbookerName}`,
      ``,
      `🏪 Shops: ${shopsVisited}/${totalShops} visited (${visitPct}%)`,
      `💰 Recovery: ${formatAmount(totalRecovery)}`,
      `📩 SMS: ${smsSent} | WhatsApp: ${whatsappSent}`,
      pendingMessages > 0 ? `⚠️ ${pendingMessages} pending` : '',
      ``,
      `_Powered by Al FALAH Credit System_`,
    ].filter(Boolean).join('\n');
  };

  const handleShareAsImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      // Step 1: Capture the card as a PNG image
      const imageUri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
        snapshotContentContainer: true,
      });

      if (!imageUri) {
        throw new Error('Image capture returned empty URI');
      }

      console.log('Image captured at:', imageUri);

      // Step 2: Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing not available on this device');
      }

      // Step 3: Open native share sheet with the image file
      // expo-sharing properly shares files on Android (unlike Share.share)
      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share Report to WhatsApp',
        UTI: 'public.png',
      });
    } catch (error: any) {
      console.error('Image capture/share failed:', error);

      // Fallback: Share as text message
      Alert.alert(
        'Image Share Failed',
        'Kya aap text message mein share karna chahte hain?',
        [
          {
            text: 'Haan, Text Share Karo',
            onPress: async () => {
              try {
                const { default: RNShare } = await import('react-native');
                await RNShare.Share.share({ message: buildTextMessage() });
              } catch {
                // User cancelled
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setIsCapturing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.backdropFade} />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollCenter}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Close button */}
          <Pressable style={styles.closeTop} onPress={onClose} hitSlop={12}>
            <View style={styles.closeTopBtn}>
              <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.9)" />
            </View>
          </Pressable>

          {/* ============================================= */}
          {/* REPORT CARD — uses solid bg (NOT LinearGradient) */}
          {/* so captureRef can properly capture it as image */}
          {/* ============================================= */}
          <View ref={cardRef} collapsable={false} style={styles.card}>
            {/* Gradient overlay effect using semi-transparent views */}
            <View style={styles.gradientOverlayTop} />

            {/* Brand Header */}
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <MaterialIcons name="account-balance" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.brandTextWrap}>
                <Text style={styles.brandName}>Al FALAH Credit System</Text>
                <Text style={styles.brandSub}>Daily Recovery Report</Text>
              </View>
            </View>

            {/* Separator */}
            <View style={styles.separator}>
              <View style={styles.sepLine} />
              <View style={styles.sepDiamond} />
              <View style={styles.sepLine} />
            </View>

            {/* Date & Name */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <MaterialIcons name="calendar-today" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.infoText}>{todayLabel}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="person-outline" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.infoText}>{orderbookerName}</Text>
              </View>
            </View>

            {/* Main Stat - Visit Progress */}
            <View style={styles.mainStatCard}>
              <View style={styles.mainStatLeft}>
                <Text style={styles.mainStatValue}>{shopsVisited}/{totalShops}</Text>
                <Text style={styles.mainStatLabel}>Shops Visited</Text>
              </View>
              <View style={styles.mainStatRight}>
                <View style={styles.progressRingBg}>
                  <View style={[styles.progressRingFill, { height: `${visitPct}%` }]} />
                </View>
                <Text style={styles.progressPct}>{visitPct}%</Text>
              </View>
            </View>

            {/* Recovery Amount - Highlight */}
            <View style={styles.recoveryHighlight}>
              <MaterialIcons name="payments" size={18} color="#FDE68A" />
              <Text style={styles.recoveryAmount}>{formatAmount(totalRecovery)}</Text>
              <Text style={styles.recoveryLabel}>Total Recovery</Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(96,165,250,0.2)' }]}>
                  <MaterialIcons name="sms" size={18} color="#60A5FA" />
                </View>
                <Text style={styles.statValue}>{smsSent}</Text>
                <Text style={styles.statLabel}>SMS</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(74,222,128,0.2)' }]}>
                  <MaterialIcons name="chat" size={18} color="#4ADE80" />
                </View>
                <Text style={styles.statValue}>{whatsappSent}</Text>
                <Text style={styles.statLabel}>WhatsApp</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(250,204,21,0.2)' }]}>
                  <MaterialIcons name="notifications-active" size={18} color="#FACC15" />
                </View>
                <Text style={styles.statValue}>{totalMessages}</Text>
                <Text style={styles.statLabel}>Total Sent</Text>
              </View>

              {pendingMessages > 0 ? (
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                    <MaterialIcons name="warning" size={18} color="#F87171" />
                  </View>
                  <Text style={[styles.statValue, { color: '#FCA5A5' }]}>{pendingMessages}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              ) : (
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(167,243,208,0.2)' }]}>
                    <MaterialIcons name="check-circle" size={18} color="#A7F3D0" />
                  </View>
                  <Text style={[styles.statValue, { color: '#A7F3D0' }]}>0</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              )}
            </View>

            {/* Pending Warning */}
            {pendingMessages > 0 ? (
              <View style={styles.pendingBanner}>
                <MaterialIcons name="error-outline" size={16} color="#FDE68A" />
                <Text style={styles.pendingBannerText}>
                  {pendingMessages} message{pendingMessages > 1 ? 's' : ''} pending — send now!
                </Text>
              </View>
            ) : null}

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerDot} />
              <Text style={styles.footerText}>
                {todayLabel} · Al FALAH Credit System
              </Text>
            </View>
          </View>

          {/* Share Button */}
          <Pressable
            style={[styles.shareBtn, isCapturing && styles.shareBtnDisabled]}
            onPress={handleShareAsImage}
            disabled={isCapturing}
          >
            <View style={[styles.shareBtnInner, isCapturing && styles.shareBtnInnerDisabled]}>
              {isCapturing ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.shareBtnText}>Generating Image...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="share" size={20} color="#FFFFFF" />
                  <Text style={styles.shareBtnText}>Share as Picture</Text>
                </>
              )}
            </View>
          </Pressable>
        </View>
      </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  scrollCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    zIndex: 1,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    position: 'relative',
  },
  closeTop: {
    position: 'absolute',
    top: -4,
    right: 0,
    zIndex: 10,
  },
  closeTopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== REPORT CARD (Solid bg for captureRef) =====
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    backgroundColor: '#047857', // Solid green — captures properly with view-shot
    overflow: 'hidden',
    ...Shadow.lg,
  },
  // Gradient-like overlay effect (pure RN Views, captures correctly)
  gradientOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(5,150,105,0.6)', // Lighter green overlay at top
    borderRadius: Radius.xl,
  },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    zIndex: 1,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextWrap: {
    flex: 1,
  },
  brandName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
    fontWeight: FontWeight.medium,
  },
  // Separator
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sepLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sepDiamond: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ rotate: '45deg' }],
  },
  // Info
  infoSection: {
    gap: 4,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: FontWeight.medium,
  },
  // Main Stat - Visited
  mainStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mainStatLeft: {
    flex: 1,
  },
  mainStatValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  mainStatLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainStatRight: {
    alignItems: 'center',
    gap: 4,
  },
  progressRingBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  progressRingFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#A7F3D0',
    borderRadius: 19,
  },
  progressPct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#A7F3D0',
  },
  // Recovery Highlight
  recoveryHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.2)',
  },
  recoveryAmount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#FDE68A',
  },
  recoveryLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: FontWeight.medium,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // Pending Warning
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(250,204,21,0.12)',
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.25)',
  },
  pendingBannerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#FDE68A',
    flex: 1,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  footerDot: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: Spacing.sm,
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: FontWeight.medium,
  },

  // ===== Share Button =====
  shareBtn: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.md,
  },
  shareBtnDisabled: {
    opacity: 0.7,
  },
  shareBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    backgroundColor: '#047857',
  },
  shareBtnInnerDisabled: {
    backgroundColor: '#4B5563',
  },
  shareBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
});
