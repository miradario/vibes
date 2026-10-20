import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import { Icon } from ".";
import { messagePreview } from "../src/lib/chatPhotos";
import { getInvitationDisplayText } from "../src/lib/eventInvites";
import { vibesTheme } from "../src/theme/vibesTheme";

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
        <Icon name="close" size={20} color={vibesTheme.colors.secondaryText} />
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
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 8,
    paddingRight: 8,
    borderRadius: 12,
    backgroundColor: "rgba(244, 163, 64, 0.10)",
  },
  quote: {
    flexDirection: "row",
    marginBottom: 6,
    paddingVertical: 6,
    paddingRight: 8,
    borderRadius: 10,
    backgroundColor: "rgba(43, 43, 43, 0.06)",
  },
  accent: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    marginHorizontal: 8,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  content: { flex: 1 },
  author: {
    fontSize: 13,
    color: vibesTheme.colors.accentMustard,
    fontFamily: vibesTheme.fonts.semibold,
  },
  snippet: {
    fontSize: 14,
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.regular,
  },
  missing: { fontStyle: "italic" },
  close: { padding: 4 },
});
