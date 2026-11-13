import VibesLoader from "../VibesLoader";
import React, { useState } from "react";
import { View } from "react-native";
import { Text } from "../Typography";
import { useAuthSession } from "../../src/auth/auth.queries";
import { useChallengeResources } from "../../src/queries/challengeResources.queries";
import ChallengeDayEditor from "../challengeDays/ChallengeDayEditor";
import DayAttachmentView from "../challengeDays/DayAttachmentView";
import { DayButton } from "../challengeDays/DayButton";
import { dayStyles as s } from "../challengeDays/styles";
import * as ds from "../../src/theme/tokens";
import type { ChallengeDay } from "../../src/lib/challengeDayContent";

export default function ChallengeResourcesSection({
  challengeId,
}: {
  challengeId?: string;
}) {
  const { data: session } = useAuthSession();
  const canEdit = Boolean(challengeId && session);
  const resources = useChallengeResources(challengeId ?? "", canEdit);
  const [editing, setEditing] = useState(false);
  const published = resources.data ?? {
    challenge_id: challengeId ?? "",
    attachments: [],
    revision: 0,
  };
  const editorInitial: ChallengeDay = {
    challenge_id: published.challenge_id,
    day: 0,
    title: "Recursos",
    description: "",
    attachments: published.attachments,
    revision: published.revision,
  };

  return (
    <View style={s.card}>
      <Text style={s.title}>Recursos</Text>
      {canEdit ? (
        <Text style={s.hint}>
          Fotos, audios y links de referencia para quienes participan del
          desafío. Solo ellos pueden verlos.
        </Text>
      ) : (
        <Text style={s.hint}>
          Guardá el desafío para adjuntar fotos, audios y links. Quedan
          visibles solo para quienes participan.
        </Text>
      )}
      {!canEdit ? null : resources.isLoading ? (
        <VibesLoader />
      ) : resources.isError ? (
        <>
          <Text style={s.error}>No se pudieron cargar los recursos.</Text>
          <DayButton
            label="Reintentar"
            onPress={() => void resources.refetch()}
          />
        </>
      ) : (
        <>
          {published.attachments.length === 0 ? (
            <Text style={s.hint}>Todavía no hay recursos adjuntos.</Text>
          ) : (
            <View style={{ gap: ds.spacing[3] }}>
              {published.attachments.map((item) => (
                <DayAttachmentView key={item.id} item={item} />
              ))}
            </View>
          )}
          {session ? (
            <DayButton
              label={
                published.attachments.length > 0
                  ? "Editar recursos"
                  : "Agregar recursos"
              }
              style={s.primary}
              textStyle={s.accentButtonText}
              onPress={() => setEditing(true)}
            />
          ) : null}
        </>
      )}
      {editing && session && challengeId ? (
        <ChallengeDayEditor
          key={`resources:${challengeId}:${published.revision}`}
          initial={editorInitial}
          userId={session.user.id}
          onClose={() => setEditing(false)}
          variant="resources"
        />
      ) : null}
    </View>
  );
}
