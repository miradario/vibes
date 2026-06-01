import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import styles, { DARK_GRAY, GRAY, PRIMARY_COLOR, WHITE } from "../assets/styles";
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
  const [yearsError, setYearsError] = useState<string | null>(null);
  const filledEntries = getSpiritualPathDetailEntries(detail);

  const getNextFieldValue = (key: keyof SpiritualPathDetail, text: string) => {
    if (key === "years") {
      return text.replace(/[^0-9]/g, "");
    }

    return text;
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={localStyles.overlay}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={localStyles.keyboardWrap}
        >
          <View style={localStyles.card}>
            <Text style={localStyles.title} maxFontSizeMultiplier={1}>
              {pathLabel
                ? translateSpiritualPathLabel(locale, pathLabel)
                : t("spiritual.defaultTitle")}
            </Text>
            <Text style={localStyles.subtitle}>
              {readOnly
                ? t("spiritual.sharedData")
                : t("spiritual.optionalData")}
            </Text>

            <ScrollView
              style={localStyles.content}
              contentContainerStyle={localStyles.contentInner}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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
                            <TouchableOpacity
                              key={`${field.key}-${option}`}
                              style={[
                                localStyles.optionChip,
                                active && localStyles.optionChipActive,
                              ]}
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
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <TextInput
                        style={[
                          styles.loginInput,
                          localStyles.input,
                          field.multiline && localStyles.notesInput,
                        ]}
                        placeholder={translateSpiritualPlaceholder(locale, field.placeholder)}
                        placeholderTextColor={GRAY}
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
                      <Text style={localStyles.errorText}>{yearsError}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>

            <View style={localStyles.footer}>
              {!readOnly && onRemove ? (
                <TouchableOpacity
                  style={localStyles.removeButton}
                  onPress={onRemove}
                  activeOpacity={0.85}
                >
                  <Text style={localStyles.removeButtonText}>{t("spiritual.removePath")}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={localStyles.primaryButton}
                onPress={closeWithValidation}
                activeOpacity={0.9}
              >
                <Text style={localStyles.primaryButtonText}>
                  {readOnly ? t("common.close") : t("common.done")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17, 17, 17, 0.34)",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  keyboardWrap: {
    width: "100%",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxHeight: "84%",
    borderRadius: 28,
    backgroundColor: WHITE,
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 22,
    shadowColor: "#8C7B63",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  title: {
    color: DARK_GRAY,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: vibesTheme.fonts.primary,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: "rgba(43, 43, 43, 0.58)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    fontFamily: vibesTheme.fonts.primary,
  },
  content: {
    marginTop: 24,
    flexGrow: 0,
  },
  contentInner: {
    paddingBottom: 12,
  },
  fieldWrap: {
    marginBottom: 22,
  },
  fieldLabel: {
    color: DARK_GRAY,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
    letterSpacing: 0.2,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  optionChip: {
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.44)",
    backgroundColor: "rgba(255, 253, 248, 0.86)",
    paddingHorizontal: 20,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  optionChipActive: {
    backgroundColor: "rgba(228, 183, 110, 0.16)",
    borderColor: "#E4B76E",
  },
  optionChipText: {
    color: DARK_GRAY,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
  },
  optionChipTextActive: {
    color: DARK_GRAY,
  },
  input: {
    marginTop: 10,
    minHeight: 54,
    borderRadius: 18,
    borderColor: "rgba(228, 183, 110, 0.36)",
    backgroundColor: "rgba(255, 253, 248, 0.92)",
    fontSize: 17,
    fontFamily: vibesTheme.fonts.primary,
  },
  notesInput: {
    minHeight: 118,
    paddingTop: 16,
  },
  errorText: {
    color: "#B45A4D",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 7,
    fontFamily: vibesTheme.fonts.medium,
  },
  readOnlyItem: {
    borderWidth: 1,
    borderColor: "rgba(168, 131, 102, 0.18)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: "#FBF8F4",
  },
  readOnlyLabel: {
    color: PRIMARY_COLOR,
    fontSize: 13,
    fontWeight: "500",
  },
  readOnlyValue: {
    color: DARK_GRAY,
    fontSize: 16,
    marginTop: 4,
  },
  emptyState: {
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 16,
    backgroundColor: "#FBF8F4",
  },
  emptyStateText: {
    color: GRAY,
    fontSize: 15,
  },
  footer: {
    flexDirection: "row",
    gap: 14,
    marginTop: 18,
    paddingTop: 0,
  },
  removeButton: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(216, 140, 122, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
  },
  removeButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
  },
  primaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY_COLOR,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  primaryButtonText: {
    color: WHITE,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
  },
});

export default SpiritualPathDetailsModal;
