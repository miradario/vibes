/** @format */

import React, { memo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Typography";
import Icon from "./Icon";
import VibesActionButton from "./VibesActionButton";
import * as ds from "../src/theme/tokens";
import { cardStyles } from "./ui/surfaceStyles";
import {
  formatMetricGoal,
  formatMetricValue,
  getMetricProgress,
  type HealthMetricType,
} from "../src/lib/healthChallenge";
import { healthSourceName, type HealthAvailability } from "../src/health/healthMetrics";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Icono por métrica (Ionicons outline, DS §Layout e iconografía). */
export const HEALTH_METRIC_ICONS: Record<HealthMetricType, IconName> = {
  steps: "walk-outline",
  mindful_minutes: "flower-outline",
  sleep_minutes: "moon-outline",
  exercise_minutes: "body-outline",
  distance_meters: "footsteps-outline",
};

/** Nombre de la métrica para el label accesible de la barra de progreso. */
const ACCESSIBLE_NAME: Record<HealthMetricType, string> = {
  steps: "Pasos de hoy",
  mindful_minutes: "Meditación de hoy",
  sleep_minutes: "Sueño de anoche",
  exercise_minutes: "Movimiento de hoy",
  distance_meters: "Distancia de hoy",
};

type Props = {
  metric: HealthMetricType;
  dailyGoal: number;
  /** Valor de hoy en la unidad de la métrica (pasos, minutos o metros). */
  value: number | null;
  /** Solo mindfulness: minutos registrados hoy en Vibes (ya incluidos en value). */
  vibesMinutes?: number;
  availability: HealthAvailability | null;
  connected: boolean;
  connecting: boolean;
  checkedInToday: boolean;
  onConnect: () => void;
};

const pendingCopy = (metric: HealthMetricType, remaining: number, goalLabel: string) => {
  switch (metric) {
    case "sleep_minutes":
      return `Contamos lo que dormiste desde las 18 h de ayer. Cuando llegues a ${goalLabel}, el día se marca solo.`;
    case "distance_meters":
      return `Te falta ${formatMetricValue(metric, remaining)}. Cuando llegues a la meta, el día se marca solo.`;
    default:
      return `Te faltan ${formatMetricValue(metric, remaining)}. Cuando llegues a la meta, el día se marca solo.`;
  }
};

const HealthChallengeCard = ({
  metric,
  dailyGoal,
  value,
  vibesMinutes = 0,
  availability,
  connected,
  connecting,
  checkedInToday,
  onConnect,
}: Props) => {
  const progress = getMetricProgress(metric, value, dailyGoal);
  const goalLabel = formatMetricGoal(metric, dailyGoal);
  const isMindful = metric === "mindful_minutes";
  // Mindfulness también suma las meditaciones registradas en Vibes, así que
  // el progreso se muestra aunque Salud no esté conectada o no esté disponible.
  const showProgress = availability !== null && (connected || isMindful);
  const vibesNote = isMindful ? " Tus meditaciones registradas en Vibes también suman." : "";

  let body: string;
  let action: string | null = null;
  if (availability === null) {
    body = "Revisando tu progreso…";
  } else if (checkedInToday) {
    body = progress.reached ? "¡Llegaste a la meta! El día ya quedó marcado." : "El día de hoy ya está marcado.";
  } else if (availability === "unsupported") {
    body = isMindful
      ? "Este dispositivo no comparte minutos de mindfulness. Registrá tu meditación en Vibes y el día se marca solo al llegar a la meta, o marcalo a mano."
      : "Este dispositivo no tiene datos de Salud. Podés marcar el día a mano, como siempre.";
  } else if (availability === "not_installed" || availability === "update_required") {
    body = `Para que el día se marque solo al llegar a ${goalLabel}, ${availability === "not_installed" ? "instalá" : "actualizá"} Health Connect.${vibesNote} Mientras tanto, podés marcarlo a mano.`;
    action = availability === "not_installed" ? "Instalar Health Connect" : "Actualizar Health Connect";
  } else if (!connected) {
    body = `Conectá ${healthSourceName} y el día se marca solo cuando llegues a ${goalLabel}.${vibesNote} También podés marcarlo a mano.`;
    action = `Conectar ${healthSourceName}`;
  } else {
    body = pendingCopy(metric, progress.remaining, goalLabel) + (isMindful ? vibesNote : "");
  }
  if (isMindful && vibesMinutes > 0 && !checkedInToday && availability !== null) {
    body = `Hoy registraste ${formatMetricValue(metric, vibesMinutes)} en Vibes. ${body}`;
  }

  return (
    <View style={styles.card} accessible={false}>
      <View style={styles.header}>
        <Icon name={HEALTH_METRIC_ICONS[metric]} size={ds.iconSize.lg} color={ds.colors.base.blue} />
        <Text style={styles.title}>Meta diaria: {goalLabel}</Text>
      </View>
      {showProgress ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${ACCESSIBLE_NAME[metric]}: ${progress.label}`}
          accessibilityValue={{ min: 0, max: progress.goal, now: Math.min(progress.value, progress.goal) }}
          style={styles.progressBlock}
        >
          <Text style={styles.progressLabel}>{progress.label}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress.ratio * 100)}%` }]} />
          </View>
        </View>
      ) : null}
      <Text style={styles.body}>{body}</Text>
      {action ? (
        connecting ? (
          <ActivityIndicator color={ds.colors.base.blue} style={styles.loader} />
        ) : (
          <VibesActionButton label={action} variant="outline" onPress={onConnect} style={styles.button} />
        )
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { ...cardStyles.base, ...cardStyles.padding, gap: ds.spacing[3] },
  header: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3] },
  title: { flex: 1, color: ds.colors.text.primary, ...ds.textStyles.subtitle },
  progressBlock: { gap: ds.spacing[2] },
  progressLabel: { color: ds.colors.text.primary, ...ds.textStyles.title },
  track: {
    height: ds.spacing[2],
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.soft),
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: ds.radii.pill, backgroundColor: ds.colors.base.blue },
  body: { color: ds.colors.text.secondary, ...ds.textStyles.bodySmall },
  button: { alignSelf: "stretch" },
  loader: { paddingVertical: ds.spacing[4] },
});

export default memo(HealthChallengeCard);
