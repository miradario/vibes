import PrimaryButton from "./onboarding/PrimaryButton";
import VibesActionButton from "./VibesActionButton";
import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "./Typography";
import KeyboardSheetModal from "./KeyboardSheetModal";
import Icon from "./Icon";

import { vibesTheme } from "../src/theme/vibesTheme";
import type { SpiritualPathDetail } from "../src/lib/spiritualPaths";
import {
  getSpiritualPathDetailEntries,
  SPIRITUAL_PATH_DETAIL_FIELDS,
} from "../src/lib/spiritualPaths";
import { useI18n } from "../src/i18n";
import {
  translateSpiritualFieldLabel,
  translateSpiritualOption,
  translateSpiritualPathLabel,
  translateSpiritualPlaceholder,
} from "../src/i18n/translations";
import { chipHitSlop, chipStyles } from "./ui/chipStyles";
import * as ds from "../src/theme/tokens";

type SpiritualPathDetailsModalProps = {
  visible: boolean;
  pathLabel: string | null;
  detail: SpiritualPathDetail;
  onClose: () => void;
  onChange?: (next: SpiritualPathDetail) => void;
  onRemove?: () => void;
  readOnly?: boolean;
};

const SpiritualPathDetailsModal = ({
  visible,
  pathLabel,
  detail,
  onClose,
  onChange,
  onRemove,
  readOnly = false,
}: SpiritualPathDetailsModalProps) => {
  const { locale, t } = useI18n();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [yearsError, setYearsError] = useState<string | null>(null);
  const filledEntries = getSpiritualPathDetailEntries(detail);

  const getNextFieldValue = (key: keyof SpiritualPathDetail, text: string) => {
    if (key === "years") {
      return text.replace(/[^0-9]/g, "");
    }

    return text;
  };

  const closeKeepingDetails = () => {
    setYearsError(null);
    onClose();
  };

  const closeWithValidation = () => {
    if (!readOnly) {
      const rawYears = detail.years?.trim();
      if (rawYears) {
        const years = Number(rawYears);
        if (!Number.isInteger(years) || years < 1 || years > 50) {
          setYearsError("Ingresá un valor entre 1 y 50.");
          return;
        }
      }
    }

    setYearsError(null);
    onClose();
  };

  return (
    <KeyboardSheetModal visible={visible} onClose={closeKeepingDetails}>
      <View style={localStyles.card}>
        <View style={localStyles.header}>
          <Text style={localStyles.title} accessibilityRole="header">
            {pathLabel
              ? translateSpiritualPathLabel(locale, pathLabel)
              : t("spiritual.defaultTitle")}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            onPress={closeKeepingDetails}
            activeOpacity={0.8}
            style={localStyles.closeButton}
          >
            <Icon
              name="close-outline"
              size={ds.iconSize.lg}
              color={vibesTheme.colors.primaryText}
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={localStyles.content}
          contentContainerStyle={localStyles.contentInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={false}
        >
          <Text style={localStyles.subtitle}>
            {readOnly ? t("spiritual.sharedData") : locale.startsWith("en") ? "Tell us more about your experience" : "Contanos más de tu experiencia"}
          </Text>

          {readOnly ? (
            filledEntries.length > 0 ? (
              filledEntries.map((entry) => (
                <View key={entry.key} style={localStyles.readOnlyItem}>
                  <Text style={localStyles.readOnlyLabel}>
                    {translateSpiritualFieldLabel(locale, entry.label)}
                  </Text>
                  <Text style={localStyles.readOnlyValue}>{entry.value}</Text>
                </View>
              ))
            ) : (
              <View style={localStyles.emptyState}>
                <Text style={localStyles.emptyStateText}>
                  {t("spiritual.noExtraData")}
                </Text>
              </View>
            )
          ) : (
            SPIRITUAL_PATH_DETAIL_FIELDS.map((field) => (
              <View key={field.key} style={localStyles.fieldWrap}>
                <Text style={localStyles.fieldLabel}>
                  {translateSpiritualFieldLabel(locale, field.label)}
                </Text>
                {field.options ? (
                  <View style={localStyles.optionRow}>
                    {field.options.map((option) => {
                      const active = detail[field.key] === option;
                      return (
                        <TouchableOpacity hitSlop={chipHitSlop}
                          key={`${field.key}-${option}`}
                          style={[
                            localStyles.optionChip,
                            active && localStyles.optionChipActive,
                          ]}
                          accessibilityRole="radio"
                          accessibilityLabel={translateSpiritualOption(
                            locale,
                            option
                          )}
                          accessibilityState={{ selected: active }}
                          onPress={() =>
                            onChange?.({
                              ...detail,
                              [field.key]: option,
                            })
                          }
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              localStyles.optionChipText,
                              active && localStyles.optionChipTextActive,
                            ]}
                          >
                            {translateSpiritualOption(locale, option)}
                          </Text>
                          <Icon
                            name={
                              active ? "checkmark-circle" : "ellipse-outline"
                            }
                            size={ds.iconSize.md}
                            color={
                              active
                                ? vibesTheme.colors.accentBlue
                                : vibesTheme.colors.secondaryText
                            }
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <TextInput
                    style={[
                      localStyles.input,
                      field.multiline && localStyles.notesInput,
                      focusedField === field.key && localStyles.inputFocused,
                      field.key === "years" && yearsError
                        ? localStyles.inputError
                        : null,
                    ]}
                    placeholder={translateSpiritualPlaceholder(
                      locale,
                      field.placeholder
                    )}
                    accessibilityLabel={translateSpiritualFieldLabel(
                      locale,
                      field.label
                    )}
                    onFocus={() => setFocusedField(field.key)}
                    onBlur={() => setFocusedField(null)}
                    maxLength={field.key === "years" ? 2 : 500}
                    placeholderTextColor={vibesTheme.colors.secondaryText}
                    keyboardType={field.keyboardType ?? "default"}
                    multiline={Boolean(field.multiline)}
                    numberOfLines={field.multiline ? 4 : 1}
                    textAlignVertical={field.multiline ? "top" : "center"}
                    value={detail[field.key] ?? ""}
                    onChangeText={(text) => {
                      if (field.key === "years") {
                        setYearsError(null);
                      }
                      onChange?.({
                        ...detail,
                        [field.key]: getNextFieldValue(field.key, text),
                      });
                    }}
                  />
                )}
                {field.key === "years" && yearsError ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={localStyles.errorText}
                  >
                    {yearsError}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
        <View style={localStyles.footer}>
          {!readOnly && onRemove ? (
            <View style={localStyles.footerAction}>
              <VibesActionButton
                variant="outline"
                label={t("spiritual.removePath")}
                onPress={onRemove}
                style={{ minHeight: 56 }}
              />
            </View>
          ) : null}

          <View style={localStyles.footerAction}>
            <PrimaryButton
              label={readOnly ? t("common.close") : t("common.done")}
              onPress={closeWithValidation}
            />
          </View>
        </View>
      </View>
    </KeyboardSheetModal>
  );
};

const c = vibesTheme.colors;
const localStyles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    maxHeight: "100%",
    borderRadius: vibesTheme.radii.xl,
    backgroundColor: c.surface,
    padding: ds.spacing[5],
  },
  header: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3] },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: ds.radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle),
  },
  title: {
    flex: 1,
    color: c.primaryText,
    ...ds.textStyles.title,
  },
  subtitle: {
    color: c.secondaryText,
    ...ds.textStyles.bodySmall,
    marginBottom: ds.spacing[5],
  },
  content: { marginTop: ds.spacing[4], flexGrow: 0, flexShrink: 1 },
  contentInner: { paddingBottom: ds.spacing[1] },
  fieldWrap: { marginBottom: ds.spacing[5] },
  fieldLabel: {
    color: c.primaryText,
    ...ds.textStyles.label,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: ds.spacing[3], marginTop: ds.spacing[2] },
  optionChip: { ...chipStyles.base },
  optionChipActive: { ...chipStyles.selected },
  optionChipText: { ...chipStyles.label },
  optionChipTextActive: { color: c.primaryText },
  input: {
    marginTop: ds.spacing[2],
    minHeight: 48,
    borderWidth: 1,
    borderRadius: vibesTheme.radii.lg,
    borderColor: ds.colors.border.default,
    backgroundColor: c.surface,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    color: c.primaryText,
    ...ds.textStyles.body,
    includeFontPadding: true,
  },
  inputFocused: { borderColor: c.accentBlue },
  inputError: { borderColor: c.accentCoral },
  notesInput: { minHeight: 104 },
  errorText: {
    color: c.primaryText,
    ...ds.textStyles.labelMedium,
    marginTop: ds.spacing[2],
  },
  readOnlyItem: {
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    borderRadius: vibesTheme.radii.lg,
    padding: ds.spacing[4],
    marginBottom: ds.spacing[3],
    backgroundColor: c.surface,
  },
  readOnlyLabel: {
    color: c.secondaryText,
    ...ds.textStyles.label,
  },
  readOnlyValue: {
    color: c.primaryText,
    ...ds.textStyles.body,
    marginTop: ds.spacing[1],
  },
  emptyState: {
    borderRadius: vibesTheme.radii.lg,
    padding: ds.spacing[4],
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle),
  },
  emptyStateText: { color: c.secondaryText, ...ds.textStyles.bodySmall },
  footer: {
    flexDirection: "row",
    gap: ds.spacing[3],
    marginTop: ds.spacing[3],
    paddingTop: ds.spacing[4],
    borderTopWidth: 1,
    borderTopColor: ds.colors.bg.subtle,
  },
  footerAction: { flex: 1 },
});

export default SpiritualPathDetailsModal;
