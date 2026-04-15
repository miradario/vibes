import React from "react";
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
import type { SpiritualPathDetail } from "../src/lib/spiritualPaths";
import {
  getSpiritualPathDetailEntries,
  SPIRITUAL_PATH_DETAIL_FIELDS,
} from "../src/lib/spiritualPaths";

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
  const filledEntries = getSpiritualPathDetailEntries(detail);

  const getNextFieldValue = (key: keyof SpiritualPathDetail, text: string) => {
    if (key === "years") {
      return text.replace(/[^0-9]/g, "");
    }

    return text;
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
            <Text style={localStyles.title}>{pathLabel ?? "Camino espiritual"}</Text>
            <Text style={localStyles.subtitle}>
              {readOnly
                ? "Datos compartidos para este camino."
                : "Completá sólo lo que quieras sumar. Todo es opcional."}
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
                      <Text style={localStyles.readOnlyLabel}>{entry.label}</Text>
                      <Text style={localStyles.readOnlyValue}>{entry.value}</Text>
                    </View>
                  ))
                ) : (
                  <View style={localStyles.emptyState}>
                    <Text style={localStyles.emptyStateText}>
                      No agregó datos adicionales para este camino.
                    </Text>
                  </View>
                )
              ) : (
                SPIRITUAL_PATH_DETAIL_FIELDS.map((field) => (
                  <View key={field.key} style={localStyles.fieldWrap}>
                    <Text style={localStyles.fieldLabel}>{field.label}</Text>
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
                                {option}
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
                        placeholder={field.placeholder}
                        placeholderTextColor={GRAY}
                        keyboardType={field.keyboardType ?? "default"}
                        multiline={Boolean(field.multiline)}
                        numberOfLines={field.multiline ? 4 : 1}
                        textAlignVertical={field.multiline ? "top" : "center"}
                        value={detail[field.key] ?? ""}
                        onChangeText={(text) =>
                          onChange?.({
                            ...detail,
                            [field.key]: getNextFieldValue(field.key, text),
                          })
                        }
                      />
                    )}
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
                  <Text style={localStyles.removeButtonText}>Quitar camino</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={localStyles.primaryButton}
                onPress={onClose}
                activeOpacity={0.9}
              >
                <Text style={localStyles.primaryButtonText}>
                  {readOnly ? "Cerrar" : "Listo"}
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
    backgroundColor: "rgba(17, 17, 17, 0.4)",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  keyboardWrap: {
    width: "100%",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxHeight: "84%",
    borderRadius: 24,
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  title: {
    color: DARK_GRAY,
    fontSize: 28,
    lineHeight: 30,
    fontFamily: "CormorantGaramond_700Bold",
  },
  subtitle: {
    color: GRAY,
    fontSize: 15,
    marginTop: 6,
  },
  content: {
    marginTop: 16,
    flexGrow: 0,
  },
  contentInner: {
    paddingBottom: 6,
  },
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: DARK_GRAY,
    fontSize: 16,
    fontWeight: "700",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  optionChip: {
    minHeight: 42,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E4B76E",
    backgroundColor: "#F6F6F4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  optionChipText: {
    color: DARK_GRAY,
    fontSize: 15,
    fontWeight: "600",
  },
  optionChipTextActive: {
    color: DARK_GRAY,
  },
  input: {
    marginTop: 6,
  },
  notesInput: {
    minHeight: 108,
    paddingTop: 12,
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
    fontWeight: "700",
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
    gap: 10,
    marginTop: 12,
    paddingTop: 4,
  },
  removeButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(216, 140, 122, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "700",
  },
});

export default SpiritualPathDetailsModal;