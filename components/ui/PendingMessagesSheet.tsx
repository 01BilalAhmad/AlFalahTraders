// Powered by OnSpace.AI
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { PendingNotification } from '@/services/storage';
import { sendRecoverySms } from '@/utils/sendRecoverySms';
import { sendRecoveryWhatsapp } from '@/utils/sendRecoveryWhatsapp';
import { formatPKR } from '@/utils/format';

interface PendingMessagesSheetProps {
  visible: boolean;
  pendingList: PendingNotification[];
  onSendSms: (id: string) => void;
  onSendWhatsapp: (id: string) => void;
  onClose: () => void;
  onRefresh: () => void;
}

export function PendingMessagesSheet({
  visible,
  pendingList,
  onSendSms,
  onSendWhatsapp,
  onClose,
  onRefresh,
}: PendingMessagesSheetProps) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 12,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(600);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleSendSms = async (item: PendingNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sendRecoverySms({
        shopPhone: item.shopPhone,
        shopName: item.shopName,
        openingBalance: item.openingBalance,
        recoveryAmount: item.recoveryAmount,
        remainingBalance: item.remainingBalance,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSendSms(item.id);
    } catch (err) {
      console.error('[PendingMessages] SMS error:', err);
      Alert.alert('Error', 'Failed to send SMS. Please try again.');
    }
  };

  const handleSendWhatsapp = async (item: PendingNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sendRecoveryWhatsapp({
        shopPhone: item.shopPhone,
        shopName: item.shopName,
        openingBalance: item.openingBalance,
        recoveryAmount: item.recoveryAmount,
        remainingBalance: item.remainingBalance,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSendWhatsapp(item.id);
    } catch (err) {
      console.error('[PendingMessages] WhatsApp error:', err);
    }
  };

  const renderItem = ({ item }: { item: PendingNotification }) => (
    <View style={styles.pendingCard}>
      {/* Shop info */}
      <View style={styles.pendingInfo}>
        <View style={styles.pendingIconWrap}>
          <MaterialIcons name="store" size={18} color={Colors.danger} />
        </View>
        <View style={styles.pendingDetails}>
          <Text style={styles.pendingShopName} numberOfLines={1}>
            {item.shopName}
          </Text>
          <Text style={styles.pendingArea} numberOfLines={1}>
            {item.area}
          </Text>
          <View style={styles.pendingAmountRow}>
            <View style={styles.pendingDot} />
            <Text style={styles.pendingAmountText}>
              Recovery: {formatPKR(item.recoveryAmount)}
            </Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.pendingActions}>
        <Pressable
          style={({ pressed }) => [styles.pendingBtnSms, pressed && styles.btnPressed]}
          onPress={() => handleSendSms(item)}
        >
          <LinearGradient colors={['#059669', '#047857']} style={styles.pendingBtnGradient}>
            <MaterialIcons name="sms" size={16} color="#FFFFFF" />
            <Text style={styles.pendingBtnText}>SMS</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.pendingBtnWa, pressed && styles.btnPressed]}
          onPress={() => handleSendWhatsapp(item)}
        >
          <LinearGradient colors={['#25D366', '#128C7E']} style={styles.pendingBtnGradient}>
            <MaterialIcons name="chat" size={16} color="#FFFFFF" />
            <Text style={styles.pendingBtnText}>WhatsApp</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none">
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.backdropFade, { opacity: opacityAnim }]} />
      </Pressable>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheetContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <View style={styles.sheetIconWrap}>
                <MaterialIcons name="pending-actions" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Pending Messages</Text>
                <Text style={styles.sheetSubtitle}>
                  Send recovery notifications to these shops
                </Text>
              </View>
            </View>
            <View style={styles.sheetBadge}>
              <Text style={styles.sheetBadgeText}>{pendingList.length}</Text>
            </View>
          </View>

          {/* Mandatory note */}
          <View style={styles.noteCard}>
            <MaterialIcons name="info" size={14} color={Colors.danger} />
            <Text style={styles.noteText}>
              These shops have recovery recorded but no notification sent yet. Sending message is compulsory.
            </Text>
          </View>

          {/* List */}
          {pendingList.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="check-circle" size={48} color={Colors.success} />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>
                All recovery notifications have been sent
              </Text>
            </View>
          ) : (
            <FlatList
              data={pendingList}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              maxToRenderPerBatch={10}
            />
          )}

          {/* Footer buttons */}
          <View style={styles.footerActions}>
            {pendingList.length > 0 && (
              <Pressable style={styles.footerRefreshBtn} onPress={onRefresh}>
                <MaterialIcons name="refresh" size={16} color={Colors.primary} />
                <Text style={styles.footerRefreshText}>Refresh</Text>
              </Pressable>
            )}
            <Pressable style={styles.footerCloseBtn} onPress={onClose}>
              <MaterialIcons name="close" size={16} color={Colors.textSecondary} />
              <Text style={styles.footerCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingTop: Spacing.sm,
    maxHeight: '85%',
    ...Shadow.xl,
  },
  handleWrap: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sheetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  sheetSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sheetBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  sheetBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  noteText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.danger,
    lineHeight: 18,
    fontWeight: FontWeight.medium,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  pendingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pendingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDetails: {
    flex: 1,
  },
  pendingShopName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  pendingArea: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  pendingAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  pendingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  pendingAmountText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pendingBtnSms: {
    flex: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  pendingBtnWa: {
    flex: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  pendingBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
  },
  pendingBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footerRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
  },
  footerRefreshText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primaryDark,
  },
  footerCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
  },
  footerCloseText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
});
