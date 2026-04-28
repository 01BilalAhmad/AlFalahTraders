// Powered by OnSpace.AI
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { Shop } from '@/services/api';
import { formatPKR } from '@/utils/format';
import { QUICK_AMOUNTS, MIN_RECOVERY, MAX_RECOVERY } from '@/constants/config';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface RecoveryBottomSheetProps {
  visible: boolean;
  shop: Shop | null;
  onClose: () => void;
  onSubmit: (payload: {
    amount: number;
    description: string;
    gpsLat?: number;
    gpsLng?: number;
    gpsAddress?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

function getOsmStaticUrl(lat: number, lng: number): string {
  const zoom = 16;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=600x260&markers=${lat},${lng},red`;
}

// Animated pulse for GPS indicator
function GpsPulse({ active }: { active: boolean }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    if (!active) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [active]);

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <View style={pulseStyles.outer}>
        <View style={pulseStyles.inner} />
      </View>
    </Animated.View>
  );
}
const pulseStyles = StyleSheet.create({
  outer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(5, 150, 105, 0.3)',
  },
});

export function RecoveryBottomSheet({
  visible,
  shop,
  onClose,
  onSubmit,
  isSubmitting,
}: RecoveryBottomSheetProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [gpsLat, setGpsLat] = useState<number | undefined>();
  const [gpsLng, setGpsLng] = useState<number | undefined>();
  const [gpsAddress, setGpsAddress] = useState<string | undefined>();
  const [capturingGps, setCapturingGps] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'amount' | 'note' | null>(null);

  const reset = useCallback(() => {
    setAmount('');
    setDescription('');
    setGpsLat(undefined);
    setGpsLng(undefined);
    setGpsAddress(undefined);
    setFocusedField(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleQuickAmount = (val: number) => {
    setAmount(String(val));
  };

  const captureGPS = async () => {
    setCapturingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to capture GPS.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGpsLat(loc.coords.latitude);
      setGpsLng(loc.coords.longitude);
      setMapLoading(true);
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo) {
        const parts = [geo.street, geo.district, geo.city].filter(Boolean);
        setGpsAddress(parts.join(', '));
      }
    } catch (e) {
      Alert.alert('GPS Error', 'Could not get location. Please try again.');
    } finally {
      setCapturingGps(false);
    }
  };

  const handleSubmit = async () => {
    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount < MIN_RECOVERY) {
      Alert.alert('Invalid Amount', `Minimum recovery amount is ${formatPKR(MIN_RECOVERY)}`);
      return;
    }
    if (numAmount > MAX_RECOVERY) {
      Alert.alert('Invalid Amount', `Maximum recovery amount is ${formatPKR(MAX_RECOVERY)}`);
      return;
    }
    if (shop && numAmount > shop.balance) {
      Alert.alert(
        'Exceeds Balance',
        `Recovery amount exceeds shop balance of ${formatPKR(shop.balance)}`
      );
      return;
    }
    await onSubmit({ amount: numAmount, description, gpsLat, gpsLng, gpsAddress });
    reset();
  };

  if (!shop) return null;

  const numericAmount = parseInt(amount, 10) || 0;
  const utilisationPct = shop.creditLimit > 0 ? Math.min((shop.balance / shop.creditLimit) * 100, 100) : 0;
  const mapUrl = gpsLat && gpsLng ? getOsmStaticUrl(gpsLat, gpsLng) : null;
  const hasGps = !!(gpsLat && gpsLng);
  const isValid = numericAmount >= MIN_RECOVERY && numericAmount <= MAX_RECOVERY && (!shop || numericAmount <= shop.balance);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Modern gradient header */}
          <LinearGradient
            colors={['#059669', '#047857', '#065F46']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Decorative elements */}
            <View style={styles.headerBubble1} />
            <View style={styles.headerBubble2} />

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.shopAvatarWrap}>
                  <Text style={styles.shopAvatarText}>{shop.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.title}>Collect Recovery</Text>
                  <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                </View>
              </View>
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
                <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.9)" />
              </Pressable>
            </View>

            {/* Balance cards */}
            <View style={styles.balanceCardRow}>
              <View style={styles.balanceChip}>
                <View style={styles.balanceChipDot} />
                <View>
                  <Text style={styles.balanceChipLabel}>Outstanding</Text>
                  <Text style={[styles.balanceChipValue, { color: '#FCA5A5' }]}>
                    {formatPKR(shop.balance)}
                  </Text>
                </View>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceChip}>
                <View style={[styles.balanceChipDot, { backgroundColor: '#93C5FD' }]} />
                <View>
                  <Text style={styles.balanceChipLabel}>Credit Limit</Text>
                  <Text style={[styles.balanceChipValue, { color: '#93C5FD' }]}>
                    {formatPKR(shop.creditLimit)}
                  </Text>
                </View>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceChip}>
                <View style={[styles.balanceChipDot, { backgroundColor: utilisationPct > 80 ? '#FDE68A' : '#6EE7B7' }]} />
                <View>
                  <Text style={styles.balanceChipLabel}>Usage</Text>
                  <Text style={[styles.balanceChipValue, {
                    color: utilisationPct > 100 ? '#FCA5A5' : utilisationPct > 80 ? '#FDE68A' : '#6EE7B7'
                  }]}>
                    {utilisationPct.toFixed(0)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.miniProgress}>
              <View style={[styles.miniProgressFill, {
                width: `${Math.min(utilisationPct, 100)}%`,
                backgroundColor: utilisationPct > 100 ? '#FCA5A5' : utilisationPct > 80 ? '#FDE68A' : '#6EE7B7'
              }]} />
            </View>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.scrollView}>
            {/* Amount section - Modern calculator style */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="payments" size={16} color={Colors.primaryDark} />
                </View>
                <Text style={styles.sectionTitle}>Amount (PKR) *</Text>
              </View>

              <View style={[
                styles.amountInputWrap,
                focusedField === 'amount' && styles.amountInputFocused,
              ]}>
                <View style={styles.amountCurrencyTag}>
                  <Text style={styles.amountCurrencyText}>Rs.</Text>
                </View>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={7}
                  onFocus={() => setFocusedField('amount')}
                  onBlur={() => setFocusedField(null)}
                  autoFocus
                />
                {amount ? (
                  <Pressable onPress={() => setAmount('')} style={styles.amountClear} hitSlop={8}>
                    <MaterialIcons name="backspace" size={20} color={Colors.textMuted} />
                  </Pressable>
                ) : (
                  <MaterialIcons name="keyboard" size={20} color={Colors.textMuted} />
                )}
              </View>

              {/* Validation hint */}
              {amount && numericAmount > 0 && numericAmount < MIN_RECOVERY ? (
                <View style={styles.hintRow}>
                  <MaterialIcons name="info" size={13} color={Colors.secondary} />
                  <Text style={styles.hintText}>Min: {formatPKR(MIN_RECOVERY)}</Text>
                </View>
              ) : shop && numericAmount > shop.balance ? (
                <View style={styles.hintRow}>
                  <MaterialIcons name="warning" size={13} color={Colors.danger} />
                  <Text style={[styles.hintText, { color: Colors.danger }]}>Exceeds balance of {formatPKR(shop.balance)}</Text>
                </View>
              ) : null}

              {/* Quick amounts - Pill style */}
              <View style={styles.quickGrid}>
                {QUICK_AMOUNTS.map((val) => {
                  const isActive = amount === String(val);
                  return (
                    <Pressable
                      key={val}
                      style={({ pressed }) => [
                        styles.quickBtn,
                        isActive && styles.quickBtnActive,
                        pressed && styles.quickBtnPressed,
                      ]}
                      onPress={() => handleQuickAmount(val)}
                    >
                      <Text style={[styles.quickBtnText, isActive && styles.quickBtnTextActive]}>
                        {isActive ? '✓ ' : ''}{val >= 1000 ? `${val / 1000}K` : val}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Note section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="edit-note" size={16} color={Colors.textSecondary} />
                </View>
                <Text style={styles.sectionTitle}>Note</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalText}>Optional</Text>
                </View>
              </View>
              <View style={[
                styles.noteWrap,
                focusedField === 'note' && styles.noteWrapFocused,
              ]}>
                <TextInput
                  style={styles.noteInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Cash received, cheque, partial payment..."
                  placeholderTextColor={Colors.textMuted}
                  maxLength={200}
                  multiline
                  numberOfLines={2}
                  onFocus={() => setFocusedField('note')}
                  onBlur={() => setFocusedField(null)}
                />
                {description ? (
                  <Pressable
                    onPress={() => setDescription('')}
                    style={styles.noteClear}
                    hitSlop={8}
                  >
                    <MaterialIcons name="close" size={16} color={Colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* GPS section - Modern card style */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}>
                  <MaterialIcons name="my-location" size={16} color="#2563EB" />
                </View>
                <Text style={styles.sectionTitle}>GPS Location</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalText}>Optional</Text>
                </View>
                {hasGps ? (
                  <View style={styles.gpsStatusBadge}>
                    <GpsPulse active={hasGps} />
                    <Text style={styles.gpsStatusText}>Captured</Text>
                  </View>
                ) : null}
              </View>

              {hasGps ? (
                <View style={styles.gpsCard}>
                  {/* Map thumbnail */}
                  <View style={styles.mapContainer}>
                    {mapLoading ? (
                      <View style={styles.mapLoader}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.mapLoaderText}>Loading map...</Text>
                      </View>
                    ) : null}
                    {mapUrl ? (
                      <Image
                        source={{ uri: mapUrl }}
                        style={[styles.mapImage, mapLoading && { opacity: 0 }]}
                        contentFit="cover"
                        transition={300}
                        onLoad={() => setMapLoading(false)}
                        onError={() => setMapLoading(false)}
                      />
                    ) : null}
                    <View style={styles.mapPinOverlay}>
                      <View style={styles.mapPin}>
                        <MaterialIcons name="location-on" size={28} color={Colors.danger} />
                      </View>
                    </View>
                    <View style={styles.mapZoomBadge}>
                      <MaterialIcons name="zoom-in" size={12} color={Colors.textInverse} />
                      <Text style={styles.mapZoomText}>Street level</Text>
                    </View>
                  </View>

                  <View style={styles.gpsInfo}>
                    <View style={styles.coordsRow}>
                      <View style={styles.coordsBadge}>
                        <MaterialIcons name="gps-fixed" size={13} color={Colors.primaryDark} />
                        <Text style={styles.coordsText}>
                          {gpsLat!.toFixed(5)}, {gpsLng!.toFixed(5)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => { setGpsLat(undefined); setGpsLng(undefined); setGpsAddress(undefined); }}
                        style={styles.gpsRemoveBtn}
                        hitSlop={8}
                      >
                        <MaterialIcons name="delete-outline" size={16} color={Colors.danger} />
                      </Pressable>
                    </View>

                    {gpsAddress ? (
                      <View style={styles.addressRow}>
                        <MaterialIcons name="place" size={13} color={Colors.textSecondary} />
                        <Text style={styles.addressText} numberOfLines={2}>{gpsAddress}</Text>
                      </View>
                    ) : null}

                    <Pressable
                      onPress={captureGPS}
                      style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
                      disabled={capturingGps}
                    >
                      <MaterialIcons
                        name={capturingGps ? 'sync' : 'refresh'}
                        size={14}
                        color={Colors.primaryDark}
                        style={capturingGps ? { transform: [{ rotate: '180deg' }] } : {}}
                      />
                      <Text style={styles.retryBtnText}>
                        {capturingGps ? 'Updating...' : 'Update Location'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.captureBtn, pressed && styles.captureBtnPressed]}
                  onPress={captureGPS}
                  disabled={capturingGps}
                >
                  <View style={styles.captureBtnInner}>
                    <View style={styles.captureBtnIconWrap}>
                      {capturingGps ? (
                        <ActivityIndicator size="small" color="#2563EB" />
                      ) : (
                        <MaterialIcons name="add-location-alt" size={22} color="#2563EB" />
                      )}
                    </View>
                    <View style={styles.captureBtnTextWrap}>
                      <Text style={styles.captureBtnTitle}>
                        {capturingGps ? 'Getting location...' : 'Capture GPS Location'}
                      </Text>
                      <Text style={styles.captureBtnSub}>
                        {capturingGps ? 'Please wait...' : 'Verify your presence at the shop'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
                  </View>
                </Pressable>
              )}
            </View>

            <View style={styles.bottomPad} />
          </ScrollView>

          {/* Submit footer */}
          <View style={styles.footer}>
            {numericAmount > 0 && isValid ? (
              <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={styles.amountPreview}>
                <View>
                  <Text style={styles.amountPreviewLabel}>Recovery Amount</Text>
                  <Text style={styles.amountPreviewSub}>This will reduce the outstanding balance</Text>
                </View>
                <Text style={styles.amountPreviewValue}>{formatPKR(numericAmount)}</Text>
              </LinearGradient>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                (!isValid || isSubmitting) && styles.submitBtnDisabled,
                pressed && isValid && !isSubmitting && styles.submitBtnPressed,
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                  <Text style={styles.submitBtnText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <View style={styles.submitBtnIcon}>
                    <MaterialIcons name="check" size={18} color={Colors.textInverse} />
                  </View>
                  <Text style={styles.submitBtnText}>Submit Recovery</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    maxHeight: '93%',
    ...Shadow.lg,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  // Header
  headerGradient: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
  },
  headerBubble1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -40,
    right: -20,
  },
  headerBubble2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -20,
    left: -10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  shopAvatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopAvatarText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  shopName: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
    maxWidth: 200,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Balance cards
  balanceCardRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  balanceChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FCA5A5',
  },
  balanceDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  balanceChipLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: FontWeight.medium,
  },
  balanceChipValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  miniProgress: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: 4,
    borderRadius: Radius.full,
  },
  // ScrollView
  scrollView: {
    paddingHorizontal: Spacing.md,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  optionalBadge: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  optionalText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  gpsStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  gpsStatusText: {
    fontSize: 10,
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
  // Amount input
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  amountInputFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF9',
  },
  amountCurrencyTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  amountCurrencyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  amountInput: {
    flex: 1,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  amountClear: {
    paddingHorizontal: Spacing.md,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  hintText: {
    fontSize: FontSize.xs,
    color: Colors.secondary,
    fontWeight: FontWeight.medium,
  },
  // Quick amounts
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickBtn: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  quickBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  quickBtnPressed: { opacity: 0.7 },
  quickBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  quickBtnTextActive: {
    color: Colors.primaryDark,
  },
  // Note
  noteWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  noteWrapFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF9',
  },
  noteInput: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text,
    paddingVertical: Spacing.sm,
    minHeight: 52,
    textAlignVertical: 'top',
  },
  noteClear: {
    marginTop: Spacing.sm,
  },
  // GPS captured
  gpsCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    ...Shadow.md,
  },
  mapContainer: {
    height: 180,
    backgroundColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
  },
  mapLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    gap: Spacing.xs,
    zIndex: 1,
  },
  mapLoaderText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapPinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  mapPin: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 4,
    ...Shadow.md,
  },
  mapZoomBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  mapZoomText: {
    fontSize: 10,
    color: Colors.textInverse,
    fontWeight: FontWeight.medium,
  },
  gpsInfo: {
    padding: Spacing.sm,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  coordsText: {
    fontSize: FontSize.xs,
    color: Colors.primaryDark,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  gpsRemoveBtn: {
    padding: 6,
    marginLeft: Spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  addressText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
  },
  retryBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.semibold,
  },
  // GPS capture button
  captureBtn: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.md,
  },
  captureBtnPressed: { opacity: 0.85 },
  captureBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  captureBtnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnTextWrap: {
    flex: 1,
  },
  captureBtnTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  captureBtnSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  bottomPad: {
    height: Spacing.lg,
  },
  // Footer
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  amountPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  amountPreviewLabel: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
  amountPreviewSub: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginTop: 1,
  },
  amountPreviewValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    ...Shadow.md,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.textMuted,
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  submitBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  submitBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
