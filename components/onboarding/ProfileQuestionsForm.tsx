import React from "react";
import { StyleSheet, View, TextInput as NativeTextInput } from "react-native";
import { Text, TextInput } from "../Typography";
import SelectablePill from "./SelectablePill";
import {
  QUESTION_GROUPS,
  type ProfileAnswers,
} from "../../src/lib/profileQuestions";
import { vibesTheme } from "../../src/theme/vibesTheme";
import * as ds from "../../src/theme/tokens";

type Props = {
  onInputFocus?: (input: NativeTextInput | null) => void;
  group: number;
  showHeader?: boolean;
  hiddenFields?: string[];
  favoritePlansInPlans?: boolean;
  value: ProfileAnswers;
  onChange: (value: ProfileAnswers) => void;
};
export function ProfileQuestionsHeader({ group }: { group: number }) {
  return (
    <>
      <Text style={styles.title}>{QUESTION_GROUPS[group].title}</Text>
      <Text style={styles.hint}>
        Todo es opcional. Completá solo lo que quieras compartir.
      </Text>
    </>
  );
}

export default function ProfileQuestionsForm({
  group,
  onInputFocus,
  value,
  onChange,
  showHeader = true,
  hiddenFields = [],
  favoritePlansInPlans = false,
}: Props) {
  const fields = favoritePlansInPlans && group === 1
    ? QUESTION_GROUPS[group].fields.filter(field => field.key !== "favoritePlans")
    : favoritePlansInPlans && group === 2
      ? [...QUESTION_GROUPS[1].fields.filter(field => field.key === "favoritePlans"), ...QUESTION_GROUPS[group].fields]
      : QUESTION_GROUPS[group].fields;
  const inputs = React.useRef<Record<string, NativeTextInput | null>>({});
  return (
    <View>
      {showHeader && <ProfileQuestionsHeader group={group} />}
      {fields.filter(field => !hiddenFields.includes(field.key)).filter(field => field.key !== "interestedIn" ||
        (Array.isArray(value.lookingFor) && value.lookingFor.includes("Citas"))).map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          {"options" in field ? (
            <View style={[styles.options, field.key === "personality" && styles.personalityOptions]}>
              {field.options.map((option) => {
                const current = value[field.key];
                const single = "single" in field && field.single;
                const selected = single
                  ? current === option
                  : Array.isArray(current) && current.includes(option);
                return (
                  <SelectablePill
                    key={option}
                    compact={field.key === "personality"}
                    style={field.key === "personality" && option === "Medio" ? {flex:0.65} : undefined}
                    label={option}
                    selected={selected}
                    onPress={() => {
                      const values = Array.isArray(current) ? current : [];
                      onChange({
                        ...value,
                        [field.key]: single
                          ? selected
                            ? ""
                            : option
                          : selected
                          ? values.filter((v) => v !== option)
                          : [...values, option],
                      });
                    }}
                  />
                );
              })}
            </View>
          ) : (
            <TextInput
              ref={(input) => { inputs.current[field.key] = input; }}
              onFocus={() => onInputFocus?.(inputs.current[field.key])}
              style={styles.input}
              value={String(value[field.key] ?? "")}
              onChangeText={(text) => onChange({ ...value, [field.key]: text })}
              placeholder={field.placeholder}
              placeholderTextColor={vibesTheme.colors.secondaryText}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
          )}
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  title: {
    ...ds.textStyles.display,
    color: vibesTheme.colors.primaryText,
    marginVertical: ds.spacing[4],
  },
  hint: { ...ds.textStyles.body, color: vibesTheme.colors.secondaryText, marginBottom: ds.spacing[4] },
  field: { marginBottom: ds.spacing[8] },
  label: { ...ds.textStyles.heading, color: vibesTheme.colors.primaryText, marginBottom: ds.spacing[3] },
  personalityOptions: {flexWrap:"nowrap",gap:ds.spacing[2]},
  options: { flexDirection: "row", flexWrap: "wrap", gap: ds.spacing[3] },
  input: {
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
    borderRadius: ds.radii.lg,
    padding: ds.spacing[4],
    minHeight: 90,
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.body,
  },
});
