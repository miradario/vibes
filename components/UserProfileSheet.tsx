import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  FlatList,
  Image,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "./AnimatedSheetModal";
import Icon from "./Icon";
import ProfileMediaImage from "./ProfileMediaImage";
import type { UserProfileCardData } from "./UserProfileCard";
import { useAuthSession } from "../src/auth/auth.queries";
import { useSharedActivitiesQuery } from "../src/queries/sharedActivities.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

const VIBES_FALLBACK_ILLUSTRATION = require("../assets/images/challenges/vibesLogo.png");

type Props = {
  visible: boolean;
  profile: UserProfileCardData | null;
  onClose: () => void;
  onContactPress?: () => void;
  secondaryActionLabel?: string;
  onSecondaryActionPress?: () => void;
  onImagePress?: (image?: any, index?: number) => void;
};

const DetailSection = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View style={localStyles.detailSection}>
    <Text style={localStyles.detailLabel}>{label}</Text>
    {children}
  </View>
);

const isValidImageSource = (source: unknown): source is ImageSourcePropType => {
  if (typeof source === "number") return true;
  return Boolean(
    source &&
      typeof source === "object" &&
      "uri" in source &&
      typeof (source as { uri?: unknown }).uri === "string" &&
      (source as { uri: string }).uri.trim()
  );
};

const getImageKey = (source: ImageSourcePropType, index: number) => {
  if (typeof source === "number") return `asset-${source}-${index}`;
  if (source && typeof source === "object" && "uri" in source) {
    return `uri-${String(source.uri)}-${index}`;
  }
  return `photo-${index}`;
};

const normalizeProfileImages = (profile: UserProfileCardData | null) => {
  if (!profile || profile.hasPhotos === false) return [];
  const candidates =
    profile.images && profile.images.length > 0
      ? profile.images
      : profile.image
      ? [profile.image]
      : [];
  const seen = new Set<string>();

  return candidates.filter((source, index): source is ImageSourcePropType => {
    if (!isValidImageSource(source)) return false;
    const key = getImageKey(source, index).replace(/-\d+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getPrefixedValue = (items: string[], prefixes: string[]) => {
  const normalizedPrefixes = prefixes.map((prefix) => prefix.toLowerCase());
  for (const item of items) {
    const separatorIndex = item.indexOf(":");
    if (separatorIndex < 0) continue;
    const label = item.slice(0, separatorIndex).trim().toLowerCase();
    if (!normalizedPrefixes.includes(label)) continue;
    const value = item.slice(separatorIndex + 1).trim();
    if (value) return value;
  }
  return undefined;
};

const isCategorizedPreference = (item: string) => {
  const label = item.split(":")[0]?.trim().toLowerCase();
  return [
    "propósito",
    "proposito",
    "me trae a vibes",
    "energía",
    "energia",
    "hoy me siento",
    "vegetarianismo",
    "fuma",
    "mascotas",
    "camino espiritual",
  ].includes(label);
};

const PillList = ({
  items,
  blue = false,
}: {
  items: string[];
  blue?: boolean;
}) => (
  <View style={localStyles.pillRow}>
    {items.map((item, index) => (
      <View
        key={`${item}-${index}`}
        style={[localStyles.pill, blue && localStyles.pillBlue]}
      >
        <Text style={localStyles.pillText}>{item}</Text>
      </View>
    ))}
  </View>
);

const UserProfileSheet = ({
  visible,
  profile,
  onClose,
  onContactPress,
  secondaryActionLabel,
  onSecondaryActionPress,
}: Props) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { data: session } = useAuthSession();
  const { data: sharedActivities } = useSharedActivitiesQuery(
    session?.user?.id,
    profile?.id
  );
  const galleryRef = useRef<FlatList<ImageSourcePropType>>(null);
  const panelDragY = useRef(new Animated.Value(0)).current;
  const detailsPanelHeight = Math.min(
    Math.max(320, height * 0.82),
    Math.max(240, height - insets.top - 38)
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInteractedWithGallery, setHasInteractedWithGallery] =
    useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const profileImages = useMemo(
    () => normalizeProfileImages(profile),
    [profile]
  );
  const hasMultipleImages = profileImages.length > 1;
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(profileImages.length - 1, 0)
  );
  const preferences = useMemo(
    () =>
      Array.from(
        new Set(
          (profile?.preferences ?? [])
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        )
      ),
    [profile?.preferences]
  );
  const purpose =
    getPrefixedValue(preferences, [
      "Propósito",
      "Proposito",
      "Me trae a Vibes",
    ]) ?? profile?.intention;
  const energy =
    getPrefixedValue(preferences, ["Energía", "Energia", "Hoy me siento"]) ??
    profile?.vibe;
  const otherPreferences = preferences.filter(
    (item) => !isCategorizedPreference(item)
  );
  const habits = [
    profile?.vegetarian ? `Vegetarianismo: ${profile.vegetarian}` : null,
    profile?.smoking ? `Fuma: ${profile.smoking}` : null,
    profile?.pets ? `Mascotas: ${profile.pets}` : null,
  ].filter((item): item is string => Boolean(item));
  const location = [profile?.location, profile?.distanceLabel]
    .filter(
      (item, index, values) => Boolean(item) && values.indexOf(item) === index
    )
    .join(" · ");
  const nameWithAge = profile?.age
    ? `${profile.name}, ${profile.age}`
    : profile?.name ?? "Perfil";

  useEffect(() => {
    setActiveIndex(0);
    setHasInteractedWithGallery(false);
    setDetailsVisible(false);
    panelDragY.setValue(0);
    requestAnimationFrame(() =>
      galleryRef.current?.scrollToOffset({ offset: 0, animated: false })
    );
  }, [panelDragY, profile?.id]);

  useEffect(() => {
    if (!visible) setDetailsVisible(false);
  }, [visible]);

  useEffect(() => {
    if (!profileImages.length || safeActiveIndex === 0) return;
    requestAnimationFrame(() =>
      galleryRef.current?.scrollToOffset({
        offset: safeActiveIndex * width,
        animated: false,
      })
    );
  }, [profileImages.length, safeActiveIndex, width]);

  const closeDetails = useCallback(() => setDetailsVisible(false), []);

  const detailsPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          panelDragY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > 90 || gesture.vy > 0.8) {
            Animated.timing(panelDragY, {
              toValue: height,
              duration: 170,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) closeDetails();
            });
            return;
          }
          Animated.spring(panelDragY, {
            toValue: 0,
            damping: 18,
            stiffness: 210,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(panelDragY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [closeDetails, height, panelDragY]
  );

  const showDetails = () => {
    panelDragY.setValue(0);
    setDetailsVisible(true);
  };

  const setGalleryIndex = (nextIndex: number) => {
    if (!hasMultipleImages) return;
    const boundedIndex = Math.max(
      0,
      Math.min(nextIndex, profileImages.length - 1)
    );
    setHasInteractedWithGallery(true);
    setActiveIndex(boundedIndex);
    galleryRef.current?.scrollToOffset({
      offset: boundedIndex * width,
      animated: true,
    });
  };

  const handleGalleryMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (!width) return;
    const nextIndex = Math.max(
      0,
      Math.min(
        Math.round(event.nativeEvent.contentOffset.x / width),
        profileImages.length - 1
      )
    );
    setActiveIndex(nextIndex);
  };

  const renderActions = (onPanel = false) =>
    onContactPress || (onSecondaryActionPress && secondaryActionLabel) ? (
      <View style={[localStyles.actions, onPanel && localStyles.panelActions]}>
        {onContactPress ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Conectar con ${
              profile?.name ?? "este perfil"
            }`}
            activeOpacity={0.9}
            onPress={onContactPress}
            style={localStyles.primaryActionTouch}
          >
            <LinearGradient
              colors={["#D8A547", "#E9BE6A", "#D6A03D"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={localStyles.primaryAction}
            >
              <Text style={localStyles.primaryActionText}>Conectar</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
        {onSecondaryActionPress && secondaryActionLabel ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={secondaryActionLabel}
            activeOpacity={0.75}
            onPress={onSecondaryActionPress}
            style={localStyles.secondaryAction}
          >
            <Text
              style={[
                localStyles.secondaryActionText,
                onPanel && localStyles.panelSecondaryActionText,
              ]}
            >
              {secondaryActionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ) : null;

  if (!profile) return null;

  return (
    <>
      <AnimatedSheetModal
        visible={visible}
        onClose={detailsVisible ? closeDetails : onClose}
        closeOnBackdropPress={false}
        backdropColor="#FEFEFD"
        offsetY={0}
        sheetInDelay={0}
        sheetStyle={[localStyles.fullscreenSheet, { height }]}
      >
        <View style={localStyles.screen}>
          {profileImages.length > 0 ? (
            <FlatList
              ref={galleryRef}
              data={profileImages}
              key={`${profile.id ?? profile.name}-${width}`}
              keyExtractor={getImageKey}
              horizontal
              pagingEnabled
              bounces={false}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScrollBeginDrag={() => setHasInteractedWithGallery(true)}
              onMomentumScrollEnd={handleGalleryMomentumEnd}
              renderItem={({ item }) => (
                <ProfileMediaImage
                  source={item}
                  style={{ width, height }}
                  fallbackBackgroundColor="#FEFEFD"
                  fallbackIconColor="#7F98B7"
                />
              )}
              style={StyleSheet.absoluteFillObject}
              initialNumToRender={2}
              windowSize={3}
              removeClippedSubviews={Platform.OS === "android"}
            />
          ) : (
            <View style={localStyles.fallbackCanvas}>
              <View style={localStyles.fallbackCircleBlue} />
              <View style={localStyles.fallbackCircleGold} />
              <Image
                source={VIBES_FALLBACK_ILLUSTRATION}
                resizeMode="contain"
                style={localStyles.fallbackIllustration}
                accessibilityLabel="Ilustración de Vibes"
              />
            </View>
          )}

          <LinearGradient
            pointerEvents="none"
            colors={[
              "transparent",
              "rgba(22, 27, 33, 0.18)",
              "rgba(19, 23, 28, 0.92)",
            ]}
            locations={[0, 0.34, 1]}
            style={localStyles.bottomGradient}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Volver"
            activeOpacity={0.82}
            onPress={onClose}
            hitSlop={8}
            style={[localStyles.backButton, { top: insets.top + 10 }]}
          >
            <Icon name="chevron-back" size={28} color="#2B2B2B" />
          </TouchableOpacity>

          {hasMultipleImages ? (
            <>
              <View
                pointerEvents="none"
                style={[localStyles.indicators, { top: insets.top + 22 }]}
              >
                {profileImages.map((_image, index) => (
                  <View
                    key={`indicator-${index}`}
                    style={[
                      localStyles.indicator,
                      index === safeActiveIndex && localStyles.indicatorActive,
                    ]}
                  />
                ))}
              </View>
              <View style={[localStyles.counter, { top: insets.top + 10 }]}>
                <Text style={localStyles.counterText}>
                  {safeActiveIndex + 1} / {profileImages.length}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Foto anterior"
                accessibilityState={{ disabled: safeActiveIndex === 0 }}
                activeOpacity={0.82}
                disabled={safeActiveIndex === 0}
                onPress={() => setGalleryIndex(safeActiveIndex - 1)}
                style={[
                  localStyles.galleryArrow,
                  localStyles.galleryArrowLeft,
                  safeActiveIndex === 0 && localStyles.galleryArrowDisabled,
                ]}
              >
                <Icon name="chevron-back" size={30} color="#222A32" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Foto siguiente"
                accessibilityState={{
                  disabled: safeActiveIndex === profileImages.length - 1,
                }}
                activeOpacity={0.82}
                disabled={safeActiveIndex === profileImages.length - 1}
                onPress={() => setGalleryIndex(safeActiveIndex + 1)}
                style={[
                  localStyles.galleryArrow,
                  localStyles.galleryArrowRight,
                  safeActiveIndex === profileImages.length - 1 &&
                    localStyles.galleryArrowDisabled,
                ]}
              >
                <Icon name="chevron-forward" size={30} color="#222A32" />
              </TouchableOpacity>
            </>
          ) : null}

          <View
            style={[
              localStyles.profileOverlay,
              { paddingBottom: Math.max(insets.bottom, 14) + 12 },
            ]}
          >
            {hasMultipleImages && !hasInteractedWithGallery ? (
              <View
                style={localStyles.galleryHint}
                accessibilityLiveRegion="polite"
              >
                <Icon name="swap-horizontal" size={25} color="#FEFEFD" />
                <Text style={localStyles.galleryHintText}>
                  Deslizá para ver más fotos
                </Text>
              </View>
            ) : null}
            <View style={localStyles.nameRow}>
              <View style={localStyles.nameCopy}>
                <Text style={localStyles.profileName} numberOfLines={2}>
                  {profile.name}
                </Text>
                {profile.age ? (
                  <Text style={localStyles.profileAge}>{profile.age} años</Text>
                ) : null}
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Ver más información de ${profile.name}`}
                activeOpacity={0.84}
                onPress={showDetails}
                style={localStyles.moreButton}
              >
                <Icon name="chevron-up" size={22} color="#D8A547" />
                <Text style={localStyles.moreButtonText}>Ver más</Text>
              </TouchableOpacity>
            </View>
            {renderActions()}
          </View>
        </View>
      </AnimatedSheetModal>

      <AnimatedSheetModal
        visible={visible && detailsVisible}
        onClose={closeDetails}
        onClosed={() => panelDragY.setValue(0)}
        closeOnBackdropPress={false}
        offsetY={height * 0.72}
        backdropColor="rgba(20, 24, 28, 0.18)"
        sheetStyle={[localStyles.detailsSheet, { height: detailsPanelHeight }]}
      >
        <Animated.View
          style={[
            localStyles.detailsPanel,
            { transform: [{ translateY: panelDragY }] },
          ]}
        >
          <View
            accessible
            accessibilityLabel="Arrastrá hacia abajo para cerrar la información"
            style={localStyles.dragArea}
            {...detailsPanResponder.panHandlers}
          >
            <View style={localStyles.dragHandle} />
          </View>
          <View style={localStyles.detailsHeader}>
            <Text style={localStyles.detailsName}>{nameWithAge}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar información"
              activeOpacity={0.82}
              onPress={closeDetails}
              hitSlop={6}
              style={localStyles.detailsCloseButton}
            >
              <Icon name="chevron-down" size={28} color="#222A32" />
            </TouchableOpacity>
          </View>
          <View style={localStyles.detailsDivider} />
          <ScrollView
            style={localStyles.detailsScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              localStyles.detailsContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 20 },
            ]}
          >
            {profile.description ? (
              <DetailSection label="Sobre mí">
                <Text style={localStyles.detailBody}>
                  {profile.description}
                </Text>
              </DetailSection>
            ) : null}
            {purpose ? (
              <DetailSection label="Me trae a Vibes">
                <Text style={localStyles.detailValue}>{purpose}</Text>
              </DetailSection>
            ) : null}
            {energy ? (
              <DetailSection label="Hoy me siento">
                <PillList items={[energy]} blue />
              </DetailSection>
            ) : null}
            {location ? (
              <DetailSection label="Ubicación">
                <View style={localStyles.inlineDetail}>
                  <Icon name="location-outline" size={19} color="#7F98B7" />
                  <Text style={localStyles.detailValueFlexible}>
                    {location}
                  </Text>
                </View>
              </DetailSection>
            ) : null}
            {profile.prompt ? (
              <DetailSection label="Ritual">
                <Text style={localStyles.detailBody}>{profile.prompt}</Text>
              </DetailSection>
            ) : null}
            {profile.spiritualPath?.length ? (
              <DetailSection label="Camino espiritual">
                <PillList items={profile.spiritualPath} />
              </DetailSection>
            ) : null}
            {habits.length ? (
              <DetailSection label="Hábitos">
                <PillList items={habits} />
              </DetailSection>
            ) : null}
            {profile.tags?.length ? (
              <DetailSection label="Intereses">
                <PillList items={profile.tags} />
              </DetailSection>
            ) : null}
            {otherPreferences.length ? (
              <DetailSection label="Más sobre mí">
                <PillList items={otherPreferences} />
              </DetailSection>
            ) : null}
            {profile.match ? (
              <DetailSection label="Afinidad">
                <Text style={localStyles.detailValue}>{profile.match}</Text>
              </DetailSection>
            ) : null}
            {sharedActivities?.events.length ||
            sharedActivities?.challenges.length ? (
              <DetailSection label="En común">
                <View style={localStyles.sharedList}>
                  {sharedActivities.events.map((item, index) => (
                    <View
                      key={`event-${item}-${index}`}
                      style={localStyles.inlineDetail}
                    >
                      <Icon name="calendar-outline" size={18} color="#D8A547" />
                      <Text style={localStyles.detailValueFlexible}>
                        {item}
                      </Text>
                    </View>
                  ))}
                  {sharedActivities.challenges.map((item, index) => (
                    <View
                      key={`challenge-${item}-${index}`}
                      style={localStyles.inlineDetail}
                    >
                      <Icon name="sparkles-outline" size={18} color="#7F98B7" />
                      <Text style={localStyles.detailValueFlexible}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </DetailSection>
            ) : null}
            {renderActions(true)}
          </ScrollView>
        </Animated.View>
      </AnimatedSheetModal>
    </>
  );
};

export default UserProfileSheet;

const localStyles = StyleSheet.create({
  fullscreenSheet: { width: "100%", backgroundColor: "#FEFEFD" },
  screen: { flex: 1, overflow: "hidden", backgroundColor: "#FEFEFD" },
  fallbackCanvas: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#FCFAF6",
  },
  fallbackCircleBlue: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    left: -150,
    top: "18%",
    backgroundColor: "rgba(173, 207, 236, 0.55)",
  },
  fallbackCircleGold: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -125,
    bottom: "18%",
    backgroundColor: "rgba(228, 183, 110, 0.25)",
  },
  fallbackIllustration: { width: "84%", height: "66%" },
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "54%",
  },
  backButton: {
    position: "absolute",
    left: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(254, 254, 253, 0.9)",
    shadowColor: "#111",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    zIndex: 5,
  },
  indicators: {
    position: "absolute",
    left: 76,
    right: 92,
    flexDirection: "row",
    gap: 7,
    zIndex: 4,
  },
  indicator: {
    flex: 1,
    height: 5,
    minWidth: 12,
    borderRadius: 3,
    backgroundColor: "rgba(254, 254, 253, 0.62)",
  },
  indicatorActive: { backgroundColor: "#D8A547" },
  counter: {
    position: "absolute",
    right: 14,
    minWidth: 68,
    height: 44,
    paddingHorizontal: 13,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(254, 254, 253, 0.9)",
    zIndex: 5,
  },
  counterText: {
    color: "#4F5358",
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  galleryArrow: {
    position: "absolute",
    top: "42%",
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(254, 254, 253, 0.92)",
    shadowColor: "#111",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    zIndex: 4,
  },
  galleryArrowLeft: { left: 16 },
  galleryArrowRight: { right: 16 },
  galleryArrowDisabled: { opacity: 0.34 },
  profileOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    zIndex: 3,
  },
  galleryHint: { alignSelf: "center", alignItems: "center", marginBottom: 14 },
  galleryHintText: {
    marginTop: 2,
    color: "rgba(254, 254, 253, 0.9)",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  nameRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  nameCopy: { flex: 1, minWidth: 0 },
  profileName: {
    color: "#FEFEFD",
    fontSize: 42,
    lineHeight: 46,
    fontFamily: vibesTheme.fonts.thin,
  },
  profileAge: {
    marginTop: 1,
    color: "rgba(254, 254, 253, 0.88)",
    fontSize: 21,
    lineHeight: 27,
    fontFamily: vibesTheme.fonts.medium,
  },
  moreButton: {
    minWidth: 124,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(254, 254, 253, 0.94)",
  },
  moreButtonText: {
    color: "#2B2B2B",
    fontSize: 17,
    fontFamily: vibesTheme.fonts.medium,
  },
  actions: { marginTop: 18, gap: 6 },
  primaryActionTouch: {
    minHeight: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#D6A03D",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryAction: {
    minHeight: 56,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
  },
  primaryActionText: {
    color: "#FEFEFD",
    fontSize: 21,
    lineHeight: 26,
    fontFamily: vibesTheme.fonts.medium,
  },
  secondaryAction: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryActionText: {
    color: "rgba(254, 254, 253, 0.9)",
    fontSize: 17,
    fontFamily: vibesTheme.fonts.medium,
  },
  panelSecondaryActionText: { color: "#555A61" },
  detailsSheet: {
    width: "100%",
    backgroundColor: "transparent",
  },
  detailsPanel: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    backgroundColor: "#FCFAF6",
    shadowColor: "#111",
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  detailsScroll: { flex: 1 },
  dragArea: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  dragHandle: {
    width: 82,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(43, 43, 43, 0.17)",
  },
  detailsHeader: {
    minHeight: 72,
    paddingLeft: 24,
    paddingRight: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailsName: {
    flex: 1,
    color: "#20252C",
    fontSize: 34,
    lineHeight: 40,
    fontFamily: vibesTheme.fonts.thin,
  },
  detailsCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEFEFD",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
  },
  detailsDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    backgroundColor: "rgba(43, 43, 43, 0.16)",
  },
  detailsContent: { paddingHorizontal: 24, paddingTop: 18 },
  detailSection: { marginBottom: 20 },
  detailLabel: {
    marginBottom: 7,
    color: "#6E6E6E",
    fontSize: 16,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.medium,
  },
  detailBody: {
    color: "#2B2B2B",
    fontSize: 18,
    lineHeight: 27,
    fontFamily: vibesTheme.fonts.medium,
  },
  detailValue: {
    color: "#20252C",
    fontSize: 20,
    lineHeight: 27,
    fontFamily: vibesTheme.fonts.medium,
  },
  detailValueFlexible: {
    flex: 1,
    color: "#2B2B2B",
    fontSize: 17,
    lineHeight: 23,
    fontFamily: vibesTheme.fonts.medium,
  },
  inlineDetail: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(216, 165, 71, 0.2)",
  },
  pillBlue: {
    backgroundColor: "rgba(173, 207, 236, 0.46)",
    borderColor: "rgba(127, 152, 183, 0.16)",
  },
  pillText: {
    color: "#2B2B2B",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  sharedList: { gap: 10 },
  panelActions: { marginTop: 4 },
});
