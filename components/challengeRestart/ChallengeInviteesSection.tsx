import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Avatar from "../Avatar";
import Icon from "../Icon";
import { Text } from "../Typography";
import FriendsPickerSheet from "./FriendsPickerSheet";
import { restartStyles } from "./styles";
import { useI18n } from "../../src/i18n";
import { useAuthSession } from "../../src/auth/auth.queries";
import { matchesQueryOptions } from "../../src/queries/matches.queries";
import {
  useChallengeInviteesQuery,
  useInviteToChallengeMutation,
  type ChallengeInvitationStatus,
} from "../../src/queries/challengeRestart.queries";
import { vibesTheme } from "../../src/theme/vibesTheme";

const STATUS_KEY: Record<ChallengeInvitationStatus, string> = {
  pending: "challengeRestart.statusPending",
  accepted: "challengeRestart.statusAccepted",
  rejected: "challengeRestart.statusRejected",
};

/** Owner view of a private challenge: who was invited, their answer, and "invite more". */
export default function ChallengeInviteesSection({ challengeId }: { challengeId: string }) {
  const { t } = useI18n();
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const { data: invitees = [] } = useChallengeInviteesQuery(challengeId);
  const { data: matches = [] } = useQuery(matchesQueryOptions(userId));
  const invite = useInviteToChallengeMutation();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const friendById = new Map(matches.map((match) => [match.otherUserId, match]));
  // Already pending/accepted people are hidden; rejected ones can be invited again.
  const excludeIds = [
    ...(userId ? [userId] : []),
    ...invitees.filter((item) => item.status !== "rejected").map((item) => item.inviteeId),
  ];

  const send = async () => {
    if (selected.length === 0) return;
    try {
      await invite.mutateAsync({ challengeId, inviteeIds: selected });
      setSelected([]);
      setPickerVisible(false);
      Alert.alert(t("challengeRestart.invitesSent"));
    } catch (error) {
      Alert.alert(
        t("challengeRestart.errorTitle"),
        error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? ""),
      );
    }
  };

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>{t("challengeRestart.inviteesTitle")}</Text>
      {invitees.length === 0 ? <Text style={restartStyles.body}>{t("challengeRestart.inviteesEmpty")}</Text> : null}
      {invitees.map((invitation) => {
        const friend = friendById.get(invitation.inviteeId);
        return (
          <View key={invitation.id} style={restartStyles.row}>
            <Avatar uri={friend?.otherUserPhoto ?? null} size={36} />
            <Text style={restartStyles.rowTitle} numberOfLines={1}>{friend?.otherUserName ?? "Vibes"}</Text>
            <Text style={restartStyles.statusText}>{t(STATUS_KEY[invitation.status])}</Text>
          </View>
        );
      })}
      <TouchableOpacity accessibilityRole="button" style={[restartStyles.pill, { alignSelf: "flex-start" }]} onPress={() => setPickerVisible(true)}>
        <Icon name="person-add-outline" size={18} color={vibesTheme.colors.accentBlue} />
        <Text style={restartStyles.pillText}>{t("challengeRestart.inviteFriends")}</Text>
      </TouchableOpacity>
      <FriendsPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        selected={selected}
        onChange={setSelected}
        excludeIds={excludeIds}
        confirmLabel={t("challengeRestart.sendInvites")}
        onConfirm={() => void send()}
        confirmDisabled={selected.length === 0 || invite.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: vibesTheme.spacing.sm,
    padding: vibesTheme.spacing.md,
    marginTop: vibesTheme.spacing.md,
    borderRadius: vibesTheme.radii.md,
    borderWidth: 1,
    borderColor: "rgba(57, 120, 184, 0.3)",
    backgroundColor: vibesTheme.colors.surface,
  },
  title: {
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 18,
  },
});
