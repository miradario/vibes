/**
 * Diseño-only: calendario de clases del alumno referido.
 * Reutiliza EventCalendar (vista calendario de Eventos). Solo __DEV__.
 */
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import BackButton from "../components/BackButton";
import { Text } from "../components/Typography";
import { EventCalendar } from "../components/EventExplorerSheet";
import {
  studentClassesAsCalendarFeed,
} from "../src/learning/studentClassesHomeMock";
import * as ds from "../src/theme/tokens";

export default function StudentClassesCalendarMock() {
  const navigation = useNavigation();
  const events = useMemo(() => studentClassesAsCalendarFeed(), []);
  const joinedEventIds = useMemo(
    () => new Set(events.map((event) => event.id)),
    [events]
  );

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} style={styles.screen}>
      <View style={styles.navigationHeader}>
        <BackButton
          accessibilityLabel="Volver a clases"
          onPress={() => navigation.goBack()}
        />
        <Text
          style={styles.navigationTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityRole="header"
        >
          Calendario
        </Text>
        <View
          style={styles.headerSpacer}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
      <EventCalendar
        events={events}
        joinedEventIds={joinedEventIds}
        onOpen={() => {}}
        title="Mis clases"
        emptyDayMessage="No hay clases para este día."
        joinedLegend="Clase a la que estás anotado"
        dayHasItemsA11y="con clases"
        dayJoinedA11y="con clases a las que estás anotado"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ds.colors.bg.surface,
    paddingHorizontal: ds.spacing[4],
  },
  navigationHeader: {
    minHeight: ds.touchTarget + ds.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
    paddingVertical: ds.spacing[2],
  },
  navigationTitle: {
    flex: 1,
    textAlign: "center",
    ...ds.textStyles.heading,
    color: ds.colors.text.primary,
  },
  headerSpacer: { width: ds.touchTarget },
});
