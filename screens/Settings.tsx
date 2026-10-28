import { defaultCommunities, readCommunities } from "../src/lib/communities";
import SelectablePill from "../components/onboarding/SelectablePill";
import ProfileSectionTabs from "../components/ProfileSectionTabs";
import { PROFILE_PREFERENCE_OPTIONS } from "../src/lib/profilePreferenceOptions";
/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QUESTION_GROUPS } from "../src/lib/profileQuestions";
import { INTERESTED_IN_OPTIONS, interestedIn as readInterestedIn } from "../supabase/functions/vibi-chat/dating";
import { PURPOSE_OPTIONS, getPurposeDisplayLabel, togglePurposeSelection } from "../src/screens/Onboarding/vibesOnboardingContent";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Keyboard,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles, {
  DARK_GRAY,
  GRAY,
  TEXT_SECONDARY,
  WHITE,
} from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import SpiritualPathDetailsModal from "../components/SpiritualPathDetailsModal";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  getSelectedSpiritualPaths,
  getSpiritualPathDetailEntries,
  normalizeSpiritualPathDetail,
  normalizeSpiritualPathDetails,
  SPIRITUAL_PATH_OPTIONS,
  type SpiritualPathDetail,
  type SpiritualPathDetails,
} from "../src/lib/spiritualPaths";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { showToast } from "../src/utils/toast";
import { useI18n } from "../src/i18n";
import { translateSpiritualPathLabel } from "../src/i18n/translations";
import { vibesTheme } from "../src/theme/vibesTheme";

const OTHER_DEFAULT_OPTIONS = ["Viajes", "Animales", "Arte"];
const GENDER_OPTIONS = QUESTION_GROUPS[0].fields[0].options;
const LOOKING_FOR_OPTIONS = QUESTION_GROUPS[0].fields[1].options;
const LANGUAGE_OPTIONS = QUESTION_GROUPS[1].fields[5].options;

const normalizeTextArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];

const normalizeHeightInput = (value: string) =>
  value.replace(/\D/g, "").slice(0, 3);

const Settings = () => {
  const { locale, t } = useI18n();
  const navigation = useNavigation();
  const route = useRoute();
  const fromAboutMe = Boolean((route.params as {fromAboutMe?:boolean}|undefined)?.fromAboutMe);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState(0);
  const preferencesScroll = useRef<ScrollView>(null);
  const [hideAge, setHideAge] = useState(false);
  const [purposes, setPurposes] = useState<string[]>([]);
  const { data: session } = useAuthSession();
  const {
    data: prefs,
    refetch,
    isPending,
    isError,
  } = useUserPreferencesQuery(session?.user?.id);

  const [spiritualPath, setSpiritualPath] = useState<string[]>([]);
  const [spiritualPathDetails, setSpiritualPathDetails] =
    useState<SpiritualPathDetails>({});
  const [activeSpiritualPath, setActiveSpiritualPath] = useState<string | null>(
    null
  );
  const [vegetarian, setVegetarian] = useState<string>("");
  const [aboutMe, setAboutMe] = useState("");
  const [gender, setGender] = useState("");
  const [interestedIn, setInterestedIn] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [connectWith, setConnectWith] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [smoking, setSmoking] = useState<string>("");
  const [otherOptions, setOtherOptions] = useState<string[]>(
    OTHER_DEFAULT_OPTIONS
  );
  const [selectedOtherTags, setSelectedOtherTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  useEffect(() => {
    if (!prefs) return;
    setInterestedIn(readInterestedIn(prefs));
    setPurposes(normalizeTextArray(prefs.openTo));
    setHideAge(prefs.hideAge === true);

    setSpiritualPath(
      getSelectedSpiritualPaths(
        prefs.spiritualPath ?? prefs.spiritual_path,
        prefs.spiritualPathDetails ?? prefs.spiritual_path_details
      )
    );
    setSpiritualPathDetails(
      normalizeSpiritualPathDetails(
        prefs.spiritualPathDetails ?? prefs.spiritual_path_details
      )
    );

    if (typeof prefs.vegetarian === "string") {
      setVegetarian(prefs.vegetarian);
    }
    if (typeof prefs.smoking === "string") {
      setSmoking(prefs.smoking);
    }
    if (typeof prefs.aboutMe === "string") {
      setAboutMe(prefs.aboutMe);
    }
    if (typeof (prefs.gender ?? prefs.genderLabel) === "string") {
      setGender((prefs.gender ?? prefs.genderLabel) as string);
    }
    const nextHeight = prefs.heightCm ?? prefs.height_cm;
    if (typeof nextHeight === "number" || typeof nextHeight === "string") {
      setHeightCm(normalizeHeightInput(String(nextHeight)));
    }
    const nextLookingFor = normalizeTextArray(
      prefs.lookingFor ?? prefs.looking_for
    );
    setLookingFor(nextLookingFor);
    const storedGenders = prefs.discoverGenders ?? prefs.discover_genders;
    const legacyGenderId = prefs.discoverGenderId ?? prefs.discover_gender_id;
    setConnectWith(Array.isArray(storedGenders)
      ? normalizeTextArray(storedGenders).map((value) => value === "nonbinary" ? "other" : value)
      : legacyGenderId === 1 ? ["woman"] : legacyGenderId === 2 ? ["man"] : [3, 4].includes(legacyGenderId) ? ["other"] : []);
    const nextLanguages = normalizeTextArray(prefs.languages);
    setLanguages(nextLanguages);
    if (Array.isArray(prefs.otherTags) && prefs.otherTags.length) {
      setSelectedOtherTags(prefs.otherTags);
      setOtherOptions((prev) =>
        Array.from(new Set([...prev, ...prefs.otherTags]))
      );
    }
  }, [prefs]);

  const selectedOthers = useMemo(
    () => new Set(selectedOtherTags),
    [selectedOtherTags]
  );
  const selectedLookingFor = useMemo(() => new Set(lookingFor), [lookingFor]);
  const selectedLanguages = useMemo(() => new Set(languages), [languages]);

  const openSpiritualPathEditor = (item: string) => {
    setSpiritualPath((prev) => (prev.includes(item) ? prev : [...prev, item]));
    setActiveSpiritualPath(item);
  };

  const updateSpiritualPathDetail = (
    item: string,
    nextDetail: SpiritualPathDetail
  ) => {
    setSpiritualPathDetails((prev) => ({
      ...prev,
      [item]: normalizeSpiritualPathDetail(nextDetail),
    }));
  };

  const removeSpiritualPath = (item: string) => {
    setSpiritualPath((prev) => prev.filter((value) => value !== item));
    setSpiritualPathDetails((prev) => {
      const next = { ...prev };
      delete next[item];
      return next;
    });
    setActiveSpiritualPath(null);
  };

  const toggleOther = (item: string) => {
    setSelectedOtherTags((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item]
    );
  };

  const toggleLookingFor = (item: string) => {
    setLookingFor((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item]
    );
  };

  const toggleLanguage = (item: string) => {
    setLanguages((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item]
    );
  };

  const addCustomTag = () => {
    const next = customTag.trim();
    if (!next) {
      Alert.alert(
        t("settings.missingInterestTitle"),
        t("settings.missingInterestMessage")
      );
      return;
    }
    if (otherOptions.includes(next)) {
      Alert.alert(
        t("settings.duplicateInterestTitle"),
        t("settings.duplicateInterestMessage")
      );
      setCustomTag("");
      return;
    }
    setOtherOptions((prev) => [...prev, next]);
    setSelectedOtherTags((prev) => [...prev, next]);
    setCustomTag("");
  };

  const handleSave = async (nextScreen?: string) => {
    const userId = session?.user?.id;
    if (saving || isPending || isError) return;
    if (!userId) {
      Alert.alert(t("common.error"), t("settings.missingSession"));
      return;
    }

    setSaving(true);
    try {
      await upsertUserPreferences(userId, {
        hide_age: hideAge,
        spiritual_path: spiritualPath,
        ...(JSON.stringify(defaultCommunities(prefs)) === JSON.stringify(readCommunities(spiritualPath)) ? {} : { discover_spiritual_paths: readCommunities(spiritualPath) }),
        spiritual_path_details: spiritualPathDetails,
        vegetarian: vegetarian || null,
        about_me: aboutMe,
        gender: gender || null,
        height_cm: heightCm ? Number.parseInt(heightCm, 10) : null,
        looking_for: lookingFor,
        profile_answers: { ...(prefs?.profileAnswers ?? prefs?.profile_answers ?? {}), interestedIn },
        discover_genders: connectWith,
        open_to: purposes,
        languages,
        smoking: smoking || null,
        other_tags: selectedOtherTags,
      });
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      await queryClient.invalidateQueries({
        queryKey: ["profileAnswers", userId],
      });
      if (nextScreen) navigation.navigate(nextScreen as never);
      else navigation.goBack();
      setTimeout(() => {
        showToast(t("settings.saved"), {
          type: "success",
          text1: t("settings.saved"),
        });
      }, 180);
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.message || t("settings.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const renderChip = (label: string, active: boolean, onPress: () => void) => (
    <SelectablePill key={label} label={label} selected={active} onPress={onPress} />
  );

  return (
    <SafeAreaView style={styles.bg} edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={localStyles.fixedHeader}>
          <AppHeader
            title={fromAboutMe ? "Más opciones de perfil" : t("settings.title")}
            subtitle={fromAboutMe ? "Visibilidad y datos adicionales" : t("settings.subtitle")}
            showBack
            onBack={() => navigation.goBack()}
            style={localStyles.appHeader}
            contentStyle={localStyles.headerCopy}
            titleStyle={localStyles.headerTitle}
            subtitleStyle={localStyles.headerSubtitle}
          />
          <ProfileSectionTabs value={group} onChange={(next) => { Keyboard.dismiss(); setGroup(next); preferencesScroll.current?.scrollTo({ y: 0, animated: false }); }} />
        </View>

        <ScrollView
          ref={preferencesScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          style={localStyles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={localStyles.scrollContent}
        >
          {isError ? (
            <TouchableOpacity
              onPress={() => void refetch()}
              style={localStyles.detailItem}
            >
              <Text>
                No pudimos cargar tus preferencias. Tocá para reintentar.
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={group !== 0 ? { display: "none" } : undefined}><View style={localStyles.section}>
            <View style={localStyles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={localStyles.sectionTitle}>{t("settings.hideAge")}</Text>
                <Text style={localStyles.helperText}>{t("settings.hideAgeHint")}</Text>
              </View>
              <Switch
                accessibilityLabel={t("settings.hideAge")}
                value={hideAge}
                onValueChange={setHideAge}
                disabled={saving || isPending || isError}
                trackColor={{ false: vibesTheme.colors.secondaryText, true: vibesTheme.colors.primaryText }}
                thumbColor={vibesTheme.colors.surface}
                ios_backgroundColor={vibesTheme.colors.secondaryText}
              />
            </View>
          </View></View>
          <View style={group !== 1 ? { display: "none" } : undefined}><View style={localStyles.section}>
            <View style={localStyles.sectionHeader}>
              <Icon name="leaf-outline" size={18} color={TEXT_SECONDARY} />
              <Text style={localStyles.sectionTitle}>
                {t("settings.spiritualPath")}
              </Text>
              <View style={localStyles.line} />
            </View>
            <Text style={localStyles.helperText}>
              {t("settings.spiritualPathHint")}
            </Text>
            <View style={localStyles.chipWrap}>
              {SPIRITUAL_PATH_OPTIONS.map((item) =>
                renderChip(
                  translateSpiritualPathLabel(locale, item),
                  spiritualPath.includes(item),
                  () => openSpiritualPathEditor(item)
                )
              )}
            </View>
            {spiritualPath.length > 0 ? (
              <View style={localStyles.detailList}>
                {spiritualPath.map((item) => (
                  <TouchableOpacity
                    key={`${item}-detail`}
                    style={localStyles.detailItem}
                    onPress={() => setActiveSpiritualPath(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={localStyles.detailItemTitle}>
                      {translateSpiritualPathLabel(locale, item)}
                    </Text>
                    <Text style={localStyles.detailItemSubtitle}>
                      {getSpiritualPathDetailEntries(spiritualPathDetails[item])
                        .map((entry) => `${entry.label}: ${entry.value}`)
                        .join(" · ") || "Sin datos adicionales"}
                    </Text>
                    <Text style={{ color: vibesTheme.colors.accentBlue, marginTop: 8 }}>
                      Editar
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View></View>

          <View style={group !== 1 ? { display: "none" } : undefined}><View style={localStyles.section}>
            <View style={localStyles.sectionHeader}>
              <Icon name="leaf-outline" size={18} color={TEXT_SECONDARY} />
              <Text style={localStyles.sectionTitle}>
                {t("settings.vegetarian")}
              </Text>
              <View style={localStyles.line} />
            </View>
            <View style={localStyles.chipWrap}>
              {renderChip(t("common.yes"), vegetarian === "Sí", () =>
                setVegetarian("Sí")
              )}
              {renderChip(t("common.no"), vegetarian === "No", () =>
                setVegetarian("No")
              )}
              {["Pescetariano", "Vegano"].map((option) =>
                renderChip(option, vegetarian === option, () =>
                  setVegetarian(option)
                )
              )}
            </View>
          </View></View>

          <View style={group !== 0 ? { display: "none" } : undefined}><View style={localStyles.section}>
            <View style={localStyles.sectionHeader}>
              <Icon name="flower-outline" size={18} color={TEXT_SECONDARY} />
              <Text style={localStyles.sectionTitle}>
                {t("settings.aboutMe")}
              </Text>
              <View style={localStyles.line} />
            </View>
            <TextInput
              style={localStyles.aboutInput}
              multiline
              numberOfLines={8}
              value={aboutMe}
              onChangeText={setAboutMe}
              placeholder={t("settings.aboutMePlaceholder")}
              placeholderTextColor={GRAY}
              textAlignVertical="top"
            />
          </View></View>

          <View style={group !== 0 ? { display: "none" } : undefined}><View style={localStyles.preferencePanel}>
            <View style={localStyles.sectionHeader}>
              <Icon
                name="person-circle-outline"
                size={18}
                color={TEXT_SECONDARY}
              />
              <Text style={localStyles.sectionTitle}>
                {t("settings.identity")}
              </Text>
              <View style={localStyles.line} />
            </View>

            <Text style={localStyles.fieldLabel}>{t("settings.gender")}</Text>
            <View style={localStyles.chipWrap}>
              {GENDER_OPTIONS.map((item) =>
                renderChip(item, gender === item, () =>
                  setGender(gender === item ? "" : item)
                )
              )}
            </View>

            <Text style={localStyles.fieldLabel}>{t("settings.height")}</Text>
            <View style={localStyles.heightRow}>
              <TextInput
                style={localStyles.heightInput}
                value={heightCm}
                onChangeText={(value) =>
                  setHeightCm(normalizeHeightInput(value))
                }
                placeholder={t("settings.heightPlaceholder")}
                placeholderTextColor={GRAY}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={localStyles.heightUnit}>cm</Text>
            </View>
          </View></View>

          <View style={group !== 0 ? { display: "none" } : undefined}><View style={localStyles.preferencePanel}>
            <Text style={localStyles.sectionTitle}>Más sobre vos</Text>
            {(
              [
                "education",
                "family_plan",
                "communication_style",
                "love_style",
              ] as const
            ).map((key) => (
              <TouchableOpacity
                key={key}
                accessibilityRole="button"
                style={{
                  minHeight: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                }}
                onPress={() =>
                  navigation.navigate(
                    "PreferenceDetail" as never,
                    {
                      key,
                      label: PROFILE_PREFERENCE_OPTIONS[key].label,
                    } as never
                  )
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={localStyles.fieldLabel}>
                    {PROFILE_PREFERENCE_OPTIONS[key].label}
                  </Text>
                  <Text style={localStyles.helperText}>
                    {prefs?.[key] ??
                      prefs?.[
                        key.replace(/_([a-z])/g, (_, letter: string) =>
                          letter.toUpperCase()
                        )
                      ] ??
                      "Sin completar"}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={20} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            ))}
          </View></View>

          <View style={group !== 2 ? { display: "none" } : undefined}><View style={localStyles.preferencePanel}>
            <Text style={localStyles.sectionTitle}>{t("settings.connectWith")}</Text>
            <Text style={localStyles.helperText}>{t("settings.connectWithHint")}</Text>
            <View style={localStyles.chipWrap}>
              {([
                { value: "man", label: t("settings.connectMen") },
                { value: "woman", label: t("settings.connectWomen") },
                { value: "other", label: t("settings.connectOthers") },
              ]).map(({ value, label }) => renderChip(label, connectWith.includes(value), () =>
                setConnectWith((previous) => previous.includes(value)
                  ? previous.filter((item) => item !== value)
                  : [...previous, value])
              ))}
            </View>
          </View></View>

          <View style={group !== 2 ? { display: "none" } : undefined}><View style={localStyles.preferencePanel}>
            <Text style={localStyles.sectionTitle}>Me trae a Vibes</Text>
            <Text style={localStyles.helperText}>
              Podés elegir varias motivaciones.
            </Text>
            <View style={localStyles.chipWrap}>
              {PURPOSE_OPTIONS.map(({ id, label }) =>
                renderChip(getPurposeDisplayLabel(label), purposes.includes(label), () =>
                  setPurposes((previous) =>
                    [...previous.filter(value => !PURPOSE_OPTIONS.some(option => option.label === value)),
                      ...togglePurposeSelection(PURPOSE_OPTIONS.filter(option => previous.includes(option.label)).map(option => option.id), id)
                        .map(selectedId => PURPOSE_OPTIONS.find(option => option.id === selectedId)!.label)]
                  )
                )
              )}
            </View>
          </View></View>

          <View style={group !== 2 ? { display: "none" } : undefined}><View style={localStyles.preferencePanel}>
            <View style={localStyles.sectionHeader}>
              <Icon name="sparkles-outline" size={18} color={TEXT_SECONDARY} />
              <Text style={localStyles.sectionTitle}>Qué busco en Vibes</Text>
              <View style={localStyles.line} />
            </View>
            <View style={localStyles.chipWrap}>
              {LOOKING_FOR_OPTIONS.map((item) =>
                renderChip(item, selectedLookingFor.has(item), () =>
                  toggleLookingFor(item)
                )
              )}
            </View>
          </View></View>

          <View style={group !== 2 ? { display: "none" } : undefined}>{lookingFor.includes("Citas") && (
            <View style={localStyles.preferencePanel}>
              <Text style={localStyles.sectionTitle}>Estoy interesado en:</Text>
              <Text style={localStyles.fieldLabel}>Opcional · Visible en tu perfil</Text>
              <View style={localStyles.chipWrap}>
                {INTERESTED_IN_OPTIONS.map(item => renderChip(item, interestedIn === item,
                  () => setInterestedIn(interestedIn === item ? "" : item)))}
              </View>
            </View>
          )}</View>

          <View style={group !== 1 ? { display: "none" } : undefined}><View style={localStyles.preferencePanel}>
            <View style={localStyles.sectionHeader}>
              <Icon name="language-outline" size={18} color={TEXT_SECONDARY} />
              <Text style={localStyles.sectionTitle}>
                {t("settings.languages")}
              </Text>
              <View style={localStyles.line} />
            </View>
            <View style={localStyles.chipWrap}>
              {LANGUAGE_OPTIONS.map((item) =>
                renderChip(item, selectedLanguages.has(item), () =>
                  toggleLanguage(item)
                )
              )}
            </View>
          </View></View>

          <View style={group !== 1 ? { display: "none" } : undefined}><View style={localStyles.section}>
            <View style={localStyles.sectionHeader}>
              <Icon name="bonfire-outline" size={18} color={TEXT_SECONDARY} />
              <Text style={localStyles.sectionTitle}>
                {t("settings.smoking")}
              </Text>
              <View style={localStyles.line} />
            </View>
            <View style={localStyles.chipWrap}>
              {renderChip(t("common.yes"), smoking === "Sí", () =>
                setSmoking("Sí")
              )}
              {renderChip(t("common.no"), smoking === "No", () =>
                setSmoking("No")
              )}
              {renderChip("A veces", smoking === "A veces", () =>
                setSmoking("A veces")
              )}
            </View>
          </View></View>

          <View style={group !== 1 ? { display: "none" } : undefined}><View style={localStyles.section}>
            <View style={localStyles.sectionHeader}>
              <Icon name="moon-outline" size={18} color={TEXT_SECONDARY} />
              <Text style={localStyles.sectionTitle}>
                Intereses adicionales
              </Text>
              <View style={localStyles.line} />
            </View>
            <View style={localStyles.chipWrap}>
              {otherOptions.map((item) =>
                renderChip(item, selectedOthers.has(item), () =>
                  toggleOther(item)
                )
              )}
            </View>
            <View style={localStyles.addRow}>
              <TextInput
                style={localStyles.addInput}
                value={customTag}
                onChangeText={setCustomTag}
                placeholder={t("settings.newInterestPlaceholder")}
                placeholderTextColor={GRAY}
                onSubmitEditing={addCustomTag}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={localStyles.addButton}
                onPress={addCustomTag}
              >
                <Text style={localStyles.addButtonText}>
                  {t("settings.addInterest")}
                </Text>
              </TouchableOpacity>
            </View>
          </View></View>
        </ScrollView>

        {/* Botón fijo abajo */}
        <View style={{ padding: 16, backgroundColor: WHITE }}>
          <TouchableOpacity
            style={[localStyles.saveButton, saving && { opacity: 0.6 }]}
            disabled={saving || isPending || isError}
            onPress={() => void handleSave()}
          >
            <Text style={localStyles.saveButtonText}>
              {saving ? "Guardando…" : t("common.save")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <SpiritualPathDetailsModal
        visible={Boolean(activeSpiritualPath)}
        pathLabel={activeSpiritualPath}
        detail={
          activeSpiritualPath
            ? spiritualPathDetails[activeSpiritualPath] ?? {}
            : {}
        }
        onChange={(nextDetail) => {
          if (!activeSpiritualPath) return;
          updateSpiritualPathDetail(activeSpiritualPath, nextDetail);
        }}
        onClose={() => setActiveSpiritualPath(null)}
        onRemove={
          activeSpiritualPath
            ? () => removeSpiritualPath(activeSpiritualPath)
            : undefined
        }
      />
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  fixedHeader: {
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(43, 43, 43, 0.06)",
    zIndex: 10,
  },
  appHeader: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.background,
    marginTop: 6,
  },
  headerCopy: {
    flex: 1,
  },
  headerTextWrap: {
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontFamily: vibesTheme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.regular,
  },
  headerSpacer: {
    width: 20,
    height: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  section: {
    marginTop: 18,
  },
  preferencePanel: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${vibesTheme.colors.primaryText}20`,
    backgroundColor: `${vibesTheme.colors.primaryText}03`,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: vibesTheme.colors.background,
    marginLeft: 10,
  },
  helperText: {
    color: GRAY,
    fontSize: 14,
    marginBottom: 10,
    fontFamily: vibesTheme.fonts.primary,
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 8,
    color: TEXT_SECONDARY,
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    fontFamily: vibesTheme.fonts.semibold,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: `${vibesTheme.colors.primaryText}20`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipActive: {
    backgroundColor: vibesTheme.colors.primaryText,
    borderColor: vibesTheme.colors.primaryText,
  },
  chipText: {
    color: DARK_GRAY,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.medium,
  },
  chipTextActive: {
    color: vibesTheme.colors.surface,
    fontFamily: vibesTheme.fonts.semibold,
  },
  detailList: {
    marginTop: 12,
    gap: 10,
  },
  detailItem: {
    borderWidth: 1,
    borderColor: "rgba(216, 140, 122, 0.18)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: vibesTheme.colors.background,
  },
  detailItemTitle: {
    color: DARK_GRAY,
    fontSize: 17,
    fontFamily: vibesTheme.fonts.regular,
  },
  detailItemSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 4,
    fontFamily: vibesTheme.fonts.subtitle,
  },
  aboutInput: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${vibesTheme.colors.primaryText}20`,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: DARK_GRAY,
    minHeight: 130,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.primary,
  },
  textInput: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${vibesTheme.colors.primaryText}20`,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: DARK_GRAY,
    minHeight: 52,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.primary,
  },
  heightRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${vibesTheme.colors.primaryText}20`,
    backgroundColor: WHITE,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  heightInput: {
    flex: 1,
    color: DARK_GRAY,
    fontSize: 18,
    fontFamily: vibesTheme.fonts.medium,
    paddingVertical: 12,
  },
  heightUnit: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  currentLocationCard: {
    backgroundColor: vibesTheme.colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(216, 140, 122, 0.18)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  currentLocationLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: vibesTheme.fonts.semibold,
  },
  currentLocationValue: {
    color: DARK_GRAY,
    fontSize: 16,
    marginTop: 4,
    fontFamily: vibesTheme.fonts.medium,
  },
  currentLocationButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: `${vibesTheme.colors.primaryText}20`,
  },
  currentLocationButtonText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.semibold,
  },
  addRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${vibesTheme.colors.primaryText}20`,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: DARK_GRAY,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.primary,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: `${vibesTheme.colors.primaryText}20`,
  },
  addButtonText: {
    color: DARK_GRAY,
    fontFamily: vibesTheme.fonts.semibold,
  },
  saveButtonFixedWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: vibesTheme.colors.background,
    zIndex: 10,
  },
  saveButton: {
    backgroundColor: vibesTheme.colors.primaryText,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: vibesTheme.colors.surface,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.semibold,
  },
});

export default Settings;
