import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Icon from "./Icon";
import {
  hasMissingProfileAnswers,
  readProfileAnswers,
} from "../src/lib/profileQuestions";
import { getProfileCompletion } from "../src/lib/profileCompletion";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
export default function CompleteProfilePrompt({ userId }: { userId?: string }) {
  const navigation = useNavigation();
  const [dismissed, setDismissed] = useState(false);
  const { data: profile } = useProfileQuery(userId);
  const { data: preferences } = useUserPreferencesQuery(userId);
  const { data, isSuccess } = useQuery({
    queryKey: ["profileAnswers", userId],
    queryFn: () => readProfileAnswers(userId!),
    enabled: !!userId,
  });
  if (dismissed || !isSuccess || !hasMissingProfileAnswers(data)) return null;
  const completion = getProfileCompletion(profile, preferences);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => navigation.navigate(completion.nextScreen as never)}
      style={styles.card}
      activeOpacity={0.84}
    >
      <View style={styles.iconWrap}>
        <Icon
          name="person-outline"
          size={25}
          color={vibesTheme.colors.accentMustard}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Completá tu perfil</Text>
        <View style={styles.progressRow}>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: completion.percent }}
            style={styles.track}
          >
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(
                    0,
                    Math.min(completion.percent, 100)
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.percent}>{completion.percent}%</Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Cerrar sugerencia"
        onPress={(event) => {
          event.stopPropagation();
          setDismissed(true);
        }}
        style={styles.closeButton}
      >
        <Icon name="close" size={17} color="#6E6E6E" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 12,
    paddingRight: 34,
    paddingVertical: 10,
    backgroundColor: "#FCF8F0",
    borderColor: "#EDE2CF",
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 16,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F3EADF",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    color: "#2B2B2B",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  closeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 7,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E8DFCC",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  percent: {
    color: "#5F574C",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.medium,
  },
});
