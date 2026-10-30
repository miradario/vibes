import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import { Icon } from ".";
import { messagePreview } from "../src/lib/chatPhotos";
import { getInvitationDisplayText } from "../src/lib/eventInvites";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

export type ReplyTarget = { id: string; author: string; body: string };

export const replySnippet = (body: string | null | undefined) => {
  const preview = messagePreview(body) ?? "";
  const text = preview === body ? getInvitationDisplayText(preview) || preview : preview;
  return text.replace(/\s+/g, " ").trim();
};

/** Bar above the composer showing which message is being answered. */
export function ReplyPreviewBar({
  target,
  onClose,
}: {
  target: ReplyTarget;
  onClose: () => void;
}) {
  return (
    <View style={s.bar}>
      <View style={s.accent} />
      <View style={s.content}>
        <Text style={s.author} numberOfLines={1}>
          Respondiendo a {target.author}
        </Text>
        <Text style={s.snippet} numberOfLines={1}>
          {replySnippet(target.body)}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Cancelar respuesta"
        hitSlop={10}
        onPress={onClose}
        style={s.close}
      >
        <Icon name="close" size={ds.iconSize.md} color={vibesTheme.colors.secondaryText} />
      </TouchableOpacity>
    </View>
  );
}

/** Quoted original rendered inside a reply bubble. */
export function QuotedMessage({
  author,
  body,
  onPress,
}: {
  author?: string;
  body?: string | null;
  onPress?: () => void;
}) {
  const missing = body == null;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Ir al mensaje citado"
      activeOpacity={0.7}
      disabled={!onPress || missing}
      onPress={onPress}
      style={s.quote}
    >
      <View style={s.accent} />
      <View style={s.content}>
        {author ? (
          <Text style={s.author} numberOfLines={1}>
            {author}
          </Text>
        ) : null}
        <Text style={[s.snippet, missing && s.missing]} numberOfLines={2}>
          {missing ? "Mensaje no disponible" : replySnippet(body)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: ds.spacing[3],
    marginTop: ds.spacing[2],
    paddingVertical: ds.spacing[2],
    paddingRight: ds.spacing[2],
    borderRadius: ds.radii.md,
    backgroundColor: ds.colors.bg.selected,
  },
  quote: {
    flexDirection: "row",
    marginBottom: ds.spacing[2],
    paddingVertical: ds.spacing[2],
    paddingRight: ds.spacing[2],
    borderRadius: ds.radii.md,
    backgroundColor: ds.colors.bg.subtle,
  },
  accent: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: ds.radii.pill,
    marginHorizontal: ds.spacing[2],
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  content: { flex: 1 },
  author: {
    ...ds.textStyles.label,
    color: vibesTheme.colors.accentMustard,
  },
  snippet: {
    ...ds.textStyles.bodySmall,
    color: vibesTheme.colors.secondaryText,
  },
  missing: { fontStyle: "italic" },
  close: { padding: ds.spacing[1] },
});
