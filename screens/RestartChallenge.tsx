/** @format */

import React, { useMemo, useState } from "react";
import { Alert, Image, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { StackActions, useNavigation, useRoute } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import AppHeader from "../components/AppHeader";
import VibesHeader from "../src/components/VibesHeader";
import VibesActionButton from "../components/VibesActionButton";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import Icon from "../components/Icon";
import { Text, TextInput } from "../components/Typography";
import { launchAppCamera } from "../components/AppCamera";
import FriendsPickerSheet from "../components/challengeRestart/FriendsPickerSheet";
import { restartStyles } from "../components/challengeRestart/styles";
import { useI18n } from "../src/i18n";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import type { EventFeedItem } from "../src/queries/events.queries";
import { useRestartChallengeMutation } from "../src/queries/challengeRestart.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

const IMAGE_MEDIA_TYPE = (ImagePicker as any).MediaType?.Images
  ? [(ImagePicker as any).MediaType.Images]
  : ["images"];

const sameCalendarDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";

const RestartChallenge = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const source = route.params?.source as EventFeedItem;
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "es-AR";
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const { data: profile } = useProfileQuery(userId);
  const restart = useRestartChallengeMutation();

  const originalStart = useMemo(
    () => (source?.startsAt ? new Date(source.startsAt) : null),
    [source?.startsAt],
  );
  const [title, setTitle] = useState(source?.title ?? "");
  const [description, setDescription] = useState(source?.description ?? "");
  const [imageUri, setImageUri] = useState<string | null>(source?.imageUrl ?? null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [coverSheet, setCoverSheet] = useState(false);
  const [friendsVisible, setFriendsVisible] = useState(false);
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);

  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);
  const sameAsOriginal = Boolean(startDate && originalStart && sameCalendarDay(startDate, originalStart));
  const canSubmit =
    Boolean(source && userId && title.trim() && startDate && !sameAsOriginal) && !restart.isPending;
  const coverSource = imageUri
    ? { uri: imageUri }
    : typeof source?.image === "string"
      ? { uri: source.image }
      : source?.image;

  const pickImage = async (camera: boolean) => {
    setCoverSheet(false);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        t("challengeRestart.permissionTitle"),
        t(camera ? "challengeRestart.permissionCamera" : "challengeRestart.permissionGallery"),
      );
      return;
    }
    const options = { mediaTypes: IMAGE_MEDIA_TYPE, allowsEditing: true, aspect: [16, 9] as [number, number], quality: 0.85 };
    const result = camera
      ? await launchAppCamera({ ...options, cameraType: ImagePicker.CameraType.back })
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets?.[0]?.uri) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!canSubmit || !startDate || !userId) return;
    const startsAt = new Date(startDate);
    startsAt.setHours(12, 0, 0, 0);
    const hostName =
      (typeof profile?.displayName === "string" && profile.displayName.trim()) ||
      session?.user?.email?.split("@")[0] ||
      null;
    try {
      const result = await restart.mutateAsync({
        userId,
        source,
        title,
        description,
        imageUri,
        startsAt: startsAt.toISOString(),
        hostName,
        inviteeIds,
      });
      if (!result.mediaCopied) Alert.alert(t("challengeRestart.mediaWarning"));
      navigation.dispatch(
        StackActions.replace("ChallengeDetailScreen", { challengeId: result.challengeId }),
      );
    } catch (error) {
      Alert.alert(t("challengeRestart.errorTitle"), errorMessage(error));
    }
  };

  if (!source) return null;

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <VibesHeader
        align="left"
        title={t("challengeRestart.screenTitle")}
        subtitle={t("challengeRestart.screenSubtitle")}
      />

      <Text style={styles.label}>{t("challengeRestart.coverLabel")}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("challengeRestart.changeCover")}
        style={styles.cover}
        onPress={() => setCoverSheet(true)}
        activeOpacity={0.88}
      >
        {coverSource ? <Image source={coverSource} style={styles.coverImage} /> : null}
        <View style={styles.coverBadge}>
          <Icon name="camera-outline" size={17} color={vibesTheme.colors.primaryText} />
          <Text style={styles.coverBadgeText}>{t("challengeRestart.changeCover")}</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>{t("challengeRestart.titleLabel")}</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={160} />

      <Text style={styles.label}>{t("challengeRestart.descriptionLabel")}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        scrollEnabled={false}
      />

      <Text style={styles.label}>{t("challengeRestart.startDateLabel")}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <View style={restartStyles.row}>
          <Icon name="calendar-outline" size={18} color={vibesTheme.colors.accentMustard} />
          <Text style={[styles.inputText, !startDate && { color: vibesTheme.colors.secondaryText }]}>
            {startDate
              ? startDate.toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })
              : t("challengeRestart.startDatePlaceholder")}
          </Text>
        </View>
      </TouchableOpacity>
      {originalStart ? (
        <Text style={[styles.hint, sameAsOriginal && styles.error]}>
          {sameAsOriginal
            ? t("challengeRestart.sameDateError")
            : t("challengeRestart.startDateHint", {
                date: originalStart.toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }),
              })}
        </Text>
      ) : null}
      {showDatePicker ? (
        <DateTimePicker
          value={startDate ?? today}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={today}
          locale={dateLocale}
          themeVariant="light"
          accentColor={vibesTheme.colors.accentBlue}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type !== "dismissed" && date) setStartDate(date);
          }}
        />
      ) : null}

      <Text style={styles.hint}>
        {t("challengeRestart.duration", { count: source.durationDays ?? 0 })}
      </Text>

      <View style={styles.privacyCard}>
        <Icon name="lock-closed-outline" size={20} color={vibesTheme.colors.accentBlue} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.privacyText}>{t("challengeRestart.privacyNote")}</Text>
          <Text style={styles.hint}>{t("challengeRestart.youParticipate")}</Text>
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        style={restartStyles.pill}
        onPress={() => setFriendsVisible(true)}
      >
        <Icon name="people-outline" size={18} color={vibesTheme.colors.accentBlue} />
        <Text style={restartStyles.pillText}>
          {inviteeIds.length
            ? t("challengeRestart.invitedCount", { count: inviteeIds.length })
            : t("challengeRestart.inviteFriends")}
        </Text>
      </TouchableOpacity>

      <VibesActionButton
        style={{ marginTop: vibesTheme.spacing.lg }}
        label={restart.isPending ? t("challengeRestart.submitting") : t("challengeRestart.submit")}
        onPress={() => void submit()}
        disabled={!canSubmit}
      />

      <FriendsPickerSheet
        visible={friendsVisible}
        onClose={() => setFriendsVisible(false)}
        selected={inviteeIds}
        onChange={setInviteeIds}
        excludeIds={userId ? [userId] : []}
      />
      <AnimatedSheetModal
        visible={coverSheet}
        onClose={() => setCoverSheet(false)}
        sheetStyle={[restartStyles.sheet, { paddingBottom: 32 }]}
      >
        <View style={restartStyles.handle} />
        <Text style={restartStyles.sheetTitle}>{t("challengeRestart.coverLabel")}</Text>
        <VibesActionButton label={t("challengeRestart.useGallery")} onPress={() => void pickImage(false)} />
        <VibesActionButton variant="skip" label={t("challengeRestart.useCamera")} onPress={() => void pickImage(true)} />
      </AnimatedSheetModal>
    </ScreenContainer>
  );
};

export default RestartChallenge;

const { colors, fonts, radii, spacing } = vibesTheme;
const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  label: {
    marginTop: spacing.md,
    color: colors.primaryText,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  input: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.35)",
    backgroundColor: colors.surface,
    color: colors.primaryText,
    fontFamily: fonts.primary,
    fontSize: 17,
  },
  inputText: { color: colors.primaryText, fontFamily: fonts.primary, fontSize: 17 },
  multiline: { minHeight: 110 },
  hint: { color: colors.secondaryText, fontFamily: fonts.primary, fontSize: 15, lineHeight: 20 },
  error: { color: colors.accentCoral },
  cover: {
    height: 180,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: "rgba(244, 163, 64, 0.12)",
    justifyContent: "flex-end",
  },
  coverImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  coverBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  coverBadgeText: { color: colors.primaryText, fontFamily: fonts.bold, fontSize: 15 },
  privacyCard: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: "rgba(57, 120, 184, 0.08)",
  },
  privacyText: { color: colors.primaryText, fontFamily: fonts.primary, fontSize: 16, lineHeight: 22 },
});
