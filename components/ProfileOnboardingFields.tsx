import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "./Typography";
import Icon from "./Icon";
import SelectablePill from "./onboarding/SelectablePill";
import SpiritualPathDetailsModal from "./SpiritualPathDetailsModal";
import KeyboardSheetModal from "./KeyboardSheetModal";
import PrimaryButton from "./onboarding/PrimaryButton";
import { vibesTheme } from "../src/theme/vibesTheme";
import {
  PRACTICE_OPTIONS,
  PURPOSE_OPTIONS,
  getPurposeDisplayLabel,
  togglePurposeSelection,
} from "../src/screens/Onboarding/vibesOnboardingContent";

import { type AboutMePreferences } from "../src/lib/aboutMeProfile";
import * as ds from "../src/theme/tokens";

type Props = {
  group: number;
  value: AboutMePreferences;
  onChange: (value: AboutMePreferences) => void;
};

export default function ProfileOnboardingFields({
  group,
  value,
  onChange,
}: Props) {
  const [activePractice, setActivePractice] = useState<string | null>(null);
  const [addingPractice, setAddingPractice] = useState(false);
  const [customPractice, setCustomPractice] = useState("");
  const patch = (next: Partial<AboutMePreferences>) =>
    onChange({ ...value, ...next });
  const practiceOptions = PRACTICE_OPTIONS;

  const changePractice = (practice: string) =>
    patch({
      spiritualPath: value.spiritualPath.includes(practice)
        ? value.spiritualPath.filter((item) => item !== practice)
        : [...value.spiritualPath, practice],
    });
  return (
    <>
      {group === 0 ? (
        <>
          <View style={s.section}>
            <Text style={s.heading}>Algo muy vos</Text>
            <TextInput
              accessibilityLabel="Algo muy vos"
              style={[s.input, s.description]}
              value={value.aboutMe}
              onChangeText={(aboutMe) => patch({ aboutMe })}
              multiline
              textAlignVertical="top"
              maxLength={500}
              placeholder="Contanos un poquito de vos"
              placeholderTextColor={vibesTheme.colors.secondaryText}
            />
          </View>
        </>
      ) : null}
      {group === 1 ? (
        <View style={s.section}>
          <Text style={s.heading}>Tus comunidades</Text>
          <View style={s.chips}>
            {practiceOptions.map((practice) => (
              <SelectablePill
                key={practice}
                label={practice}
                selected={value.spiritualPath.includes(practice)}
                onPress={() => changePractice(practice)}
              />
            ))}

          </View>
          {value.spiritualPath.length ? (
            <Text style={s.hint}>Contanos más de tus comunidades</Text>
          ) : null}
          {value.spiritualPath.map((practice) => {
            const hasDetails = Object.values(
              value.spiritualPathDetails[practice] ?? {}
            ).some((detail) => Boolean(detail?.trim()));
            return (
              <TouchableOpacity
                key={practice}
                style={[s.practiceRow, hasDetails && s.practiceComplete]}
                onPress={() => setActivePractice(practice)}
                accessibilityRole="button"
                accessibilityLabel={`${practice}. ${
                  hasDetails ? "Con detalles. Editar" : "Sin detalles. Agregar"
                }`}
              >
                <View
                  style={[
                    s.dot,
                    {
                      backgroundColor: hasDetails
                        ? vibesTheme.colors.accentBlue
                        : vibesTheme.colors.accentMustard,
                    },
                  ]}
                />
                <Text style={s.practiceName}>{practice}</Text>
                <Icon
                  name={hasDetails ? "checkmark-circle" : "add"}
                  size={ds.iconSize.lg}
                  color={
                    hasDetails
                      ? vibesTheme.colors.accentBlue
                      : vibesTheme.colors.accentMustard
                  }
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      {group === 2 ? (
        <View style={s.section}>
          <Text style={s.heading}>¿Qué te trae a Vibes?</Text>
          <View style={s.chips}>
            {PURPOSE_OPTIONS.map((option) => (
              <SelectablePill
                key={option.id}
                label={getPurposeDisplayLabel(option.label)}
                selected={value.openTo.includes(option.label)}
                onPress={() => {
                  const selected = PURPOSE_OPTIONS.filter((item) =>
                    value.openTo.includes(item.label)
                  ).map((item) => item.id);
                  const legacy = value.openTo.filter(
                    (label) =>
                      !PURPOSE_OPTIONS.some((item) => item.label === label)
                  );
                  patch({
                    openTo: [
                      ...legacy,
                      ...togglePurposeSelection(selected, option.id).map(
                        (id) =>
                          PURPOSE_OPTIONS.find((item) => item.id === id)!.label
                      ),
                    ],
                  });
                }}
              />
            ))}
            {value.openTo
              .filter(
                (label) =>
                  !PURPOSE_OPTIONS.some((option) => option.label === label)
              )
              .map((label) => (
                <SelectablePill
                  key={`legacy-${label}`}
                  label={label}
                  selected
                  onPress={() =>
                    patch({
                      openTo: value.openTo.filter((item) => item !== label),
                    })
                  }
                />
              ))}
          </View>
        </View>
      ) : null}
      <SpiritualPathDetailsModal
        visible={Boolean(activePractice)}
        pathLabel={activePractice}
        detail={
          activePractice ? value.spiritualPathDetails[activePractice] ?? {} : {}
        }
        onChange={(detail) => {
          if (activePractice)
            patch({
              spiritualPathDetails: {
                ...value.spiritualPathDetails,
                [activePractice]: detail,
              },
            });
        }}
        onRemove={() => {
          if (activePractice) changePractice(activePractice);
          setActivePractice(null);
        }}
        onClose={() => setActivePractice(null)}
      />
      <KeyboardSheetModal
        visible={addingPractice}
        onClose={() => setAddingPractice(false)}
      >
        <View style={s.customCard}>
          <Text style={s.heading}>Agregar práctica</Text>
          <TextInput
            accessibilityLabel="Nombre de la práctica"
            value={customPractice}
            onChangeText={setCustomPractice}
            style={s.input}
            placeholder="Nombre de la práctica"
            placeholderTextColor={vibesTheme.colors.secondaryText}
            maxLength={80}
          />
          <PrimaryButton
            label="Agregar"
            onPress={() => {
              const name = customPractice.trim();
              if (!name) return;
              if (
                value.spiritualPath.some(
                  (practice) =>
                    practice.toLocaleLowerCase() === name.toLocaleLowerCase()
                )
              ) {
                Alert.alert("Ya agregaste esa práctica");
                return;
              }
              patch({ spiritualPath: [...value.spiritualPath, name] });
              setCustomPractice("");
              setAddingPractice(false);
            }}
          />
        </View>
      </KeyboardSheetModal>
    </>
  );
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  summary: {
    padding: ds.spacing[4],
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    borderRadius: ds.radii.lg,
    marginBottom: ds.spacing[6],
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[3],
  },
  heading: {
    ...ds.textStyles.heading,
    color: c.primaryText,
    marginBottom: ds.spacing[3],
  },
  editButton: {
    minHeight: 44,
    paddingHorizontal: ds.spacing[3],
    justifyContent: "center",
  },
  editText: {
    color: c.accentBlue,
    ...ds.textStyles.label,
  },
  photos: { gap: ds.spacing[3], paddingBottom: ds.spacing[4] },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: ds.spacing[3],
    paddingVertical: ds.spacing[1],
  },
  dataLabel: { ...ds.textStyles.bodySmall, color: c.secondaryText, flex: 1 },
  dataValue: {
    ...ds.textStyles.bodySmall,
    color: c.primaryText,
    flex: 1,
    textAlign: "right",
  },
  section: { marginBottom: ds.spacing[6] },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    ...ds.textStyles.body,
    color: c.primaryText,
    marginBottom: ds.spacing[4],
  },
  description: { minHeight: 104 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: ds.spacing[3] },
  hint: { ...ds.textStyles.bodySmall, color: c.secondaryText, marginTop: ds.spacing[4] },
  practiceRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    padding: ds.spacing[4],
    marginTop: ds.spacing[3],
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    borderRadius: ds.radii.lg,
  },
  practiceComplete: {
    borderColor: c.accentBlue,
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle),
  },
  dot: { width: 10, height: 10, borderRadius: ds.radii.pill },
  practiceName: {
    flex: 1,
    ...ds.textStyles.subtitle,
    color: c.primaryText,
  },
  customCard: { padding: ds.spacing[5], borderRadius: ds.radii.xl, backgroundColor: c.surface },
});
