import React, { useEffect, useRef, useState } from "react";
import {
  type StyleProp,
  ActivityIndicator,
  AppState,
  ScrollView,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { Text } from "../Typography";
import { useAuthSession } from "../../src/auth/auth.queries";
import { useChallengeDays } from "../../src/queries/challengeDays.queries";
import ChallengeDayEditor from "./ChallengeDayEditor";
import DayAttachmentView from "./DayAttachmentView";
import { DayButton } from "./DayButton";
import { dayStyles as s } from "./styles";
import { vibesTheme } from "../../src/theme/vibesTheme";

export default function ChallengeDaysSection({
  challengeId,
  totalDays,
  currentDay,
  isCreator,
  isJoined,
  editRequest = 0,
  mode = "creator",
}: {
  challengeId: string;
  totalDays: number;
  currentDay: number;
  isCreator: boolean;
  isJoined: boolean;
  editRequest?: number;
  mode?: "creator" | "completion";
}) {
  const { data: session } = useAuthSession();
  const [day, setDay] = useState(Math.max(1, Math.min(currentDay, totalDays)));
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const focused = useIsFocused();
  const days = useChallengeDays(challengeId, isCreator || isJoined);
  const handledEditRequest = useRef(0);
  const canEdit = mode === "creator" && isCreator;
  const canChooseDay = mode === "creator";
  useEffect(() => {
    if (
      canEdit &&
      editRequest > handledEditRequest.current &&
      !days.isLoading &&
      !days.isError
    ) {
      handledEditRequest.current = editRequest;
      setEditing(true);
    }
  }, [editRequest, canEdit, days.isLoading, days.isError]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) =>
      setActive(state === "active")
    );
    return () => sub.remove();
  }, []);
  const selected = days.data?.find((item) => item.day === day) ?? {
    challenge_id: challengeId,
    day,
    title: `Día ${day}`,
    description: "",
    attachments: [],
    revision: 0,
  };
  const hasAttachments = selected.attachments.length > 0;
  const hasCustomTitle = selected.title !== `Día ${day}`;
  const hasDescription = selected.description.trim().length > 0;
  const hasPublishedContent = hasCustomTitle || hasDescription || hasAttachments;
  const containerStyle: StyleProp<ViewStyle> =
    mode === "completion" && !hasCustomTitle && !hasDescription
      ? s.plain
      : s.card;
  if (mode === "creator" && !isCreator) return null;
  if (mode === "completion" && !isJoined) return null;
  if (mode === "completion" && !hasPublishedContent) return null;
  return (
    <View style={containerStyle}>
      {mode === "creator" ? (
        <Text style={s.title}>Contenido del desafío</Text>
      ) : null}
      {canChooseDay ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {Array.from({ length: totalDays }, (_, index) => index + 1).map(
            (value) => (
              <TouchableOpacity
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: value === day }}
                accessibilityLabel={`Ver día ${value}`}
                onPress={() => {
                  setDay(value);
                  setEditing(false);
                }}
                style={[s.button, value === day ? s.primary : s.secondary]}
              >
                <Text
                  style={[
                    s.buttonText,
                    value === day ? null : s.secondaryButtonText,
                  ]}
                >
                  Día {value}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      ) : null}
      {days.isLoading ? (
        <ActivityIndicator color={vibesTheme.colors.primaryText} />
      ) : days.isError ? (
        <>
          <Text style={s.error}>No se pudo cargar el contenido del día.</Text>
          <DayButton label="Reintentar" onPress={() => void days.refetch()} />
        </>
      ) : (
        <>
          {canChooseDay ? (
            <Text style={s.hint}>Vista del contenido cargado para día {day}</Text>
          ) : null}
          {mode === "creator" || hasCustomTitle ? (
            <Text style={s.title}>{selected.title}</Text>
          ) : null}
          {hasDescription || mode === "creator" ? (
            <Text style={selected.description ? s.text : s.hint}>
              {selected.description ||
                "Este día todavía no tiene una consigna personalizada."}
            </Text>
          ) : null}
          {focused && active && !editing
            ? selected.attachments.map((item) => (
                <DayAttachmentView key={`${day}:${item.id}`} item={item} />
              ))
            : null}
          {canChooseDay && !hasAttachments ? (
            <Text style={s.hint}>Este día todavía no tiene contenidos adjuntos.</Text>
          ) : null}
          {canEdit && session ? (
            <DayButton
              label="Personalizar día"
              style={s.primary}
              onPress={() => setEditing(true)}
            />
          ) : null}
        </>
      )}
      {editing && session ? (
        <ChallengeDayEditor
          key={`${challengeId}:${day}`}
          initial={selected}
          userId={session.user.id}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </View>
  );
}
