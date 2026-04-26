// Powered by OnSpace.AI
import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { Shop } from '@/services/api';
import { formatPKR } from '@/utils/format';
import { Badge } from './Badge';

interface ShopCardProps {
  shop: Shop;
  isVisited: boolean;
  onCollect: () => void;
  onPress: () => void;
}

export const ShopCard = memo(function ShopCard({
  shop,
  isVisited,
  onCollect,
  onPress,
}: ShopCardProps) {
  const isOverLimit = shop.balance > shop.creditLimit;
  const utilisation = shop.creditLimit > 0 ? Math.min((shop.balance / shop.creditLimit) * 100, 100) : 0;
  const barColor = isOverLimit ? Colors.danger : utilisation > 80 ? Colors.secondary : Colors.primary;

  const handleCall = () => {
    if (shop.phone) Linking.openURL(`tel:${shop.phone}`);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Top row: Avatar + Info + Balance */}
      <View style={styles.topRow}>
        <View style={styles.shopAvatar}>
          <Text style={styles.shopAvatarText}>{shop.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
          <Text style={styles.shopMeta} numberOfLines={1}>
            {shop.ownerName}  ·  {shop.area}
          </Text>
        </View>
        <View style={styles.balanceCol}>
          <Text style={[styles.balance, { color: shop.balance > 0 ? Colors.danger : Colors.primary }]}>
            {formatPKR(shop.balance)}
          </Text>
          {isVisited ? (
            <View style={styles.visitedBadge}>
              <MaterialIcons name="check-circle" size={11} color={Colors.primary} />
              <Text style={styles.visitedText}>Visited</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Over limit banner */}
      {isOverLimit ? (
        <View style={styles.overLimitBanner}>
          <MaterialIcons name="warning" size={13} color={Colors.danger} />
          <Text style={styles.overLimitText}>Over Credit Limit</Text>
        </View>
      ) : null}

      {/* Credit utilisation bar */}
      <View style={styles.creditRow}>
        <View style={styles.creditTrack}>
          <View style={[styles.creditFill, { width: `${utilisation}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[styles.creditPct, { color: barColor }]}>
          {utilisation.toFixed(0)}%
        </Text>
      </View>
      <Text style={styles.creditLabel}>
        Credit: {formatPKR(shop.balance)} / {formatPKR(shop.creditLimit)}
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.collectBtn, pressed && styles.collectBtnPressed]}
          onPress={onCollect}
          hitSlop={4}
        >
          <MaterialIcons name="payments" size={16} color={Colors.textInverse} />
          <Text style={styles.collectBtnText}>Collect Recovery</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.callBtn, pressed && styles.callBtnPressed]}
          onPress={handleCall}
          hitSlop={4}
        >
          <MaterialIcons name="call" size={18} color={Colors.primary} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.detailBtn, pressed && styles.detailBtnPressed]}
          onPress={onPress}
          hitSlop={4}
        >
          <MaterialIcons name="info-outline" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardPressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  shopAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  shopMeta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  balanceCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  balance: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  visitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  visitedText: {
    fontSize: 10,
    color: Colors.primaryDark,
    fontWeight: FontWeight.semibold,
  },
  overLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginBottom: Spacing.xs,
  },
  overLimitText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: FontWeight.semibold,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 3,
  },
  creditTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  creditFill: {
    height: 6,
    borderRadius: Radius.full,
  },
  creditPct: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    minWidth: 32,
    textAlign: 'right',
  },
  creditLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  collectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
  },
  collectBtnPressed: { opacity: 0.85 },
  collectBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textInverse,
  },
  callBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  callBtnPressed: { opacity: 0.7 },
  detailBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  detailBtnPressed: { opacity: 0.7 },
});
