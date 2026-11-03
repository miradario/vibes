import React from "react";
import { useRoute } from "@react-navigation/native";
import { Text } from "../components/Typography";
import { Page, LearningGate, Empty, ui } from "../components/learning/LearningUI";
import ClassReservationPanel from "../components/learning/ClassReservationPanel";
import { useLearningData } from "../src/learning/queries";
import { externalClasses } from "../src/learning/externalCatalog";
import { WEEKDAYS } from "../src/learning/reservations";
import { sessionsFor } from "../src/learning/utils";
export default function LearningReservationScreen() {
  const id = (useRoute().params as { id?: string } | undefined)?.id;
  const query = useLearningData();
  return <Page title="Solicitar reserva"><LearningGate query={query}>{data => {
    const activity = data.activities.find(item => item.id === id);
    if (activity) {
      if (activity.status !== "published" || activity.kind !== "class") return <Empty text="Esta clase no está disponible para solicitar una reserva." />;
      return <><Text accessibilityRole="header" style={ui.title}>{activity.title}</Text><ClassReservationPanel key={activity.id} source={{ id:activity.id, timezone:activity.timezone, sessions:sessionsFor(data,activity.id) }} /></>;
    }
    const external = externalClasses.find(item => item.id === id);
    if (!external) return <Empty text="No encontramos esta clase." />;
    return <><Text accessibilityRole="header" style={ui.title}>{external.titulo}</Text><ClassReservationPanel key={external.id} source={{ id:external.id, weekly:external.horarios_semanales.flatMap(slot => {
      const day = WEEKDAYS.indexOf(slot.dia);
      return day < 0 || !slot.hora_inicio ? [] : [{ day,time:slot.hora_inicio }];
    }) }} /></>;
  }}</LearningGate></Page>;
}
