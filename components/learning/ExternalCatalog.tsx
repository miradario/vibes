import { LearningHero, LearningTeacherRow, LearningPlaceBlock, LearningAbout, LearningInviteButton } from "./LearningDetailParts";
import { LearningDockHost } from "./LearningActionDock";
import EventInviteSheet from "../EventInviteSheet";
import { shareClassInvite } from "../../src/lib/socialShare";
import { ClassReservationEntry } from "./ClassReservationPanel";
import { useClasesEnabled } from "../../src/featureFlags/useClasesEnabled";
import {Image} from "expo-image";
import {externalCatalogImages} from "../../src/learning/externalCatalogImages";
import React, { useState } from "react";
import { Alert, Linking, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import ScreenContainer from "../ScreenContainer";
import BackButton from "../BackButton";
import {useNavigation, useRoute} from "@react-navigation/native";
import { externalClasses, externalPlaces, externalLocation, externalPrice, externalSchedule, placeForClass, type ExternalClass, type ExternalPlace } from "../../src/learning/externalCatalog";
import { buttonContentColor, buttonLabel, buttonStyle } from "../ui/buttonStyles";
import { cardStyles } from "../ui/surfaceStyles";
import * as ds from "../../src/theme/tokens";
export function ExternalClassCard({item,onPress}:{item:ExternalClass;onPress:()=>void}) {
  const { fontScale } = useWindowDimensions();
  const imageSize = { width: 80 * Math.max(1, fontScale), height: 92 * Math.max(1, fontScale) };
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver ${item.titulo}`} onPress={onPress} activeOpacity={0.84} style={s.card}>
    <Image source={externalCatalogImages[item.id]} style={[s.art, imageSize]} contentFit="cover" accessibilityLabel={item.titulo} />
    <View style={s.copy}><Text style={s.title} numberOfLines={1}>{item.titulo}</Text><Text style={s.schedule} numberOfLines={1}>{externalSchedule(item)}</Text><Text style={s.meta} numberOfLines={1}>{placeForClass(item)?.nombre}</Text>{item.precio.importe !== null && <Text style={s.meta} numberOfLines={1}>{externalPrice(item)}</Text>}</View>
    <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.text.secondary}/>
  </TouchableOpacity>;
}
export function ExternalPlaceCard({item,onPress}:{item:ExternalPlace;onPress:()=>void}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver ${item.nombre}`} onPress={onPress} activeOpacity={0.84} style={s.card}>
    {externalCatalogImages[item.id] ? <Image source={externalCatalogImages[item.id]} style={s.art} contentFit="cover" /> : <View style={s.art}><Icon name="location-outline" size={ds.iconSize.xl} color={ds.colors.base.coral}/></View>}<View style={s.copy}><Text style={s.title}>{item.nombre}</Text><Text style={s.meta}>{externalLocation(item)}</Text></View><Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.text.secondary}/>
  </TouchableOpacity>;
}
export function ExternalCatalogDetailScreen() {
  const navigation = useNavigation<any>();
  const [inviteVisible, setInviteVisible] = useState(false);
  const {params} = useRoute<any>();
  const clasesEnabled = useClasesEnabled();
  const item = [...externalClasses, ...externalPlaces].find(entry => entry.id === params?.id) ?? null;
  const activity = item && "titulo" in item ? item : null;
  const place = activity ? placeForClass(activity) : item as ExternalPlace|null;
  const openSource = async () => {
    const url = item?.fuentes[0]?.url;
    if (!url || !url.startsWith("https://")) return;
    try { await Linking.openURL(url); } catch { Alert.alert("No se pudo abrir el enlace", "Intentá nuevamente más tarde."); }
  };
  if (!clasesEnabled) return <ScreenContainer><BackButton accessibilityLabel="Volver" onPress={() => navigation.goBack()} /><Text style={s.body}>Clases y espacios no está disponible por el momento.</Text></ScreenContainer>;
  return <LearningDockHost><ScreenContainer scroll edges={["top","left","right"]} contentContainerStyle={[s.detail, { flexGrow: 1 }]}>
      <View style={s.detailHeader}><BackButton accessibilityLabel="Volver a clases" onPress={() => navigation.goBack()} /><Text accessibilityRole="header" style={s.headerTitle}>{activity ? "Actividad" : "Lugar"}</Text>{item && <TouchableOpacity accessibilityRole="button" accessibilityLabel={activity ? "Compartir clase" : "Compartir lugar"} style={s.close} onPress={() => { if (activity) { setInviteVisible(true); return; } const url = item.fuentes[0]?.url; void shareClassInvite(place?.nombre ?? "Vibes", url?.startsWith("https://") ? url : null).catch(() => Alert.alert("No se pudo compartir", "Intentá nuevamente más tarde.")); }}><Icon name="share-outline" size={ds.iconSize.lg} color={ds.colors.text.primary} /></TouchableOpacity>}</View>
      {activity ? <>
        <LearningHero source={externalCatalogImages[activity.id]} title={activity.titulo} category={`${activity.categoria} · ${activity.modalidad}`} schedule={externalSchedule(activity)} />
        {activity.docente ? <LearningTeacherRow name={activity.docente.nombre} /> : null}
        {place ? <LearningPlaceBlock name={place.nombre} address={[externalLocation(place),place.ubicacion.pais].filter(Boolean).join(", ")} onPress={() => navigation.navigate("ExternalCatalogDetail", {id:place.id})} /> : null}
        <LearningAbout description={activity.descripcion} />
      </> : <>
        {item && externalCatalogImages[item.id] ? <Image source={externalCatalogImages[item.id]} contentFit="cover" style={s.cover} /> : null}
        <Text accessibilityRole="header" style={s.detailTitle}>{place?.nombre ?? "No encontramos esta propuesta"}</Text>
        {place ? <LearningPlaceBlock address={externalLocation(place)} /> : null}
      </>}
      {!activity && !!item?.nota && <Text style={s.meta}>{item.nota}</Text>}
      {activity ? <LearningInviteButton onPress={() => setInviteVisible(true)} /> : null}
      {activity && activity.horarios_semanales.length > 0 ? <ClassReservationEntry id={activity.id} /> : null}
      {item && !activity && <Text style={s.meta}>Fuente consultada: {item.fuentes[0]?.consultada_el}</Text>}
      {item && <TouchableOpacity accessibilityRole="link" onPress={openSource} style={[s.primary, !activity && { marginTop: "auto" }]}><Text style={s.primaryLabel}>Contactar al organizador</Text><Icon name="open-outline" size={ds.iconSize.md} color={buttonContentColor["primary"]}/></TouchableOpacity>}
      {activity && <EventInviteSheet classInvite={{id:activity.id,title:activity.titulo,date:externalSchedule(activity),url:activity.fuentes[0]?.url ?? null}} visible={inviteVisible} onClose={()=>setInviteVisible(false)} onDiscover={()=>navigation.navigate("Tab",{screen:"Discover"})} />}
  </ScreenContainer></LearningDockHost>;
}
const s=StyleSheet.create({
  invite:{minHeight:48,paddingHorizontal:ds.spacing[4],borderRadius:ds.radii.lg,borderWidth:1,borderColor:ds.colors.border.subtle,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:ds.spacing[2]},
  inviteLabel:{...ds.textStyles.subtitle,color:ds.colors.text.primary},
  detailHeader:{flexDirection:"row",alignItems:"center",gap:ds.spacing[3]},
  headerTitle:{flex:1,...ds.textStyles.heading,color:ds.colors.text.primary,textAlign:"center"},
  accordion:{flexDirection:"row",alignItems:"center",gap:ds.spacing[2],minHeight:48,padding:ds.spacing[3],borderRadius:ds.radii.lg,borderWidth:1,borderColor:ds.colors.border.subtle},
  cover:{width:"100%",height:168,borderRadius:ds.radii.lg,backgroundColor:ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle)},
  card: { ...cardStyles.base, flexDirection:"row", alignItems:"center", gap:ds.spacing[3], padding:ds.spacing[3] },
  art:{width:80,height:92,borderRadius:ds.radii.lg,alignItems:"center",justifyContent:"center",backgroundColor:ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle)},
  copy:{flex:1,minWidth:0,gap:ds.spacing[1]}, title:{...ds.textStyles.subtitle,color:ds.colors.text.primary},
  schedule:{...ds.textStyles.bodySmall,color:ds.colors.base.blue},meta:{...ds.textStyles.bodySmall,color:ds.colors.text.secondary},
  detail:{gap:ds.spacing[3],padding:ds.spacing[4],paddingBottom:ds.spacing[6]},
  detailTitle:{...ds.textStyles.title,color:ds.colors.text.primary},
  close:{width:44,height:44,alignItems:"center",justifyContent:"center"},body:{...ds.textStyles.body,color:ds.colors.text.primary},notice:{padding:ds.spacing[3],gap:ds.spacing[2],borderRadius:ds.radii.lg,backgroundColor:ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle)},
  primary: {
    ...buttonStyle("primary", "lg"),
  },primaryLabel:{...buttonLabel("lg", "primary")},
});
