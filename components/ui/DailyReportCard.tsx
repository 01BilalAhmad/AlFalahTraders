// Powered by OnSpace.AI
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Share,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ViewShot, captureRef } from 'react-native-view-shot';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getTodayLabel, getTodayDayName, capitalize } from '@/utils/format';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface DailyReportProps {
  visible: boolean;
  onClose: () => void;
  shopsVisited: number;
  totalShops: number;
  totalRecovery: number;
  smsSent: number;
  whatsappSent: number;
  orderbookerName: string;
}

export function DailyReportCard({
  visible,
  onClose,
  shopsVisited,
  totalShops,
  totalRecovery,
  smsSent,
  whatsappSent,
  orderbookerName,
}: DailyReportProps) {
  const cardRef = useRef<ViewShot>(null);

  const totalMessages = smsSent + whatsappSent;
  const todayDay = getTodayDayName();
  const todayLabel = getTodayLabel();

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (cardRef.current) {
        const uri = await cardRef.current.capture();
        await Share.share({
          url: uri,
          message: `📅 Daily Report - ${capitalize(todayDay)}\n\n✅ ${shopsVisited}/${totalShops} shops visited\n💰 Rs. ${totalRecovery.toLocaleString()} recovery collected\n📩 ${totalMessages} notifications sent`,
        });
      }
    } catch (err) {
      console.error('[DailyReport] Share error:', err);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.backdropFade} />
      </Pressable>

      <View style={styles.center}>
        {/* Report Card - captured for sharing */}
        <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }} style={styles.cardWrap}>
          <LinearGradient
            colors={['#059669', '#047857', '#065F46']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Decorative circles */}
            <View style={styles.deco1} />
            <View style={styles.deco2} />
            <View style={styles.deco3} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoWrap}>
                <MaterialIcons name="store" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.brandName}>AlFalah Traders</Text>
                <Text style={styles.headerSub}>Daily Recovery Report</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDot} />
              <View style={styles.dividerLine} />
            </View>

            {/* Date & Orderbooker */}
            <View style={styles.dateRow}>
              <MaterialIcons name="calendar-today" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.dateText}>{todayLabel}</Text>
            </View>
            <View style={styles.obRow}>
              <MaterialIcons name="person" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.obText}>{orderbookerName}</Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {/* Shops Visited */}
              <View style={styles.statBox}>
                <View style={styles.statIconWrap}>
                  <MaterialIcons name="storefront" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{shopsVisited}/{totalShops}</Text>
                <Text style={styles.statLabel}>Shops Visited</Text>
              </View>

              {/* Total Recovery */}
              <View style={styles.statBox}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(250,204,21,0.25)' }]}>
                  <MaterialIcons name="payments" size={20} color="#FACC15" />
                </View>
                <Text style={styles.statValue}>Rs.{(totalRecovery / 1000).toFixed(1)}K</Text>
                <Text style={styles.statLabel}>Total Recovery</Text>
              </View>

              {/* SMS Sent */}
              <View style={styles.statBox}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(59,130,246,0.25)' }]}>
                  <MaterialIcons name="sms" size={20} color="#60A5FA" />
                </View>
                <Text style={styles.statValue}>{smsSent}</Text>
                <Text style={styles.statLabel}>SMS Sent</Text>
              </View>

              {/* WhatsApp Sent */}
              <View style={styles.statBox}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(37,211,102,0.25)' }]}>
                  <MaterialIcons name="chat" size={20} color="#4ADE80" />
                </View>
                <Text style={styles.statValue}>{whatsappSent}</Text>
                <Text style={styles.statLabel}>WhatsApp Sent</Text>
              </View>
            </View>

            {/* Total Messages Badge */}
            <View style={styles.totalBadge}>
              <MaterialIcons name="notifications-active" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.totalBadgeText}>
                {totalMessages} Total Notifications Sent
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={styles.footerText}>
                Powered by OnSpace.AI • {todayLabel}
              </Text>
            </View>
          </LinearGradient>
        </ViewShot>

        {/* Action Buttons (outside card, not captured) */}
        <View style={styles.actions}>
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <LinearGradient colors={['#059669', '#047857']} style={styles.shareBtnGradient}>
              <MaterialIcons name="share" size={20} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>Share Report</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    zIndex: 1,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    ...Shadow.xl,
  },
  card: {
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    overflow: 'hidden',
  },
  // Decorative
  deco1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -50,
    right: -40,
  },
  deco2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -30,
    left: -20,
  },
  deco3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.02)',
    top: 120,
    left: '60%',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  brandName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  // Date & OB
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dateText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FontWeight.medium,
  },
  obRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  obText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statBox: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: FontWeight.medium,
  },
  // Total Badge
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  totalBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  footerLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: Spacing.sm,
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  shareBtn: {
    flex: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  shareBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
  },
  shareBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  closeBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
});
