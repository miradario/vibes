import React from "react";
import { Alert, View } from "react-native";
import VibesActionButton from "../VibesActionButton";
import { Text } from "../Typography";
import { restartStyles } from "./styles";
import { useI18n } from "../../src/i18n";
import {
  useRespondChallengeInvitationMutation,
  type ReceivedChallengeInvitation,
} from "../../src/queries/challengeRestart.queries";
import * as ds from "../../src/theme/tokens";

/** Footer for an invitee of a private challenge: accept joins, reject never joins. */
export default function ChallengeInvitationActions({
  invitation,
  userId,
}: {
  invitation: ReceivedChallengeInvitation;
  userId: string;
}) {
  const { t } = useI18n();
  const respond = useRespondChallengeInvitationMutation();
  const answer = (accept: boolean) =>
    respond.mutate(
      { id: invitation.id, accept, userId },
      {
        onError: (error) =>
          Alert.alert(
            t("challengeRestart.errorTitle"),
            error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? ""),
          ),
      },
    );
  return (
    <View style={{ gap: ds.spacing[2] }}>
      <Text style={restartStyles.statusText}>
        {t(invitation.status === "rejected" ? "challengeRestart.statusRejected" : "challengeRestart.statusPending")}
      </Text>
      <VibesActionButton label={t("challengeRestart.accept")} onPress={() => answer(true)} disabled={respond.isPending} />
      {invitation.status === "pending" ? (
        <VibesActionButton variant="skip" label={t("challengeRestart.reject")} onPress={() => answer(false)} disabled={respond.isPending} />
      ) : null}
    </View>
  );
}
