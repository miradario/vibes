import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "./Typography";
import MeetPeopleChoice from "./MeetPeopleChoice";
import { useMeetPeople } from "../src/queries/meetPeople.queries";
import { useI18n } from "../src/i18n";
import { handleApiError } from "../src/utils/handleApiError";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function MeetPeopleSettings() {
  const { locale } = useI18n();
  const { enabled, ready, query, mutation } = useMeetPeople();
  return <View>
    <MeetPeopleChoice enabled={enabled} english={locale === "en"} disabled={!ready || mutation.isPending}
      onChange={value => mutation.mutate(value, { onError: error => handleApiError(error, { toastTitle: "No se pudo guardar esta preferencia. Intentá nuevamente." }) })} />
    {query.isError ? <TouchableOpacity accessibilityRole="button" onPress={() => void query.refetch()} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: vibesTheme.colors.primaryText }}>No pudimos cargar esta opción. Tocá para reintentar.</Text></TouchableOpacity> : null}
  </View>;
}
