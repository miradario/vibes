import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "../AnimatedSheetModal";
import VibesActionButton from "../VibesActionButton";
import Avatar from "../Avatar";
import Icon from "../Icon";
import { Text } from "../Typography";
import { useI18n } from "../../src/i18n";
import { useQuery } from "@tanstack/react-query";
import { matchesQueryOptions } from "../../src/queries/matches.queries";
import { useAuthSession } from "../../src/auth/auth.queries";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { restartStyles as s } from "./styles";
import * as ds from "../../src/theme/tokens";

/** Lists the user's Vibes connections (matches) to pick who to invite. */
export default function FriendsPickerSheet({
  visible,
  onClose,
  selected,
  onChange,
  excludeIds = [],
  confirmLabel,
  onConfirm,
  confirmDisabled,
}: {
  visible: boolean;
  onClose: () => void;
  selected: string[];
  onChange: (ids: string[]) => void;
  excludeIds?: string[];
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { data: session } = useAuthSession();
  const { data: matches = [] } = useQuery(matchesQueryOptions(session?.user?.id));
  const excluded = new Set(excludeIds);
  const friends = Array.from(
    new Map(
      matches
        .filter((match) => !excluded.has(match.otherUserId))
        .map((match) => [match.otherUserId, match]),
    ).values(),
  );
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onClose}
      sheetStyle={[s.sheet, { paddingBottom: Math.max(insets.bottom, ds.spacing[5]), maxHeight: "85%" }]}
    >
      <View style={s.handle} />
      <Text accessibilityRole="header" style={s.sheetTitle}>
        {t("challengeRestart.friendsTitle")}
      </Text>
      {friends.length === 0 ? <Text style={s.body}>{t("challengeRestart.noFriends")}</Text> : null}
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: vibesTheme.spacing[2] }}>
        {friends.map((friend) => {
          const checked = selected.includes(friend.otherUserId);
          return (
            <TouchableOpacity
              key={friend.otherUserId}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              style={s.row}
              onPress={() => toggle(friend.otherUserId)}
            >
              <Avatar uri={friend.otherUserPhoto} size={40} />
              <Text style={s.rowTitle} numberOfLines={1}>{friend.otherUserName}</Text>
              <Icon
                name={checked ? "checkbox" : "square-outline"}
                size={ds.iconSize.lg}
                color={vibesTheme.colors.accentMustard}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <VibesActionButton
        label={confirmLabel ?? t("challengeRestart.done")}
        onPress={onConfirm ?? onClose}
        disabled={confirmDisabled}
      />
    </AnimatedSheetModal>
  );
}
