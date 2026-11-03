import React from "react";
import { Alert, Linking, StyleSheet, TouchableOpacity, View, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import Avatar from "../Avatar";
import Icon from "../Icon";
import { Text } from "../Typography";
import ClassLocationMap from "./ClassLocationMap";
import { learningDescriptionDetails } from "../../src/learning/description";
import { buttonStyle, buttonLabel } from "../ui/buttonStyles";
import * as ds from "../../src/theme/tokens";

export function LearningHero({ source, title, category, schedule }: { source?: ImageSourcePropType | null; title: string; category: string; schedule?: string }) {
  return <View style={s.block}>
    {source ? <Image source={source} contentFit="cover" cachePolicy="memory-disk" style={s.hero} accessibilityLabel={title} /> : null}
    <View style={s.category}><Text style={s.categoryLabel}>{category}</Text></View>
    <Text accessibilityRole="header" style={s.title}>{title}</Text>
    {schedule ? <View style={s.schedule}><Icon name="time-outline" size={ds.iconSize.lg} color={ds.colors.icon.default} /><View style={s.divider} /><Text style={[s.name, { flex: 1 }]}>{schedule}</Text></View> : null}
  </View>;
}
export function LearningTeacherRow({ name, image, onPress }: { name: string; image?: string | null; onPress?: () => void }) {
  const content = <>
    <Avatar uri={image} size={ds.avatarSize.md} />
    <Text style={[s.name, { flex: 1 }]}>{name}</Text>
    {onPress ? <View style={s.link}><Text style={s.linkLabel}>Ver perfil</Text><Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.default} /></View> : null}
  </>;
  return onPress ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver perfil de ${name}`} onPress={onPress} style={s.teacher}>{content}</TouchableOpacity> : <View style={s.teacher}>{content}</View>;
}
export function LearningPlaceBlock({ name, address, onPress, showMap = true }: { name?: string; address: string; onPress?: () => void; showMap?: boolean }) {
  const heading = <View style={s.placeHeading}><Icon name="location-outline" size={ds.iconSize.lg} color={ds.colors.icon.muted} /><View style={{ flex: 1, gap: ds.spacing[1] }}>{name ? <Text style={s.name}>{name}</Text> : null}<Text style={s.address}>{address}</Text></View>{onPress ? <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.default} /> : null}</View>;
  return <View style={s.place}>
    {onPress ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver lugar ${name ?? address}`} onPress={onPress}>{heading}</TouchableOpacity> : heading}
    {showMap && /\d/.test(address) ? <ClassLocationMap key={address} address={address} compact /> : null}
    {showMap && address.trim() ? <TouchableOpacity accessibilityRole="link" accessibilityLabel={`Cómo llegar a ${name ?? address}`} onPress={() => {
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`).catch(() => Alert.alert("No se pudo abrir el mapa", "Intentá nuevamente más tarde."));
    }} style={s.directions}><Text style={[s.name,{flex:1}]}>Cómo llegar</Text><Icon name="chevron-forward" size={ds.iconSize.lg} color={ds.colors.icon.default} /></TouchableOpacity> : null}
  </View>;
}
export function LearningAbout({ description }: { description: string }) {
  const { body, schedule, admission } = learningDescriptionDetails(description);
  if (!description.trim()) return null;
  return <View style={s.about}>
    <Text accessibilityRole="header" style={s.sectionTitle}>Sobre el encuentro</Text>
    {body ? <Text style={s.description}>{body}</Text> : null}
    {schedule ? <View style={s.fact}><Icon name="time-outline" size={ds.iconSize.lg} color={ds.colors.icon.muted} /><Text style={[s.description,{flex:1}]}>{schedule}</Text></View> : null}
    {admission ? <View style={s.fact}><Icon name="enter-outline" size={ds.iconSize.lg} color={ds.colors.icon.muted} /><Text style={[s.description,{flex:1}]}>{admission}</Text></View> : null}
  </View>;
}
export function LearningPriceCard({ amount, currency, unit, capacity }: { amount: string; currency?: string; unit: string; capacity?: number }) {
  return <View style={s.price}><Text style={s.priceAmount}>{amount}</Text><Text style={s.address}>{[currency, unit].filter(Boolean).join(" · ")}</Text>{capacity !== undefined ? <Text style={s.address}>{capacity} cupos disponibles</Text> : null}</View>;
}
export function LearningInviteButton({ onPress }: { onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={buttonStyle("secondary","lg")}><Icon name="person-add-outline" size={ds.iconSize.lg} color={ds.colors.icon.default} /><Text style={buttonLabel("lg","secondary")}>Invitar a alguien</Text></TouchableOpacity>;
}
const s = StyleSheet.create({
  directions: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: ds.spacing[2], paddingTop: ds.spacing[3], borderTopWidth: 1, borderTopColor: ds.colors.border.default },
  about: { gap: ds.spacing[4], paddingVertical: ds.spacing[2] },
  sectionTitle: { ...ds.textStyles.title, color: ds.colors.text.primary }, description: { ...ds.textStyles.body, color: ds.colors.text.primary },
  fact: { flexDirection: "row", alignItems: "center", gap: ds.spacing[4], minHeight: 44 },
  price: { padding: ds.spacing[5], gap: ds.spacing[2], borderRadius: ds.radii.xl, backgroundColor: ds.colors.bg.selected },
  priceAmount: { ...ds.textStyles.display, color: ds.colors.text.primary },
  block: { gap: ds.spacing[4] }, hero: { width: "100%", aspectRatio: 1.85, borderRadius: ds.radii.xl, backgroundColor: ds.colors.bg.subtle },
  category: { alignSelf: "flex-start", paddingHorizontal: ds.spacing[3], paddingVertical: ds.spacing[2], borderRadius: ds.radii.md, backgroundColor: ds.colors.feedback.infoBg },
  categoryLabel: { ...ds.textStyles.label, color: ds.colors.text.primary },
  title: { ...ds.textStyles.display, color: ds.colors.text.primary },
  schedule: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: ds.spacing[4], padding: ds.spacing[4], borderRadius: ds.radii.lg, backgroundColor: ds.colors.bg.subtle },
  divider: { width: 1, height: 28, backgroundColor: ds.colors.border.default },
  name: { ...ds.textStyles.subtitle, color: ds.colors.text.primary },
  address: { ...ds.textStyles.body, color: ds.colors.text.secondary },
  teacher: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: ds.spacing[3], paddingVertical: ds.spacing[2] },
  link: { flexDirection: "row", alignItems: "center", gap: ds.spacing[1] },
  linkLabel: { ...ds.textStyles.label, color: ds.colors.text.link },
  place: { padding: ds.spacing[4], gap: ds.spacing[4], borderRadius: ds.radii.xl, backgroundColor: ds.colors.bg.subtle },
  placeHeading: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: ds.spacing[3] },
});
