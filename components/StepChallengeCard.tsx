/** @format */

import React, { memo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import VibesActionButton from "./VibesActionButton";
import { vibesTheme } from "../src/theme/vibesTheme";
import { formatStepCount, getStepProgress } from "../src/lib/stepChallenge";
import { healthSourceName, type HealthAvailability } from "../src/health/healthSteps";

type Props = {
  dailyGoal: number;
  steps: number | null;
  availability: HealthAvailability | null;
  connected: boolean;
  connecting: boolean;
  checkedInToday: boolean;
  onConnect: () => void;
};

const StepChallengeCard = ({
  dailyGoal,
  steps,
  availability,
  connected,
  connecting,
  checkedInToday,
  onConnect,
}: Props) => {
  const progress = getStepProgress(steps, dailyGoal);
  const goalLabel = `${formatStepCount(dailyGoal)} pasos`;

  let body: string;
  let action: string | null = null;
  if (availability === null) {
    body = "Revisando tus pasos…";
  } else if (availability === "unsupported") {
    body = "Este dispositivo no tiene datos de Salud. Podés marcar el día a mano, como siempre.";
  } else if (availability === "not_installed" || availability === "update_required") {
    body = `Para que el día se marque solo al llegar a ${goalLabel}, ${availability === "not_installed" ? "instalá" : "actualizá"} Health Connect. Mientras tanto, podés marcarlo a mano.`;
    action = availability === "not_installed" ? "Instalar Health Connect" : "Actualizar Health Connect";
  } else if (!connected) {
    body = `Conectá ${healthSourceName} y el día se marca solo cuando llegues a ${goalLabel}. También podés marcarlo a mano.`;
    action = `Conectar ${healthSourceName}`;
  } else if (checkedInToday) {
    body = progress.reached
      ? "¡Llegaste a la meta! El día ya quedó marcado."
      : "El día de hoy ya está marcado.";
  } else {
    body = `Te faltan ${formatStepCount(progress.goal - progress.steps)} pasos. Cuando llegues a la meta, el día se marca solo.`;
  }

  return (
    <View style={styles.card} accessible={false}>
      <View style={styles.header}>
        <Icon name="walk-outline" size={24} color={vibesTheme.colors.accentBlue} />
        <Text style={styles.title}>Meta diaria: {goalLabel}</Text>
      </View>
      {connected ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Pasos de hoy: ${progress.label}`}
          accessibilityValue={{ min: 0, max: progress.goal, now: Math.min(progress.steps, progress.goal) }}
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
          <ActivityIndicator color={vibesTheme.colors.accentBlue} style={styles.loader} />
        ) : (
          <VibesActionButton label={action} variant="outline" onPress={onConnect} style={styles.button} />
        )
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "rgba(254, 254, 253, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
    shadowColor: vibesTheme.colors.secondaryText,
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: {
    flex: 1,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  progressBlock: { gap: 8 },
  progressLabel: {
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  track: {
    height: 10,
    borderRadius: vibesTheme.radii.pill,
    backgroundColor: "rgba(57, 120, 184, 0.18)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: vibesTheme.radii.pill,
    backgroundColor: vibesTheme.colors.accentBlue,
  },
  body: {
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 15,
    lineHeight: 21,
  },
  button: { alignSelf: "stretch" },
  loader: { paddingVertical: 14 },
});

export default memo(StepChallengeCard);
