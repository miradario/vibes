import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Avatar from "../Avatar";
import Icon from "../Icon";
import { Text } from "../Typography";
import EventInviteSheet from "../EventInviteSheet";
import { restartStyles } from "./styles";
import { useI18n } from "../../src/i18n";
import { useAuthSession } from "../../src/auth/auth.queries";
import { matchesQueryOptions } from "../../src/queries/matches.queries";
import {
  useChallengeInviteesQuery,
  type ChallengeInvitationStatus,
} from "../../src/queries/challengeRestart.queries";
import { vibesTheme } from "../../src/theme/vibesTheme";
import type { EventFeedItem } from "../../src/queries/events.queries";
import * as ds from "../../src/theme/tokens";

const STATUS_KEY: Record<ChallengeInvitationStatus, string> = {
  pending: "challengeRestart.statusPending",
  accepted: "challengeRestart.statusAccepted",
  rejected: "challengeRestart.statusRejected",
};

/** Owner view of a private challenge: who was invited, their answer, and "invite more". */
export default function ChallengeInviteesSection({ challenge, inviteButtonStyle }: { challenge: EventFeedItem; inviteButtonStyle?: StyleProp<ViewStyle> }) {
  const challengeId = challenge.id;
  const { t } = useI18n();
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const { data: invitees = [] } = useChallengeInviteesQuery(challengeId);
  const { data: matches = [] } = useQuery(matchesQueryOptions(userId));
  const [pickerVisible, setPickerVisible] = useState(false);
  const friendById = new Map(matches.map((match) => [match.otherUserId, match]));
  // Already pending/accepted people are hidden; rejected ones can be invited again.
  const excludeIds = [
    ...(userId ? [userId] : []),
    ...invitees.filter((item) => item.status !== "rejected").map((item) => item.inviteeId),
  ];

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
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Invitar personas al desafío" style={inviteButtonStyle} onPress={() => setPickerVisible(true)}>
        <Icon name="person-add-outline" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
        <Text style={{ color: vibesTheme.colors.primaryText, ...ds.textStyles.subtitleMedium }}>Invitar a alguien</Text>
      </TouchableOpacity>
      <EventInviteSheet
        privateChallenge={{ event: challenge, excludeUserIds: excludeIds }}
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onDiscover={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: vibesTheme.spacing[2],
    padding: vibesTheme.spacing[4],
    marginTop: vibesTheme.spacing[4],
    borderRadius: vibesTheme.radii.lg,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.scrim),
    backgroundColor: vibesTheme.colors.surface,
  },
  title: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.heading,
  },
});
