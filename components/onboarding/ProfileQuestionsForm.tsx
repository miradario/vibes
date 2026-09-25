import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, TextInput } from "../Typography";
import SelectablePill from "./SelectablePill";
import {
  QUESTION_GROUPS,
  type ProfileAnswers,
} from "../../src/lib/profileQuestions";
import { vibesTheme } from "../../src/theme/vibesTheme";

type Props = {
  group: number;
  showHeader?: boolean;
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
  value,
  onChange,
  showHeader = true,
}: Props) {
  return (
    <View>
      {showHeader && <ProfileQuestionsHeader group={group} />}
      {QUESTION_GROUPS[group].fields.map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          {"options" in field ? (
            <View style={styles.options}>
              {field.options.map((option) => {
                const current = value[field.key];
                const single = "single" in field && field.single;
                const selected = single
                  ? current === option
                  : Array.isArray(current) && current.includes(option);
                return (
                  <SelectablePill
                    key={option}
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
    fontFamily: vibesTheme.fonts.thin,
    fontSize: 32,
    lineHeight: 40,
    color: vibesTheme.colors.primaryText,
    marginVertical: 16,
  },
  hint: { fontSize: 16, lineHeight: 23, color: vibesTheme.colors.secondaryText, marginBottom: 16 },
  field: { marginBottom: 22 },
  label: { fontSize: 17, color: vibesTheme.colors.primaryText, marginBottom: 12 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
    borderRadius: 18,
    padding: 16,
    minHeight: 90,
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
  },
});
