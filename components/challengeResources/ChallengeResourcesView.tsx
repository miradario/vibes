import VibesLoader from "../VibesLoader";
import React, { useEffect, useState } from "react";
import { AppState, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { Text } from "../Typography";
import { useChallengeResources } from "../../src/queries/challengeResources.queries";
import DayAttachmentView from "../challengeDays/DayAttachmentView";
import { DayButton } from "../challengeDays/DayButton";
import { dayStyles as day } from "../challengeDays/styles";
import * as ds from "../../src/theme/tokens";

export default function ChallengeResourcesView({
  challengeId,
  visible,
  headingStyle,
  sectionStyle,
}: {
  challengeId: string;
  visible: boolean;
  headingStyle?: StyleProp<TextStyle>;
  sectionStyle?: StyleProp<ViewStyle>;
}) {
  const resources = useChallengeResources(challengeId, visible);
  const [active, setActive] = useState(AppState.currentState === "active");
  const focused = useIsFocused();
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) =>
      setActive(state === "active")
    );
    return () => sub.remove();
  }, []);
  const attachments = resources.data?.attachments ?? [];
  if (!visible) return null;
  if (resources.isLoading && attachments.length === 0) return null;
  if (resources.isLoading) {
    return (
      <View style={sectionStyle}>
        <Text style={headingStyle ?? day.title}>Recursos</Text>
        <VibesLoader />
      </View>
    );
  }
  if (resources.isError) {
    return (
      <View style={sectionStyle}>
        <Text style={headingStyle ?? day.title}>Recursos</Text>
        <Text style={day.error}>No se pudieron cargar los recursos.</Text>
        <DayButton
          label="Reintentar"
          onPress={() => void resources.refetch()}
        />
      </View>
    );
  }
  if (attachments.length === 0) return null;
  return (
    <View style={sectionStyle}>
      <Text style={headingStyle ?? day.title}>Recursos</Text>
      <View style={{ gap: ds.spacing[3] }}>
        {focused && active
          ? attachments.map((item) => (
              <DayAttachmentView key={item.id} item={item} />
            ))
          : null}
      </View>
    </View>
  );
}
