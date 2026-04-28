// Powered by OnSpace.AI
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TextInput,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useShops } from '@/hooks/useShops';
import { ApiService, Shop } from '@/services/api';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getTodayDayName, getTodayLabel, getTodayDateStr, capitalize } from '@/utils/format';
import { ShopCard } from '@/components/ui/ShopCard';
import { RecoveryBottomSheet } from '@/components/ui/RecoveryBottomSheet';
import { GpsVisitBottomSheet } from '@/components/ui/GpsVisitBottomSheet';
import { ShopDetailModal } from '@/components/ui/ShopDetailModal';
import { SuccessOverlay } from '@/components/ui/SuccessOverlay';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { PerformanceChart } from '@/components/ui/PerformanceChart';
import { RecoveryAnalysisChart } from '@/components/ui/RecoveryAnalysisChart';
import { NotificationChoice, NotificationMethod } from '@/components/ui/NotificationChoice';
import { DailyReportCard } from '@/components/ui/DailyReportCard';

type ChartView = 'trend' | 'analysis' | 'none';

export default function TodayRouteScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    todayShops,
    isLoadingToday,
    offlineQueueCount,
    isOnline,
    isSyncing,
    syncStatus,
    lastSyncTime,
    loadTodayShops,
    addToOfflineQueue,
    syncOfflineQueue,
  } = useShops();

  const [recoveryShop, setRecoveryShop] = useState<Shop | null>(null);
  const [detailShop, setDetailShop] = useState<Shop | null>(null);
  const [gpsVisitShop, setGpsVisitShop] = useState<Shop | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successState, setSuccessState] = useState<{
    visible: boolean;
    shopName: string;
    amount: number;
    isOffline: boolean;
  }>({ visible: false, shopName: '', amount: 0, isOffline: false });
  const [notifChoice, setNotifChoice] = useState<{
    visible: boolean;
    shopPhone: string;
    shopName: string;
    openingBalance: number;
    recoveryAmount: number;
    remainingBalance: number;
  }>({ visible: false, shopPhone: '', shopName: '', openingBalance: 0, recoveryAmount: 0, remainingBalance: 0 });
  const [visitedShopIds, setVisitedShopIds] = useState<Set<string>>(new Set());
  const [todayRecovery, setTodayRecovery] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [chartView, setChartView] = useState<ChartView>('trend');
  const [smsSentCount, setSmsSentCount] = useState(0);
  const [whatsappSentCount, setWhatsappSentCount] = useState(0);
  const [showReport, setShowReport] = useState(false);

  const todayDay = getTodayDayName();
  const isFriday = todayDay === 'friday';

  useEffect(() => {
    if (user) {
      loadTodayShops(user.id);
      loadTodayStats();
    }
  }, [user]);

  async function loadTodayStats() {
    if (!user) return;
    try {
      const res = await ApiService.getRecoverySummary(getTodayDateStr());
      const myEntry = res.orderbookers.find((ob) => ob.orderbookerId === user.id);
      if (myEntry) {
        setTodayRecovery(myEntry.totalRecovery);
        const visited = new Set(
          myEntry.shops.filter((s) => s.visited).map((s) => s.shopId)
        );
        setVisitedShopIds(visited);
      }
    } catch { /* not critical */ }
  }

  const handleRefresh = useCallback(async () => {
    if (user) {
      await loadTodayShops(user.id);
      await loadTodayStats();
    }
  }, [user]);

  const handleSync = async () => {
    if (offlineQueueCount === 0) return;
    const result = await syncOfflineQueue();
    if (result.synced > 0) {
      Alert.alert('Sync Complete', `${result.synced} ${result.synced === 1 ? 'recovery' : 'recoveries'} synced successfully.`);
      handleRefresh();
    } else if (result.failed > 0) {
      Alert.alert('Sync Failed', 'Could not sync recoveries. Please try again.');
    }
  };

  const handleSubmitRecovery = async (payload: {
    amount: number;
    description: string;
    gpsLat?: number;
    gpsLng?: number;
    gpsAddress?: string;
    markGpsVisit: boolean;
  }) => {
    if (!recoveryShop || !user) return;
    setIsSubmitting(true);
    const shopName = recoveryShop.name;
    const shopId = recoveryShop.id;
    const shopPhone = recoveryShop.phone;
    const openingBalance = recoveryShop.balance;
    try {
      if (isOnline) {
        await ApiService.submitRecovery({
          shopId,
          type: 'recovery',
          amount: payload.amount,
          createdBy: user.id,
          description: payload.description || undefined,
          gpsLat: payload.gpsLat,
          gpsLng: payload.gpsLng,
          gpsAddress: payload.gpsAddress,
        });
        setVisitedShopIds((prev) => new Set([...prev, shopId]));
        setTodayRecovery((prev) => prev + payload.amount);
        setSuccessState({ visible: true, shopName, amount: payload.amount, isOffline: false });

        // Show mandatory notification choice popup (SMS or WhatsApp)
        if (shopPhone) {
          const remainingBalance = openingBalance - payload.amount;
          setNotifChoice({
            visible: true,
            shopPhone,
            shopName,
            openingBalance,
            recoveryAmount: payload.amount,
            remainingBalance,
          });
        }
      } else {
        await addToOfflineQueue({
          localId: `local_${Date.now()}`,
          shopId,
          shopName,
          amount: payload.amount,
          description: payload.description,
          gpsLat: payload.gpsLat,
          gpsLng: payload.gpsLng,
          gpsAddress: payload.gpsAddress,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        });
        // Mark GPS visit even when offline
        if (payload.markGpsVisit) {
          setVisitedShopIds((prev) => new Set([...prev, shopId]));
        }
        setSuccessState({ visible: true, shopName, amount: payload.amount, isOffline: true });
      }
      setRecoveryShop(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit recovery. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGpsVisitMarked = (shopId: string) => {
    setVisitedShopIds((prev) => new Set([...prev, shopId]));
  };

  const filteredShops = searchQuery.trim()
    ? todayShops.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : todayShops;

  const totalOutstanding = todayShops.reduce((sum, s) => sum + s.balance, 0);
  const visitedCount = visitedShopIds.size;
  const progressPct = todayShops.length > 0 ? (visitedCount / todayShops.length) * 100 : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <OfflineBanner
        isOnline={isOnline}
        queueCount={offlineQueueCount}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onSync={handleSync}
      />

      {isFriday ? (
        <View style={styles.holidayContainer}>
          <LinearGradient colors={['#FEF3C7', '#FFFBEB']} style={styles.holidayGradient}>
            <MaterialIcons name="wb-sunny" size={64} color={Colors.secondary} />
            <Text style={styles.holidayTitle}>Friday — Day Off</Text>
            <Text style={styles.holidaySubtitle}>No route scheduled today. Enjoy your day!</Text>
          </LinearGradient>
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingToday}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Hero header */}
              <LinearGradient
                colors={['#059669', '#065F46']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                {/* Decorative circles */}
                <View style={styles.heroBubble1} />
                <View style={styles.heroBubble2} />

                <View style={styles.heroTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroGreeting}>
                      {user ? `Hello, ${user.name.split(' ')[0]} 👋` : "Today's Route"}
                    </Text>
                    <Text style={styles.heroDate}>{getTodayLabel()}</Text>
                  </View>
                  <View style={styles.heroDayBadge}>
                    <MaterialIcons name="route" size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.heroDayText}>{capitalize(todayDay)}</Text>
                  </View>
                  <Pressable style={styles.reportBadge} onPress={() => setShowReport(true)} hitSlop={8}>
                    <MaterialIcons name="assessment" size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.heroDayText}>Report</Text>
                  </Pressable>
                </View>

                {/* Progress */}
                <View style={styles.heroProgress}>
                  <View style={styles.heroProgressRow}>
                    <Text style={styles.heroProgressLabel}>
                      {visitedCount} of {todayShops.length} shops visited
                    </Text>
                    <Text style={styles.heroProgressPct}>{progressPct.toFixed(0)}%</Text>
                  </View>
                  <View style={styles.heroProgressTrack}>
                    <View
                      style={[styles.heroProgressFill, { width: `${Math.min(progressPct, 100)}%` }]}
                    />
                    {/* Glow dot at progress tip */}
                    {progressPct > 5 && progressPct < 100 ? (
                      <View style={[styles.heroPrgDot, { left: `${Math.min(progressPct, 100)}%` }]} />
                    ) : null}
                  </View>
                </View>

                {/* Stat pills */}
                <View style={styles.heroPills}>
                  <View style={styles.heroPill}>
                    <Text style={styles.heroPillValue}>{todayShops.length}</Text>
                    <Text style={styles.heroPillLabel}>Shops</Text>
                  </View>
                  <View style={styles.heroPillDivider} />
                  <View style={styles.heroPill}>
                    <Text style={styles.heroPillValue}>
                      {totalOutstanding >= 1000000
                        ? `${(totalOutstanding / 1000000).toFixed(1)}M`
                        : totalOutstanding >= 1000
                        ? `${(totalOutstanding / 1000).toFixed(0)}K`
                        : String(totalOutstanding)}
                    </Text>
                    <Text style={styles.heroPillLabel}>Outstanding</Text>
                  </View>
                  <View style={styles.heroPillDivider} />
                  <View style={styles.heroPill}>
                    <Text style={[styles.heroPillValue, styles.heroPillGreen]}>
                      {todayRecovery >= 1000000
                        ? `${(todayRecovery / 1000000).toFixed(1)}M`
                        : todayRecovery >= 1000
                        ? `${(todayRecovery / 1000).toFixed(0)}K`
                        : String(todayRecovery)}
                    </Text>
                    <Text style={styles.heroPillLabel}>Recovered</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Chart section */}
              {user ? (
                <View style={styles.chartSection}>
                  {/* Chart tab switcher */}
                  <View style={styles.chartTabRow}>
                    {(
                      [
                        { key: 'trend', icon: 'show-chart', label: 'Trend' },
                        { key: 'analysis', icon: 'analytics', label: 'Analysis' },
                        { key: 'none', icon: 'visibility-off', label: 'Hide' },
                      ] as { key: ChartView; icon: string; label: string }[]
                    ).map((opt) => (
                      <Pressable
                        key={opt.key}
                        style={[
                          styles.chartTabBtn,
                          chartView === opt.key && styles.chartTabBtnActive,
                        ]}
                        onPress={() => setChartView(opt.key)}
                        hitSlop={4}
                      >
                        <MaterialIcons
                          name={opt.icon as any}
                          size={14}
                          color={chartView === opt.key ? Colors.primaryDark : Colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.chartTabLabel,
                            chartView === opt.key && styles.chartTabLabelActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {chartView === 'trend' ? (
                    <PerformanceChart userId={user.id} />
                  ) : chartView === 'analysis' ? (
                    <RecoveryAnalysisChart userId={user.id} />
                  ) : null}
                </View>
              ) : null}

              {/* Search bar */}
              <View style={styles.searchRow}>
                <MaterialIcons name="search" size={18} color={Colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search shops, areas, owners..."
                  placeholderTextColor={Colors.textMuted}
                />
                {searchQuery ? (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    hitSlop={8}
                    style={styles.searchClear}
                  >
                    <MaterialIcons name="cancel" size={16} color={Colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              {/* Shop count row */}
              <View style={styles.shopCountRow}>
                <View style={styles.shopCountLeft}>
                  <View style={styles.shopCountDot} />
                  <Text style={styles.shopCountText}>
                    {filteredShops.length} {filteredShops.length === 1 ? 'shop' : 'shops'}
                    {searchQuery ? ` matching "${searchQuery}"` : ' on route'}
                  </Text>
                </View>
                {visitedCount > 0 ? (
                  <View style={styles.visitedChip}>
                    <MaterialIcons name="check-circle" size={12} color={Colors.primary} />
                    <Text style={styles.visitedChipText}>{visitedCount} visited</Text>
                  </View>
                ) : null}
              </View>
            </View>
          }
          ListEmptyComponent={
            !isLoadingToday ? (
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.background]}
                  style={styles.emptyGradient}
                >
                  <MaterialIcons name="store-mall-directory" size={56} color={Colors.primary} />
                  <Text style={styles.emptyTitle}>
                    {searchQuery ? 'No shops found' : 'No shops for today'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? 'Try a different search term'
                      : "No shops are scheduled for today's route"}
                  </Text>
                </LinearGradient>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ShopCard
              shop={item}
              isVisited={visitedShopIds.has(item.id)}
              onCollect={() => setRecoveryShop(item)}
              onPress={() => setDetailShop(item)}
              onGpsVisit={() => setGpsVisitShop(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <RecoveryBottomSheet
        visible={recoveryShop !== null}
        shop={recoveryShop}
        onClose={() => setRecoveryShop(null)}
        onSubmit={handleSubmitRecovery}
        isSubmitting={isSubmitting}
      />

      <GpsVisitBottomSheet
        visible={gpsVisitShop !== null}
        shop={gpsVisitShop}
        onClose={() => setGpsVisitShop(null)}
        onVisitMarked={handleGpsVisitMarked}
      />

      <ShopDetailModal
        visible={detailShop !== null}
        shop={detailShop}
        onClose={() => setDetailShop(null)}
        onCollect={() => {
          setRecoveryShop(detailShop);
          setDetailShop(null);
        }}
      />

      <SuccessOverlay
        visible={successState.visible}
        shopName={successState.shopName}
        amount={successState.amount}
        isOffline={successState.isOffline}
        onDismiss={() => setSuccessState((s) => ({ ...s, visible: false }))}
      />
      <NotificationChoice
        visible={notifChoice.visible}
        payload={notifChoice.visible ? {
          shopPhone: notifChoice.shopPhone,
          shopName: notifChoice.shopName,
          openingBalance: notifChoice.openingBalance,
          recoveryAmount: notifChoice.recoveryAmount,
          remainingBalance: notifChoice.remainingBalance,
        } : null}
        onDone={(method: NotificationMethod) => {
          setNotifChoice((s) => ({ ...s, visible: false }));
          if (method === 'sms') setSmsSentCount((c) => c + 1);
          else if (method === 'whatsapp') setWhatsappSentCount((c) => c + 1);
        }}
      />
      <DailyReportCard
        visible={showReport}
        onClose={() => setShowReport(false)}
        shopsVisited={visitedCount}
        totalShops={todayShops.length}
        totalRecovery={todayRecovery}
        smsSent={smsSentCount}
        whatsappSent={whatsappSentCount}
        orderbookerName={user?.name || 'Orderbooker'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: Spacing.xxl + 16,
  },
  // Hero
  heroCard: {
    margin: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  heroBubble1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    right: -40,
  },
  heroBubble2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -30,
    left: -20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  heroGreeting: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  heroDate: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
  heroDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(250,204,21,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.4)',
  },
  heroDayText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroProgress: {
    marginBottom: Spacing.md,
  },
  heroProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroProgressLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FontWeight.medium,
  },
  heroProgressPct: {
    fontSize: FontSize.xs,
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },
  heroProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radius.full,
    overflow: 'visible',
  },
  heroProgressFill: {
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
  },
  heroPrgDot: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginLeft: -7,
    shadowColor: '#fff',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  heroPills: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  heroPill: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroPillDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroPillValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  heroPillGreen: { color: '#A7F3D0' },
  heroPillLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  // Chart section
  chartSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  chartTabRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: 4,
    ...Shadow.sm,
  },
  chartTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  chartTabBtnActive: {
    backgroundColor: Colors.primaryLight,
  },
  chartTabLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textMuted,
  },
  chartTabLabelActive: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  searchClear: {
    padding: 2,
  },
  shopCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  shopCountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shopCountDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  shopCountText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  visitedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  visitedChipText: {
    fontSize: FontSize.xs,
    color: Colors.primaryDark,
    fontWeight: FontWeight.semibold,
  },
  // Empty
  emptyContainer: {
    margin: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  emptyGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
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
    lineHeight: 22,
  },
  // Holiday
  holidayContainer: {
    flex: 1,
    margin: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  holidayGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  holidayTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  holidaySubtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
