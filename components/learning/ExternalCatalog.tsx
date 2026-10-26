import EventInviteSheet from "../EventInviteSheet";
import { shareClassInvite } from "../../src/lib/socialShare";
import ClassLocationMap from "./ClassLocationMap";
import ClassReservationPanel from "./ClassReservationPanel";
import { WEEKDAYS } from "../../src/learning/reservations";
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
import { vibesTheme } from "../../src/theme/vibesTheme";
import { externalClasses, externalPlaces, externalLocation, externalPrice, externalSchedule, placeForClass, type ExternalClass, type ExternalPlace } from "../../src/learning/externalCatalog";
const c = vibesTheme.colors;
export function ExternalClassCard({item,onPress}:{item:ExternalClass;onPress:()=>void}) {
  const { fontScale } = useWindowDimensions();
  const imageSize = { width: 80 * Math.max(1, fontScale), height: 92 * Math.max(1, fontScale) };
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver ${item.titulo}`} onPress={onPress} activeOpacity={0.84} style={s.card}>
    <Image source={externalCatalogImages[item.id]} style={[s.art, imageSize]} contentFit="cover" accessibilityLabel={item.titulo} />
    <View style={s.copy}><Text style={s.title} numberOfLines={1}>{item.titulo}</Text><Text style={s.schedule} numberOfLines={1}>{externalSchedule(item)}</Text><Text style={s.meta} numberOfLines={1}>{placeForClass(item)?.nombre}</Text>{item.precio.importe !== null && <Text style={s.meta} numberOfLines={1}>{externalPrice(item)}</Text>}</View>
    <Icon name="chevron-forward" size={20} color={c.secondaryText}/>
  </TouchableOpacity>;
}
export function ExternalPlaceCard({item,onPress}:{item:ExternalPlace;onPress:()=>void}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver ${item.nombre}`} onPress={onPress} activeOpacity={0.84} style={s.card}>
    {externalCatalogImages[item.id] ? <Image source={externalCatalogImages[item.id]} style={s.art} contentFit="cover" /> : <View style={s.art}><Icon name="location-outline" size={30} color={c.accentCoral}/></View>}<View style={s.copy}><Text style={s.title}>{item.nombre}</Text><Text style={s.meta}>{externalLocation(item)}</Text></View><Icon name="chevron-forward" size={20} color={c.secondaryText}/>
  </TouchableOpacity>;
}
export function ExternalCatalogDetailScreen() {
  const navigation = useNavigation<any>();
  const [inviteVisible, setInviteVisible] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const {params} = useRoute<any>();
  const clasesEnabled = useClasesEnabled();
  const item = [...externalClasses, ...externalPlaces].find(entry => entry.id === params?.id) ?? null;
  const activity = item && "titulo" in item ? item : null;
  const place = activity ? placeForClass(activity) : item as ExternalPlace|null;
  const hasMap = Boolean(place?.ubicacion.direccion?.trim());
  const showModality = activity && !(hasMap && activity.modalidad.trim().toLowerCase() === "presencial");
  const openSource = async () => {
    const url = item?.fuentes[0]?.url;
    if (!url || !url.startsWith("https://")) return;
    try { await Linking.openURL(url); } catch { Alert.alert("No se pudo abrir el enlace", "Intentá nuevamente más tarde."); }
  };
  if (!clasesEnabled) return <ScreenContainer><BackButton accessibilityLabel="Volver" onPress={() => navigation.goBack()} /><Text style={s.body}>Clases y espacios no está disponible por el momento.</Text></ScreenContainer>;
  return <ScreenContainer scroll edges={["top","left","right","bottom"]} contentContainerStyle={s.detail}>
      <View style={s.detailHeader}><BackButton accessibilityLabel="Volver a clases" onPress={() => navigation.goBack()} /><Text accessibilityRole="header" style={s.headerTitle}>{activity?.titulo ?? "Detalle del lugar"}</Text>{item && <TouchableOpacity accessibilityRole="button" accessibilityLabel={activity ? "Compartir clase" : "Compartir lugar"} style={s.close} onPress={() => { if (activity) { setInviteVisible(true); return; } const url = item.fuentes[0]?.url; void shareClassInvite(place?.nombre ?? "Vibes", url?.startsWith("https://") ? url : null).catch(() => Alert.alert("No se pudo compartir", "Intentá nuevamente más tarde.")); }}><Icon name="share-outline" size={24} color={c.primaryText} /></TouchableOpacity>}</View>
      {item && externalCatalogImages[item.id] && <Image source={externalCatalogImages[item.id]} contentFit="contain" style={s.cover} />}
      {!activity && <Text accessibilityRole="header" style={s.detailTitle}>{place?.nombre ?? "No encontramos esta propuesta"}</Text>}
      {activity && <>
        {activity.docente && <Text style={s.body}>Con {activity.docente.nombre}</Text>}
        {showModality && <View style={s.detailHeader}><Icon name="location-outline" size={20} color={c.primaryText} /><Text style={s.body}>{activity.modalidad}</Text></View>}
        <View style={s.detailHeader}><Icon name="calendar-outline" size={20} color={c.accentBlue} /><Text style={[s.body,{flex:1}]}>{externalSchedule(activity)}</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:descriptionOpen}} onPress={() => setDescriptionOpen(value => !value)} style={s.accordion}><Icon name="document-text-outline" size={22} color={c.primaryText}/><Text style={[s.body,{flex:1}]}>Sobre esta clase</Text><Icon name={descriptionOpen ? "chevron-up" : "chevron-down"} size={20} color={c.primaryText}/></TouchableOpacity>
        {descriptionOpen && <Text style={s.body}>{activity.descripcion}</Text>}
      </>}
      {item && <Text style={s.body}>{externalLocation(place ?? undefined)}</Text>}
      {place?.ubicacion.direccion?.trim() && <ClassLocationMap key={place.id} address={[externalLocation(place),place.ubicacion.pais].filter(Boolean).join(", ")} />}
      {(descriptionOpen || !activity) && !!item?.nota && <Text style={s.meta}>{item.nota}</Text>}
      {activity && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Invitar personas a la clase" onPress={() => setInviteVisible(true)} style={s.invite}><Icon name="person-add-outline" size={20} color={c.primaryText}/><Text style={s.inviteLabel}>Invitar a alguien</Text></TouchableOpacity>}
      {activity && activity.horarios_semanales.length > 0 && <ClassReservationPanel key={activity.id} source={{id:activity.id,weekly:activity.horarios_semanales.flatMap(slot => { const day = WEEKDAYS.indexOf(slot.dia); return day < 0 ? [] : [{day,time:slot.hora_inicio}]; })}} />}
      {item && (descriptionOpen || !activity) && <Text style={s.meta}>Fuente consultada: {item.fuentes[0]?.consultada_el}</Text>}
      {item && <TouchableOpacity accessibilityRole="link" onPress={openSource} style={s.primary}><Text style={s.primaryLabel}>Contactar al organizador</Text><Icon name="open-outline" size={20} color={c.surface}/></TouchableOpacity>}
      {activity && <EventInviteSheet classInvite={{id:activity.id,title:activity.titulo,date:externalSchedule(activity),url:activity.fuentes[0]?.url ?? null}} visible={inviteVisible} onClose={()=>setInviteVisible(false)} onDiscover={()=>navigation.navigate("Tab",{screen:"Discover"})} />}
  </ScreenContainer>;
}
const s=StyleSheet.create({
  invite:{minHeight:48,paddingHorizontal:16,borderRadius:16,borderWidth:1,borderColor:c.borderSoft,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},
  inviteLabel:{fontSize:16,lineHeight:22,fontFamily:vibesTheme.fonts.semibold,color:c.primaryText},
  detailHeader:{flexDirection:"row",alignItems:"center",gap:12},
  headerTitle:{flex:1,fontSize:18,lineHeight:24,fontFamily:vibesTheme.fonts.semibold,color:c.primaryText,textAlign:"center"},
  accordion:{flexDirection:"row",alignItems:"center",gap:8,minHeight:48,padding:10,borderRadius:16,borderWidth:1,borderColor:c.borderSoft},
  cover:{width:"100%",height:168,borderRadius:16,backgroundColor:`${c.secondaryText}0C`},
  card:{flexDirection:"row",alignItems:"center",gap:12,padding:10,borderRadius:20,borderWidth:1,borderColor:`${c.primaryText}14`,backgroundColor:c.surface},
  art:{width:80,height:92,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:`${c.accentBlue}14`},
  copy:{flex:1,minWidth:0,gap:3}, title:{fontFamily:vibesTheme.fonts.bold,fontSize:17,lineHeight:23,color:c.primaryText},
  schedule:{fontSize:14,lineHeight:20,color:c.accentBlue},meta:{fontSize:14,lineHeight:20,color:c.secondaryText},
  detail:{gap:10,padding:16,paddingBottom:24},
  detailTitle:{fontFamily:vibesTheme.fonts.bold,fontSize:22,lineHeight:28,color:c.primaryText},
  close:{width:44,height:44,alignItems:"center",justifyContent:"center"},body:{fontSize:16,lineHeight:24,color:c.primaryText},notice:{padding:12,gap:6,borderRadius:16,backgroundColor:`${c.accentBlue}14`},
  primary:{minHeight:56,borderRadius:999,backgroundColor:c.primaryText,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingHorizontal:20},primaryLabel:{fontFamily:vibesTheme.fonts.bold,fontSize:16,lineHeight:22,color:c.surface},
});
