import { useClasesEnabled } from "../../src/featureFlags/useClasesEnabled";
import {Image} from "expo-image";
import {externalCatalogImages} from "../../src/learning/externalCatalogImages";
import React from "react";
import { Alert, Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import ScreenContainer from "../ScreenContainer";
import BackButton from "../BackButton";
import {useNavigation, useRoute} from "@react-navigation/native";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { externalClasses, externalPlaces, externalLocation, externalPrice, externalSchedule, placeForClass, type ExternalClass, type ExternalPlace } from "../../src/learning/externalCatalog";
const c = vibesTheme.colors;
export function ExternalClassCard({item,onPress}:{item:ExternalClass;onPress:()=>void}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver ${item.titulo}`} onPress={onPress} activeOpacity={0.84} style={s.card}>
    <Image source={externalCatalogImages[item.id]} style={s.art} contentFit="cover" accessibilityLabel={`Imagen de la fuente oficial de ${item.titulo}`} />
    <View style={s.copy}><Text style={s.title} numberOfLines={2}>{item.titulo}</Text><Text style={s.schedule} numberOfLines={2}>{externalSchedule(item)}</Text><Text style={s.meta} numberOfLines={1}>{placeForClass(item)?.nombre}</Text><Text style={s.meta}>{externalPrice(item)}</Text></View>
    <Icon name="chevron-forward" size={20} color={c.secondaryText}/>
  </TouchableOpacity>;
}
export function ExternalPlaceCard({item,onPress}:{item:ExternalPlace;onPress:()=>void}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver ${item.nombre}`} onPress={onPress} activeOpacity={0.84} style={s.card}>
    {externalCatalogImages[item.id] ? <Image source={externalCatalogImages[item.id]} style={s.art} contentFit="cover" /> : <View style={s.art}><Icon name="location-outline" size={30} color={c.accentCoral}/></View>}<View style={s.copy}><Text style={s.title}>{item.nombre}</Text><Text style={s.meta}>{externalLocation(item)}</Text></View><Icon name="chevron-forward" size={20} color={c.secondaryText}/>
  </TouchableOpacity>;
}
export function ExternalCatalogDetailScreen() {
  const navigation = useNavigation();
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
  return <ScreenContainer scroll edges={["top","left","right","bottom"]} contentContainerStyle={s.detail}>
      <BackButton accessibilityLabel="Volver a clases" onPress={() => navigation.goBack()} />
      <Text accessibilityRole="header" style={s.detailTitle}>{activity?.titulo ?? place?.nombre ?? "No encontramos esta propuesta"}</Text>
      {item && externalCatalogImages[item.id] && <><Image source={externalCatalogImages[item.id]} contentFit="contain" style={s.cover} /><Text style={s.meta}>Imagen de la fuente oficial</Text></>}
      {activity && <><Text style={s.body}>{activity.descripcion}</Text>{activity.docente && <Text style={s.body}>Docente: {activity.docente.nombre}</Text>}<Text style={s.body}>{activity.modalidad}</Text><Text style={s.body}>{externalSchedule(activity)}</Text><Text style={s.body}>{externalPrice(activity)}</Text><Text style={s.meta}>{activity.precio.estado}</Text></>}
      {item && <Text style={s.body}>{externalLocation(place ?? undefined)}</Text>}
      {!!item?.nota && <Text style={s.meta}>{item.nota}</Text>}
      {item && <View style={s.notice}><Text style={s.body}>Referencia externa</Text><Text style={s.meta}>{activity?.estado_agenda ?? "Consultá la información vigente con el lugar."} Las reservas se consultan directamente con el organizador.</Text></View>}
      {item && <Text style={s.meta}>Fuente consultada: {item.fuentes[0]?.consultada_el}</Text>}
      {item && <TouchableOpacity accessibilityRole="link" onPress={openSource} style={s.primary}><Text style={s.primaryLabel}>Consultar sitio oficial</Text><Icon name="open-outline" size={20} color={c.surface}/></TouchableOpacity>}
  </ScreenContainer>;
}
const s=StyleSheet.create({
  cover:{width:"100%",height:240,borderRadius:16,backgroundColor:`${c.secondaryText}0C`},
  card:{flexDirection:"row",alignItems:"center",gap:12,padding:10,borderRadius:20,borderWidth:1,borderColor:`${c.primaryText}14`,backgroundColor:c.surface},
  art:{width:80,height:92,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:`${c.accentBlue}14`},
  copy:{flex:1,gap:4}, title:{fontFamily:vibesTheme.fonts.bold,fontSize:17,lineHeight:23,color:c.primaryText},
  schedule:{fontSize:14,lineHeight:20,color:c.accentBlue},meta:{fontSize:14,lineHeight:20,color:c.secondaryText},
  detail:{gap:16,padding:24,paddingBottom:32},
  detailTitle:{fontFamily:vibesTheme.fonts.bold,fontSize:24,lineHeight:30,color:c.primaryText},
  close:{width:44,height:44,alignItems:"center",justifyContent:"center"},body:{fontSize:16,lineHeight:24,color:c.primaryText},notice:{padding:16,gap:8,borderRadius:16,backgroundColor:`${c.accentBlue}14`},
  primary:{minHeight:56,borderRadius:999,backgroundColor:c.primaryText,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingHorizontal:20},primaryLabel:{fontFamily:vibesTheme.fonts.bold,fontSize:16,lineHeight:22,color:c.surface},
});
