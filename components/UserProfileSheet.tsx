import { splitProfileLocation } from "../src/lib/profileLocation";
import { getProfileSwipeAction } from "../src/lib/profileSwipe";
import LikeBubbles from "./LikeBubbles";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  AccessibilityInfo,
  Easing,
  FlatList,
  Image,
  PanResponder,
  Platform,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Text } from "./Typography";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { ArrowLeftToLine, ArrowRightToLine, Link, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "./AnimatedSheetModal";
import Icon from "./Icon";
import ProfileMediaImage from "./ProfileMediaImage";
import VibesLoader from "./VibesLoader";
import type { UserProfileCardData } from "./UserProfileCard";
import { useAuthSession } from "../src/auth/auth.queries";
import { useSharedActivitiesQuery } from "../src/queries/sharedActivities.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

const VIBES_FALLBACK_ILLUSTRATION = require("../assets/images/challenges/vibesLogo.png");

type Props = {
  visible: boolean;
  enableSwipe?: boolean;
  actionPending?: boolean;
  profile: UserProfileCardData | null;
  nextProfile?: UserProfileCardData | null;
  onClose: () => void;
  onContactPress?: () => void | Promise<unknown>;
  secondaryActionLabel?: string;
  onSecondaryActionPress?: () => void | Promise<unknown>;
  nextActionLabel?: string;
  onNextActionPress?: () => void;
  secondaryActionPanelOnly?: boolean;
  secondaryActionDestructive?: boolean;
  onImagePress?: (image?: any, index?: number) => void;
  closeIconName?: string;
  showPhotoCounter?: boolean;
};

// Explicit full-screen photo treatment: black is scoped to this viewer.
const PROFILE_PHOTO_BACKGROUND = "#000000";
const PROFILE_PHOTO_GRADIENT = ["#00000000", "#00000080", "#000000FF"] as const;

const DetailSection = ({
  label,
  children,
  emphasized = false,
}: {
  label: string;
  children: React.ReactNode;
  emphasized?: boolean;
}) => (
  <View style={localStyles.detailSection}>
    <Text
      style={[
        localStyles.detailLabel,
        emphasized && localStyles.emphasizedDetailLabel,
      ]}
    >
      {label}
    </Text>
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

type DetailChipGroup = {
  title: string;
  values: string[];
};

const splitChipValues = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const createDetailChipGroup = (
  title: string,
  value: unknown
): DetailChipGroup | null => {
  const values = Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : typeof value === "string"
    ? splitChipValues(value)
    : value
    ? [String(value).trim()].filter(Boolean)
    : [];

  if (!title.trim() || values.length === 0) return null;

  return { title: title.trim(), values: Array.from(new Set(values)) };
};

const parseDetailPreferenceGroup = (item: string): DetailChipGroup | null => {
  const [rawTitle, ...rawValues] = item.split(":");
  if (rawValues.length === 0) {
    return createDetailChipGroup("Detalles", item);
  }

  return createDetailChipGroup(rawTitle, rawValues.join(":"));
};

const mergeDetailChipGroups = (groups: DetailChipGroup[]) => {
  const merged = new Map<string, DetailChipGroup>();

  groups.forEach((group) => {
    const key = group.title.toLowerCase();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { title: group.title, values: [...group.values] });
      return;
    }

    existing.values = Array.from(new Set([...existing.values, ...group.values]));
  });

  return Array.from(merged.values());
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

const GroupedPillList = ({
  groups,
  blue = false,
}: {
  groups: DetailChipGroup[];
  blue?: boolean;
}) => (
  <View style={localStyles.groupedPillList}>
    {groups.map((group, index) => (
      <View key={`${group.title}-${index}`} style={localStyles.pillGroup}>
        <Text style={localStyles.pillGroupLabel}>{group.title}</Text>
        <PillList items={group.values} blue={blue} />
      </View>
    ))}
  </View>
);

const UserProfileSheet = ({
  visible,
  enableSwipe = false,
  actionPending = false,
  profile,
  nextProfile,
  onClose,
  onContactPress,
  secondaryActionLabel,
  onSecondaryActionPress,
  nextActionLabel,
  onNextActionPress,
  secondaryActionPanelOnly = false,
  secondaryActionDestructive = false,
}: Props) => {
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const [height, setViewportHeight] = useState(windowHeight);
  const { data: session } = useAuthSession();
  const { data: sharedActivities } = useSharedActivitiesQuery(
    session?.user?.id,
    profile?.id
  );
  const galleryRef = useRef<FlatList<ImageSourcePropType>>(null);
  const detailsGalleryRef = useRef<FlatList<ImageSourcePropType>>(null);
  const panelDragY = useRef(new Animated.Value(0)).current;
  const compactPhotoHeight = Math.max(insets.top + 140, height * 0.38);
  const photoHeight = useMemo(() => new Animated.Value(height), [profile?.id, height]);
  const [detailsProfileId, setDetailsProfileId] = useState<string | null>(null);
  const detailsVisible = detailsProfileId !== null && detailsProfileId === profile?.id;
  const setDetailsVisible = useCallback((open: boolean) => {
    setDetailsProfileId(open ? profile?.id ?? null : null);
  }, [profile?.id]);
  const [detailsActionsHeight, setDetailsActionsHeight] = useState(140);
  const [burst, setBurst] = useState(0);
  // Each card owns its native transform. Never recenter the outgoing card
  // while React is replacing its photo with the next profile.
  const swipeX = useMemo(() => new Animated.Value(0), [profile?.id]);
  const swipeUp = useRef(new Animated.Value(0)).current;
  const swipingRef = useRef(false);
  const [swipeNextProfile, setSwipeNextProfile] = useState<UserProfileCardData | null>(null);
  const [swipeAnimating, setSwipeAnimating] = useState(false);
  const [photoReadyId, setPhotoReadyId] = useState<string | undefined>(undefined);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const animation = Animated.timing(photoHeight, {
      toValue: detailsVisible ? compactPhotoHeight : height,
      duration: reduceMotion ? 0 : 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [compactPhotoHeight, detailsVisible, height, photoHeight, reduceMotion]);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  useLayoutEffect(() => () => swipeX.stopAnimation(), [swipeX]);
  useLayoutEffect(() => {
    // Keep the outgoing card offscreen while the modal closes.
    if (!visible) return;
    setDetailsVisible(false);
    swipingRef.current = false;
    setSwipeAnimating(false);
    swipeX.stopAnimation();
    swipeX.setValue(0);
    swipeUp.setValue(0);
    setSwipeNextProfile((previous) => visible && previous?.id === profile?.id ? previous : null);
  }, [profile?.id, visible, swipeX, swipeUp]);
  const resetSwipe = useCallback(() => {
    if (swipingRef.current) return;
    swipeUp.setValue(0);
    Animated.timing(swipeX, {
      toValue: 0,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [swipeX, swipeUp, reduceMotion]);
  const commitSwipe = useCallback(
    (direction: "like" | "pass") => {
      if (actionPending || swipingRef.current) return;
      const action =
        direction === "like" ? onContactPress : onSecondaryActionPress;
      if (!action) {
        resetSwipe();
        return;
      }
      if (!enableSwipe) {
        void action();
        return;
      }
      swipingRef.current = true;
      setSwipeNextProfile(nextProfile ?? null);
      setSwipeAnimating(true);
      Animated.timing(swipeX, {
        toValue: (direction === "like" ? 1 : -1) * width * 1.3,
        duration: reduceMotion ? 0 : 240,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          swipingRef.current = false;
          setSwipeAnimating(false);
          return;
        }
        void (async () => {
          try {
            const result = await action();
            // Successful actions stay offscreen until the parent commits the
            // next profile or closes the sheet. Never return the old card.
            if (result === false) {
              swipingRef.current = false;
              setSwipeAnimating(false);
              resetSwipe();
            }
          } catch {
            swipingRef.current = false;
            setSwipeAnimating(false);
            resetSwipe();
          }
        })();
      });
    },
    [
      actionPending,
      onContactPress,
      onSecondaryActionPress,
      enableSwipe,
      swipeX,
      width,
      reduceMotion,
      resetSwipe,
      nextProfile,
      profile?.id,
    ]
  );
  const like = () => {
    if (!actionPending && !swipingRef.current) {
      if (!reduceMotion) setBurst((value) => value + 1);
      commitSwipe("like");
    }
  };
  const [gallerySelection, setGallerySelection] = useState({ profileId: profile?.id, index: 0 });
  const activeIndex = gallerySelection.profileId === profile?.id ? gallerySelection.index : 0;
  const setActiveIndex = (index: number) => setGallerySelection({ profileId: profile?.id, index });
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !actionPending && !swipingRef.current && !detailsVisible,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          !actionPending &&
          !swipingRef.current &&
          !detailsVisible &&
          (((enableSwipe || Boolean(onNextActionPress)) &&
            Math.abs(g.dx) > 15 &&
            Math.abs(g.dx) > Math.abs(g.dy) * 1.5) ||
            (g.dy < -15 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5)),
        onMoveShouldSetPanResponder: (_, g) =>
          !actionPending &&
          !swipingRef.current &&
          !detailsVisible &&
          (((enableSwipe || Boolean(onNextActionPress)) &&
            Math.abs(g.dx) > 15 &&
            Math.abs(g.dx) > Math.abs(g.dy) * 1.5) ||
            (g.dy < -15 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5)),
        onPanResponderMove: (_, g) => {
          if (swipingRef.current) return;
          swipeUp.setValue(
            g.dy < 0 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5 ? -g.dy : 0
          );
          if (enableSwipe && Math.abs(g.dx) > Math.abs(g.dy) * 1.5)
            swipeX.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          if (swipingRef.current) return;
          swipeUp.setValue(0);
          const action = getProfileSwipeAction(g.dx, g.dy, width, enableSwipe, Boolean(onNextActionPress));
          if (action === "details") {
            swipeX.stopAnimation();
            swipeX.setValue(0);
            panelDragY.setValue(0);
            setDetailsVisible(true);
          } else if (action === "next") {
            onNextActionPress?.();
          } else if (action) {
            if (action === "like" && !reduceMotion) {
              setBurst((value) => value + 1);
            }
            commitSwipe(action);
          } else {
            resetSwipe();
            if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) {
              setGalleryIndex(activeIndex + (g.x0 < width / 2 ? -1 : 1));
            }
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: resetSwipe,
      }),
    [
      enableSwipe,
      onNextActionPress,
      activeIndex,
      profile,
      actionPending,
      detailsVisible,
      swipeUp,
      swipeX,
      width,
      commitSwipe,
      resetSwipe,
      panelDragY,
      reduceMotion,
    ]
  );
  const profileImages = useMemo(
    () => normalizeProfileImages(profile),
    [profile]
  );
  const hasMultipleImages = profileImages.length > 1;
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(profileImages.length - 1, 0)
  );
  const upcomingPhotoUrls = JSON.stringify(Array.from(new Set([
    ...profileImages.slice(Math.max(0, safeActiveIndex - 1), safeActiveIndex + 3),
    ...normalizeProfileImages(nextProfile ?? null).slice(0, 1),
  ].flatMap((source) => typeof source === "object" && source && "uri" in source && source.uri ? [source.uri] : []))));
  useEffect(() => {
    if (!visible) return;
    const urls: string[] = JSON.parse(upcomingPhotoUrls);
    if (urls.length) void ExpoImage.prefetch(urls, { cachePolicy: "memory-disk" }).catch(() => {});
  }, [visible, upcomingPhotoUrls]);
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
  const otherPreferenceGroups = mergeDetailChipGroups(
    preferences
      .filter((item) => !isCategorizedPreference(item))
      .map(parseDetailPreferenceGroup)
      .filter((group): group is DetailChipGroup => Boolean(group))
  );
  const interestGroups = otherPreferenceGroups.filter((group) =>
    ["intereses", "planes", "mi plan ideal", "podría hablar de", "me gustaría probar"].includes(group.title.toLowerCase())
  );
  const lifestyleGroups = otherPreferenceGroups.filter((group) =>
    ["actividad física", "hábitos", "alcohol", "plan familiar", "estilo de amor"].includes(group.title.toLowerCase())
  );
  const specificationGroups = otherPreferenceGroups.filter((group) =>
    !interestGroups.includes(group) && !lifestyleGroups.includes(group)
  );
  const habitGroups = mergeDetailChipGroups(
    [
      createDetailChipGroup(
        "Vegetarianismo",
        getPrefixedValue(preferences, ["Vegetarianismo"]) ??
          profile?.vegetarian
      ),
      createDetailChipGroup(
        "Fuma",
        getPrefixedValue(preferences, ["Fuma"]) ?? profile?.smoking
      ),
      createDetailChipGroup(
        "Mascotas",
        getPrefixedValue(preferences, ["Mascotas"]) ?? profile?.pets
      ),
    ].filter((group): group is DetailChipGroup => Boolean(group))
  );
  const { location, distanceLabel: distance } = splitProfileLocation(profile?.location, profile?.distanceLabel);
  const nameWithAge = profile?.age
    ? `${profile.name}, ${profile.age}`
    : profile?.name ?? "Perfil";

  useLayoutEffect(() => {
    setActiveIndex(0);
    setDetailsVisible(false);
    panelDragY.setValue(0);
    requestAnimationFrame(() =>
      galleryRef.current?.scrollToOffset({ offset: 0, animated: false })
    );
  }, [panelDragY, profile?.id]);

  useEffect(() => {
    if (!profileImages.length) return;
    requestAnimationFrame(() =>
      galleryRef.current?.scrollToOffset({
        offset: safeActiveIndex * width,
        animated: false,
      })
    );
  }, [profileImages.length, safeActiveIndex, width]);

  const closeDetails = useCallback(() => setDetailsVisible(false), [setDetailsVisible]);
  const showDetails = () => {
    if (swipingRef.current || actionPending) return;
    swipeX.stopAnimation();
    swipeX.setValue(0);
    swipeUp.setValue(0);
    panelDragY.setValue(0);
    setDetailsVisible(true);
  };

  const setGalleryIndex = (nextIndex: number) => {
    if (!hasMultipleImages) return;
    const boundedIndex = Math.max(
      0,
      Math.min(nextIndex, profileImages.length - 1)
    );
    setActiveIndex(boundedIndex);
    detailsGalleryRef.current?.scrollToOffset({ offset: boundedIndex * width, animated: !reduceMotion });
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

  const renderActions = (onPanel = false) => {
    const shouldShowSecondaryAction =
      Boolean(onSecondaryActionPress && secondaryActionLabel) &&
      (!secondaryActionPanelOnly || onPanel);

    return (onContactPress || shouldShowSecondaryAction || onNextActionPress) ? (
      <View style={[localStyles.vibeActions, onPanel && { marginTop: 0 }]}>
        {onNextActionPress && nextActionLabel ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={nextActionLabel}
            disabled={actionPending || swipeAnimating}
            activeOpacity={0.85}
            onPress={onNextActionPress}
            style={[localStyles.vibeAction, onPanel && localStyles.floatingProfileAction]}
          >
            <View style={[localStyles.vibeActionCircle, localStyles.bareActionIcon]}>
              <ArrowRightToLine size={44} color={vibesTheme.colors.accentBlue} strokeWidth={2.5} />
            </View>
            {!onPanel && <Text style={localStyles.vibeActionLabel}>{nextActionLabel}</Text>}
          </TouchableOpacity>
        ) : null}
        {onContactPress && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Conectar con ${
              profile?.name ?? "este perfil"
            }`}
            disabled={actionPending || swipeAnimating}
            activeOpacity={0.85}
            onPress={like}
            style={[localStyles.vibeAction, onPanel && localStyles.floatingProfileAction]}
          >
            <View style={[localStyles.vibeActionCircle, localStyles.bareActionIcon]}>
              <Link size={48} color={vibesTheme.colors.accentMustard} strokeWidth={2.5} />
            </View>
            {!onPanel && <Text style={localStyles.vibeActionLabel}>
              {actionPending ? "Guardando…" : "Conectar"}
            </Text>}
          </TouchableOpacity>
        )}
        {shouldShowSecondaryAction && (
          <TouchableOpacity
            accessibilityRole="button"
            disabled={actionPending || swipeAnimating}
            accessibilityLabel={secondaryActionLabel}
            activeOpacity={0.85}
            onPress={() => commitSwipe("pass")}
            style={[localStyles.vibeAction, onPanel && localStyles.floatingProfileAction]}
          >
            <View
              style={[
                localStyles.vibeActionCircle,
                localStyles.bareActionIcon,
              ]}
            >
              <ArrowLeftToLine size={44} color={vibesTheme.colors.accentCoral} strokeWidth={2.5} />
            </View>
            {!onPanel && <Text style={localStyles.vibeActionLabel}>{secondaryActionLabel}</Text>}
          </TouchableOpacity>
        )}

      </View>
    ) : null;
  };

  if (!profile) return null;

  return (
    <>
      <AnimatedSheetModal
        fullScreen
        visible={visible}
        onClose={detailsVisible ? closeDetails : onClose}
        closeOnBackdropPress={false}
        backdropColor={PROFILE_PHOTO_BACKGROUND}
        offsetY={0}
        sheetInDelay={0}
        sheetInOpacityDuration={0}
        sheetStyle={[localStyles.fullscreenSheet, { flex: 1 }, detailsVisible && { backgroundColor: vibesTheme.colors.background }]}
      >
        {profileImages.length > 0 && photoReadyId !== profile.id && !swipeNextProfile ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]} accessibilityLabel="Cargando perfil">
            <VibesLoader size={64} />
          </View>
        ) : null}
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFillObject}
          onLayout={({ nativeEvent }) => setViewportHeight(nativeEvent.layout.height)}
        />
        {enableSwipe && (!detailsVisible || swipeAnimating) && (swipeNextProfile ?? nextProfile) ? (
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: PROFILE_PHOTO_BACKGROUND,
                // Reveal the next card as soon as the current photo is ready,
                // so dragging exposes it without waiting for the release.
                opacity: photoReadyId === profile.id || !profileImages.length || swipeNextProfile ? 1 : 0,
              },
            ]}
          >
            <ProfileMediaImage
                contentFit="cover"
                blurBackground
                showLoading
              source={
                normalizeProfileImages(swipeNextProfile ?? nextProfile ?? null)[0] ??
                VIBES_FALLBACK_ILLUSTRATION
              }
              style={{ width, height }}
              fallbackBackgroundColor={PROFILE_PHOTO_BACKGROUND}
              fallbackIconColor={vibesTheme.colors.accentBlue}
              transition={0}
            />
            <LinearGradient
              colors={PROFILE_PHOTO_GRADIENT}
              locations={[0, 0.55, 1]}
              style={[
                localStyles.nextProfileCopy,
                { paddingBottom: insets.bottom + 40 },
              ]}
            >
              <Text style={localStyles.profileName} numberOfLines={2}>
                {(swipeNextProfile ?? nextProfile)?.name}
                {(swipeNextProfile ?? nextProfile)?.age ? `, ${(swipeNextProfile ?? nextProfile)?.age}` : ""}
              </Text>
            </LinearGradient>
          </Animated.View>
        ) : null}
        <Animated.View style={{ height: photoHeight }}>
        <Animated.View
          key={`profile-card-${profile.id}`}
          style={[
            localStyles.screen,
            {
              opacity: !detailsVisible && (!profileImages.length || photoReadyId === profile.id) ? 1 : 0,
              transform: [
                { translateX: swipeX },
                {
                  rotate: reduceMotion
                    ? "0deg"
                    : swipeX.interpolate({
                        inputRange: [-width, 0, width],
                        outputRange: ["-8deg", "0deg", "8deg"],
                        extrapolate: "clamp",
                      }),
                },
              ],
            },
          ]}
          {...swipe.panHandlers}
        >
          {profileImages.length > 0 ? (
            enableSwipe ? (
              <View style={StyleSheet.absoluteFillObject}>
                {profileImages.map((source, index) => (
                  <View
                    key={`${profile.id ?? profile.name}-${getImageKey(source, index)}`}
                    pointerEvents="none"
                    accessibilityElementsHidden={index !== safeActiveIndex}
                    importantForAccessibility={index !== safeActiveIndex ? "no-hide-descendants" : "auto"}
                    style={[StyleSheet.absoluteFillObject, { opacity: index === safeActiveIndex ? 1 : 0 }]}
                  >
                    <ProfileMediaImage
                      contentFit="cover" blurBackground showLoading
                      priority={index === safeActiveIndex ? "high" : "low"}
                      onDisplay={() => {
                        if (index === safeActiveIndex) {
                          setPhotoReadyId(profile.id);
                          if (!swipingRef.current) setSwipeNextProfile(null);
                        }
                      }}
                      source={source}
                      style={[StyleSheet.absoluteFillObject, { width }]}
                      fallbackBackgroundColor={PROFILE_PHOTO_BACKGROUND}
                      fallbackIconColor={vibesTheme.colors.accentBlue}
                      transition={0}
                    />
                  </View>
                ))}
              </View>
            ) : (
            <FlatList
              ref={galleryRef}
              data={profileImages}
              key={`${profile.id ?? profile.name}-${width}`}
              keyExtractor={getImageKey}
              horizontal
              scrollEnabled={!enableSwipe}
              pagingEnabled
              bounces={false}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleGalleryMomentumEnd}
              renderItem={({ item, index }) => (
                <Animated.View style={{ width, height: photoHeight }}>
                  <ProfileMediaImage
                contentFit="cover"
                blurBackground
                showLoading
                    onDisplay={() => {
                      if (index === safeActiveIndex) setPhotoReadyId(profile.id);
                    }}
                    source={item}
                    style={StyleSheet.absoluteFillObject}
                    fallbackBackgroundColor={PROFILE_PHOTO_BACKGROUND}
                    fallbackIconColor={vibesTheme.colors.accentBlue}
                    transition={0}
                  />
                </Animated.View>
              )}
              style={StyleSheet.absoluteFillObject}
              initialNumToRender={2}
              windowSize={3}
              removeClippedSubviews={false}
            />
            )
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

          <View
            style={{ position: "absolute", left: 0, right: 0, top: "12%", height: "53%" }}
            accessible={hasMultipleImages}
            accessibilityLabel={`Foto ${safeActiveIndex + 1} de ${profileImages.length}`}
            accessibilityActions={[
              { name: "increment", label: "Foto siguiente" },
              { name: "decrement", label: "Foto anterior" },
            ]}
            onAccessibilityAction={({ nativeEvent }) =>
              setGalleryIndex(safeActiveIndex + (nativeEvent.actionName === "increment" ? 1 : -1))
            }
          />
          <LinearGradient
            pointerEvents="none"
            colors={PROFILE_PHOTO_GRADIENT}
            locations={[0, 0.55, 1]}
            style={[localStyles.bottomGradient, detailsVisible && { opacity: 0 }]}
          />

          <LinearGradient
            pointerEvents="none"
            colors={["#00000080", "#00000000"]}
            style={[localStyles.topGradient, { height: insets.top + 120 }]}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar perfil"
            activeOpacity={0.82}
            onPress={onClose}
            hitSlop={8}
            style={[localStyles.closeButton, { top: insets.top + 4 }]}
          >
            <X size={44} color={vibesTheme.colors.background} strokeWidth={2.5} />
          </TouchableOpacity>

          {profileImages.length > 0 ? (
            <>
              <View
                pointerEvents="none"
                accessible
                accessibilityLabel={`Foto ${safeActiveIndex + 1} de ${profileImages.length}`}
                style={[localStyles.indicators, { top: insets.top + 25.5 }]}
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
            </>
          ) : null}

          {!detailsVisible && <View
            style={[
              localStyles.profileOverlay,
              { paddingBottom: Math.max(insets.bottom, 4) },
            ]}
          >
            <View style={localStyles.nameRow}>
              <View style={localStyles.nameCopy}>
                <Text style={localStyles.profileName} numberOfLines={2}>
                  {nameWithAge}
                </Text>
                {profile.zodiac ? (
                  <Text style={localStyles.profileAge}>{profile.zodiac}</Text>
                ) : null}
              </View>
            </View>
            {renderActions()}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Deslizar hacia arriba para ver el perfil completo"
              activeOpacity={0.84}
              onPress={showDetails}
              style={localStyles.galleryHint}
            >
              <Icon name="chevron-up" size={32} color={vibesTheme.colors.background} />
            </TouchableOpacity>
          </View>}
        </Animated.View>
        </Animated.View>
        <LikeBubbles trigger={burst} />
        {enableSwipe && (
          <View pointerEvents="none" style={localStyles.swipeIndicators}>
            <Animated.View
              style={[
                localStyles.swipeStamp,
                {
                  borderColor: vibesTheme.colors.accentMustard,
                  transform: [
                    {
                      scale: swipeX.interpolate({
                        inputRange: [0, 120],
                        outputRange: [0.65, 1.5],
                        extrapolate: "clamp",
                      }),
                    },
                  ],
                  opacity: swipeX.interpolate({
                    inputRange: [0, 85],
                    outputRange: [0, 1],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            >
              <Icon name="checkmark" size={42} color={vibesTheme.colors.primaryText} />
            </Animated.View>
            <Animated.View
              style={[
                localStyles.swipeStamp,
                {
                  borderColor: vibesTheme.colors.accentBlue,
                  transform: [
                    {
                      scale: swipeX.interpolate({
                        inputRange: [-120, 0],
                        outputRange: [1.5, 0.65],
                        extrapolate: "clamp",
                      }),
                    },
                  ],
                  opacity: swipeX.interpolate({
                    inputRange: [-85, 0],
                    outputRange: [1, 0],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            >
              <Icon name="close" size={42} color={vibesTheme.colors.primaryText} />
            </Animated.View>
          </View>
        )}
        <Animated.View
          pointerEvents={detailsVisible ? "box-none" : "none"}
          key={`profile-details-${profile.id}`}
          style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: swipeX }] }]}
        >
        <AnimatedSheetModal
          inline
          visible={visible && detailsVisible}
          onClose={closeDetails}
          closeOnBackdropPress={false}
          offsetY={reduceMotion ? 0 : 28}
          sheetInDelay={0}
          sheetInDuration={reduceMotion ? 0 : 300}
          sheetOutDuration={reduceMotion ? 0 : 240}
          sheetInOpacityDuration={reduceMotion ? 0 : 220}
          sheetOutOpacityDuration={reduceMotion ? 0 : 180}
          backdropColor="transparent"
          sheetStyle={[
            localStyles.detailsSheet,
            { flex: 1 },
          ]}
        >
          <View style={localStyles.detailsPanel}>
            <ScrollView
              style={localStyles.detailsScroll}
              alwaysBounceVertical
              refreshControl={
                <RefreshControl
                  refreshing={false}
                  onRefresh={closeDetails}
                  tintColor="transparent"
                  colors={["transparent"]}
                  progressBackgroundColor="transparent"
                />
              }
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: insets.top, paddingBottom: detailsActionsHeight + 24 }}
            >
              <View style={localStyles.detailsHeader}>
                <Text style={localStyles.detailsName}>{nameWithAge}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Bajar y volver a la foto completa"
                  activeOpacity={0.82}
                  onPress={closeDetails}
                  style={localStyles.lowerDetailsButton}
                >
                  <Icon name="chevron-down" size={30} color={vibesTheme.colors.accentMustard} />
                </TouchableOpacity>
              </View>
              <View style={{ width, height: compactPhotoHeight }}>
                {profileImages.length ? (
                  <FlatList
                    ref={detailsGalleryRef}
                    key={`details-${profile.id ?? profile.name}-${width}`}
                    data={profileImages}
                    keyExtractor={getImageKey}
                    horizontal
                    pagingEnabled
                    directionalLockEnabled
                    nestedScrollEnabled
                    bounces={false}
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={safeActiveIndex}
                    getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                    onMomentumScrollEnd={handleGalleryMomentumEnd}
                    renderItem={({ item, index }) => (
                      <View style={{ width, height: compactPhotoHeight }}>
                        <ProfileMediaImage source={item} style={StyleSheet.absoluteFillObject}
                          contentFit="contain" blurBackground showLoading transition={0}
                          fallbackBackgroundColor={PROFILE_PHOTO_BACKGROUND} />
                        {hasMultipleImages ? (
                          <View style={[StyleSheet.absoluteFillObject, { flexDirection: "row" }]}>
                            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1}
                              accessibilityRole="button" accessibilityLabel="Foto anterior"
                              disabled={index === 0}
                              onPress={() => setGalleryIndex(index - 1)} />
                            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1}
                              accessibilityRole="button" accessibilityLabel="Foto siguiente"
                              disabled={index === profileImages.length - 1}
                              onPress={() => setGalleryIndex(index + 1)} />
                          </View>
                        ) : null}
                      </View>
                    )}
                  />
                ) : (
                  <ProfileMediaImage source={VIBES_FALLBACK_ILLUSTRATION}
                    style={StyleSheet.absoluteFillObject} contentFit="contain" />
                )}
                {hasMultipleImages ? (
                  <View style={localStyles.detailsPhotoIndicators}>
                    {profileImages.map((_, index) => (
                      <TouchableOpacity key={index} accessibilityRole="button"
                        accessibilityLabel={`Ver foto ${index + 1}`}
                        accessibilityState={{ selected: index === safeActiveIndex }}
                        onPress={() => setGalleryIndex(index)}
                        style={localStyles.detailsPhotoIndicatorTouch}>
                        <View style={[localStyles.indicator, { flex: 0 }, index === safeActiveIndex && localStyles.indicatorActive]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={localStyles.detailsContent}>
              {profile.description || purpose || energy || profile.prompt ? (
                <DetailSection label="Sobre mí" emphasized>
                  {profile.description ? <PillList items={[profile.description]} /> : null}
                  {purpose ? <View style={localStyles.detailItem}><Text style={[localStyles.detailLabel, localStyles.emphasizedDetailLabel]}>Me trae a Vibes</Text><PillList items={[purpose]} /></View> : null}
                  {energy ? <View style={localStyles.detailItem}><Text style={localStyles.detailValue}>Hoy me siento</Text><PillList items={[energy === "Sanando" ? "Óptimo" : energy]} blue /></View> : null}
                  {profile.prompt ? <View style={localStyles.detailItem}><Text style={localStyles.detailValue}>Ritual</Text><PillList items={[profile.prompt]} /></View> : null}
                </DetailSection>
              ) : null}
              {location || distance || specificationGroups.length ? (
                <DetailSection label="Características" emphasized>
                  {location ? <View style={localStyles.detailItem}><Text style={localStyles.pillGroupLabel}>Ubicación</Text><PillList items={[location]} /></View> : null}
                  {distance ? <View style={localStyles.detailItem}><Text style={localStyles.pillGroupLabel}>Distancia de vos</Text><PillList items={[distance]} /></View> : null}
                  {specificationGroups.length ? <GroupedPillList groups={specificationGroups} /> : null}
                </DetailSection>
              ) : null}
              {profile.spiritualPath?.length || habitGroups.length || lifestyleGroups.length ? (
                <DetailSection label="Estilos de vida" emphasized>
                  {profile.spiritualPath?.length ? <View style={localStyles.detailItem}><Text style={localStyles.detailValue}>Camino espiritual</Text><PillList items={profile.spiritualPath} /></View> : null}
                  {habitGroups.length || lifestyleGroups.length ? <GroupedPillList groups={mergeDetailChipGroups([...habitGroups, ...lifestyleGroups])} /> : null}
                </DetailSection>
              ) : null}
              {profile.tags?.length || interestGroups.length ? (
                <DetailSection label="Intereses" emphasized>
                  {profile.tags?.length ? <PillList items={profile.tags} /> : null}
                  {interestGroups.length ? <GroupedPillList groups={interestGroups.map((group) => ({ ...group, values: group.values.filter((value) => !profile.tags?.includes(value)) })).filter((group) => group.values.length)} /> : null}
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
                        <Icon
                          name="calendar-outline"
                          size={18}
                          color={vibesTheme.colors.accentMustard}
                        />
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
                        <Icon
                          name="sparkles-outline"
                          size={18}
                          color={vibesTheme.colors.accentBlue}
                        />
                        <Text style={localStyles.detailValueFlexible}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </DetailSection>
              ) : null}
              </View>
            </ScrollView>
            {(onContactPress || onSecondaryActionPress || onNextActionPress) ? (
              <View
                pointerEvents="box-none"
                onLayout={({ nativeEvent }) => setDetailsActionsHeight(nativeEvent.layout.height)}
                style={[localStyles.floatingDetailsActions, { paddingBottom: Math.max(insets.bottom, 12) }]}
              >
                {renderActions(true)}
              </View>
            ) : null}
          </View>
        </AnimatedSheetModal>
        </Animated.View>
      </AnimatedSheetModal>
    </>
  );
};

export default UserProfileSheet;

const localStyles = StyleSheet.create({
  nextProfileCopy: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    height: "45%",
    justifyContent: "flex-end",
  },
  swipeIndicators: {
    ...StyleSheet.absoluteFillObject,
    left: 24,
    right: 24,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  swipeStamp: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 36,
    backgroundColor: "rgba(254, 254, 253, 0.97)",
  },
  swipeStampText: { fontFamily: vibesTheme.fonts.subtitle, fontSize: 22 },
  fullscreenSheet: { width: "100%", backgroundColor: PROFILE_PHOTO_BACKGROUND },
  screen: { flex: 1, overflow: "hidden", backgroundColor: PROFILE_PHOTO_BACKGROUND },
  fallbackCanvas: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: PROFILE_PHOTO_BACKGROUND,
  },
  fallbackCircleBlue: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    left: -150,
    top: "18%",
    backgroundColor: "rgba(127, 152, 183, 0.55)",
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
    height: "45%",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  closeButton: {
    position: "absolute",
    left: 14,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  indicators: {
    position: "absolute",
    left: 78,
    right: 28,
    flexDirection: "row",
    gap: 7,
    zIndex: 10,
  },
  indicator: {
    flex: 1,
    height: 5,
    minWidth: 12,
    borderRadius: 3,
    backgroundColor: "rgba(254, 254, 253, 0.4)",
  },
  indicatorActive: { backgroundColor: vibesTheme.colors.accentMustard },
  profileOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    zIndex: 3,
  },
  galleryHint: { alignSelf: "center", alignItems: "center", marginTop: 0, marginBottom: 0, minHeight: 48 },
  galleryHintText: {
    marginTop: 2,
    color: "rgba(254, 254, 253, 0.9)",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  nameRow: {
    transform: [{ translateY: 6 }],
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 4,
  },
  nameCopy: { flex: 1, minWidth: 0 },
  profileName: {
    color: vibesTheme.colors.background,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: vibesTheme.fonts.bold,
  },
  profileAge: {
    marginTop: 1,
    color: "rgba(254, 254, 253, 0.88)",
    fontSize: 21,
    lineHeight: 27,
    fontFamily: vibesTheme.fonts.medium,
  },
  moreButton: {
    minWidth: 112,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(254, 254, 253, 0.94)",
  },
  moreButtonText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 17,
    fontFamily: vibesTheme.fonts.medium,
  },
  vibeActions: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginTop: 18,
  },
  vibeAction: { minWidth: 64, alignItems: "center", gap: 6 },
  bareActionIcon: { backgroundColor: "transparent", borderWidth: 0 },
  actionIconShadow: {
    textShadowColor: "rgba(43, 43, 43, 0.65)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  vibeActionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(254, 254, 253, 0.6)",
  },
  vibeActionLabel: {
    color: vibesTheme.colors.background,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.regular,
  },
  actions: { marginTop: 18, gap: 6 },
  primaryActionTouch: {
    minHeight: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: vibesTheme.colors.accentMustard,
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
    color: vibesTheme.colors.primaryText,
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
  nextAction: {
    minHeight: 48,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(127, 152, 183, 0.28)",
    backgroundColor: vibesTheme.colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
  },
  nextActionText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.semibold,
  },
  secondaryActionText: {
    color: "rgba(254, 254, 253, 0.9)",
    fontSize: 17,
    fontFamily: vibesTheme.fonts.medium,
  },
  panelSecondaryActionText: { color: vibesTheme.colors.secondaryText },
  destructiveSecondaryActionText: { color: vibesTheme.colors.accentCoral },
  detailsSheet: {
    width: "100%",
    backgroundColor: "transparent",
  },
  detailsPanel: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: vibesTheme.colors.background,
  },
  detailsScroll: { flex: 1 },
  detailsPhotoIndicators: { position: "absolute", top: 4, left: 16, right: 16, flexDirection: "row", gap: 5 },
  detailsPhotoIndicatorTouch: { flex: 1, minHeight: 44, justifyContent: "center" },
  lowerDetailsButton: {
    minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12,
  },
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
    color: vibesTheme.colors.primaryText,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: vibesTheme.fonts.bold,
  },
  detailsCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
  },
  detailsDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    backgroundColor: "rgba(43, 43, 43, 0.16)",
  },
  detailsContent: { paddingHorizontal: 24, paddingTop: 18 },
  detailSection: {
    marginBottom: 20, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(110, 110, 110, 0.25)",
  },
  detailItem: { marginTop: 20, gap: 10 },
  detailLabel: {
    marginBottom: 12,
    color: vibesTheme.colors.secondaryText,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.medium,
  },
  emphasizedDetailLabel: {
    color: vibesTheme.colors.primaryText,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: vibesTheme.fonts.semibold,
  },
  detailBody: {
    color: vibesTheme.colors.primaryText,
    fontSize: 18,
    lineHeight: 27,
    fontFamily: vibesTheme.fonts.medium,
  },
  detailValue: {
    color: vibesTheme.colors.primaryText,
    fontSize: 20,
    lineHeight: 27,
    fontFamily: vibesTheme.fonts.medium,
  },
  detailValueFlexible: {
    flex: 1,
    color: vibesTheme.colors.primaryText,
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
  groupedPillList: {
    marginTop: 18,
    gap: 22,
  },
  pillGroup: {
    gap: 10,
  },
  pillGroupLabel: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.semibold,
    textTransform: "uppercase",
  },
  pill: {
    maxWidth: "100%",
    flexShrink: 1,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: vibesTheme.colors.accentMustard,
  },
  pillBlue: {
    backgroundColor: "transparent",
    borderColor: vibesTheme.colors.accentMustard,
  },
  pillText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  sharedList: { gap: 10 },
  panelActions: { marginTop: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  floatingActionItem: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center" },
  floatingProfileAction: {
    backgroundColor: vibesTheme.colors.background,
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    gap: 0,
    shadowColor: vibesTheme.colors.primaryText,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  floatingDetailsActions: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingTop: 12, paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
});
