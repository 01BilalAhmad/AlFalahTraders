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
  // OpenStreetMap static tile — zoom level 16, 600×300
  const zoom = 16;
  const tileSize = 256;
  const n = Math.pow(2, zoom);
  const tileX = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const tileY = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  // Use a static maps API via geoapify (free, no key for basic usage) or fallback to tile
  // We'll use the staticmap.openstreetmap.de approach
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=600x260&markers=${lat},${lng},red`;
}

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

  const reset = useCallback(() => {
    setAmount('');
    setDescription('');
    setGpsLat(undefined);
    setGpsLng(undefined);
    setGpsAddress(undefined);
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header with gradient accent */}
          <LinearGradient
            colors={['#ECFDF5', '#FFFFFF']}
            style={styles.headerGradient}
          >
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
                <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Balance + credit bar */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceItemLabel}>Outstanding</Text>
                  <Text style={[styles.balanceItemValue, { color: Colors.danger }]}>
                    {formatPKR(shop.balance)}
                  </Text>
                </View>
                <View style={styles.balanceSeparator} />
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceItemLabel}>Credit Limit</Text>
                  <Text style={[styles.balanceItemValue, { color: Colors.blue }]}>
                    {formatPKR(shop.creditLimit)}
                  </Text>
                </View>
                <View style={styles.balanceSeparator} />
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceItemLabel}>Utilisation</Text>
                  <Text style={[
                    styles.balanceItemValue,
                    { color: utilisationPct > 100 ? Colors.danger : utilisationPct > 80 ? Colors.secondary : Colors.primary }
                  ]}>
                    {utilisationPct.toFixed(0)}%
                  </Text>
                </View>
              </View>
              <View style={styles.miniProgress}>
                <View style={[styles.miniProgressFill, {
                  width: `${utilisationPct}%`,
                  backgroundColor: utilisationPct > 100 ? Colors.danger : utilisationPct > 80 ? Colors.secondary : Colors.primary
                }]} />
              </View>
            </View>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.scrollView}>
            {/* Amount section */}
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Amount (PKR) *</Text>
              <View style={styles.amountInputWrap}>
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
                />
                {amount ? (
                  <Pressable onPress={() => setAmount('')} style={styles.amountClear} hitSlop={8}>
                    <MaterialIcons name="cancel" size={18} color={Colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              {/* Quick amounts */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickScroll}
                contentContainerStyle={styles.quickContent}
              >
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
                      {isActive ? (
                        <MaterialIcons name="check" size={12} color={Colors.primary} />
                      ) : null}
                      <Text style={[styles.quickBtnText, isActive && styles.quickBtnTextActive]}>
                        Rs. {val >= 1000 ? `${val / 1000}K` : val}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Note section */}
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Note (Optional)</Text>
              <View style={styles.noteWrap}>
                <MaterialIcons name="notes" size={18} color={Colors.textMuted} style={styles.noteIcon} />
                <TextInput
                  style={styles.noteInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Cash received, cheque..."
                  placeholderTextColor={Colors.textMuted}
                  maxLength={200}
                  multiline
                />
              </View>
            </View>

            {/* GPS section */}
            <View style={styles.section}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>GPS Location</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalText}>Optional</Text>
                </View>
              </View>

              {gpsLat && gpsLng ? (
                <View style={styles.gpsCard}>
                  {/* Static Map Thumbnail */}
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
                    {/* Pin overlay */}
                    <View style={styles.mapPinOverlay}>
                      <View style={styles.mapPin}>
                        <MaterialIcons name="location-on" size={28} color={Colors.danger} />
                      </View>
                    </View>
                    {/* Zoom label */}
                    <View style={styles.mapZoomBadge}>
                      <MaterialIcons name="zoom-in" size={12} color={Colors.textInverse} />
                      <Text style={styles.mapZoomText}>Street level</Text>
                    </View>
                  </View>

                  {/* Coords row */}
                  <View style={styles.coordsRow}>
                    <View style={styles.coordsBadge}>
                      <MaterialIcons name="my-location" size={13} color={Colors.primary} />
                      <Text style={styles.coordsText}>
                        {gpsLat.toFixed(5)}, {gpsLng.toFixed(5)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => { setGpsLat(undefined); setGpsLng(undefined); setGpsAddress(undefined); }}
                      style={styles.gpsRemoveBtn}
                      hitSlop={8}
                    >
                      <MaterialIcons name="close" size={14} color={Colors.danger} />
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
                    {capturingGps ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <MaterialIcons name="refresh" size={15} color={Colors.primary} />
                    )}
                    <Text style={styles.retryBtnText}>
                      {capturingGps ? 'Refreshing...' : 'Refresh Location'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.captureBtn, pressed && styles.captureBtnPressed]}
                  onPress={captureGPS}
                  disabled={capturingGps}
                >
                  <LinearGradient
                    colors={capturingGps ? ['#E5E7EB', '#E5E7EB'] : ['#ECFDF5', '#D1FAE5']}
                    style={styles.captureBtnGradient}
                  >
                    {capturingGps ? (
                      <>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.captureBtnText}>Getting your location...</Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.captureBtnIcon}>
                          <MaterialIcons name="my-location" size={22} color={Colors.primary} />
                        </View>
                        <View>
                          <Text style={styles.captureBtnText}>Capture GPS Location</Text>
                          <Text style={styles.captureBtnSub}>Tap to get current coordinates</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={Colors.primary} style={{ marginLeft: 'auto' }} />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              )}
            </View>

            <View style={styles.bottomPad} />
          </ScrollView>

          {/* Submit button */}
          <View style={styles.footer}>
            {numericAmount > 0 && numericAmount >= MIN_RECOVERY ? (
              <View style={styles.amountPreview}>
                <Text style={styles.amountPreviewLabel}>Recovery Amount</Text>
                <Text style={styles.amountPreviewValue}>{formatPKR(numericAmount)}</Text>
              </View>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                (!amount || isSubmitting) && styles.submitBtnDisabled,
                pressed && !isSubmitting && styles.submitBtnPressed,
              ]}
              onPress={handleSubmit}
              disabled={!amount || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                  <Text style={styles.submitBtnText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={20} color={Colors.textInverse} />
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
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingTop: Spacing.sm,
    maxHeight: '93%',
    ...Shadow.lg,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  headerGradient: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  shopAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  shopAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  shopName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
    maxWidth: 220,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  balanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceSeparator: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  balanceItemLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: FontWeight.semibold,
    marginBottom: 3,
  },
  balanceItemValue: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  miniProgress: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: 6,
    borderRadius: Radius.full,
  },
  scrollView: {
    paddingHorizontal: Spacing.md,
  },
  section: {
    marginTop: Spacing.md,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
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
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    overflow: 'hidden',
  },
  amountCurrencyTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    height: '100%',
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
    color: Colors.primaryDark,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  amountClear: {
    paddingHorizontal: Spacing.sm,
  },
  quickScroll: {
    marginTop: Spacing.sm,
  },
  quickContent: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
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
  noteWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    paddingLeft: Spacing.sm,
  },
  noteIcon: {
    marginTop: 12,
    marginRight: 4,
  },
  noteInput: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  // GPS captured state
  gpsCard: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    ...Shadow.sm,
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
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
    backgroundColor: Colors.primaryLight,
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  coordsText: {
    fontSize: FontSize.xs,
    color: Colors.primaryDark,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  gpsRemoveBtn: {
    padding: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.primaryLight,
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
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryLight,
  },
  retryBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  // GPS capture button
  captureBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  captureBtnPressed: { opacity: 0.75 },
  captureBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  captureBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  captureBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.primaryDark,
  },
  captureBtnSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  bottomPad: {
    height: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  amountPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  amountPreviewLabel: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.medium,
  },
  amountPreviewValue: {
    fontSize: FontSize.md,
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
});
