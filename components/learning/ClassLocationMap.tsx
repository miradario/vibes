import React, { useState } from "react";
import { Alert, Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useAuthSession } from "../../src/auth/auth.queries";
import { getGoogleMapsClientConfig } from "../../src/config/googleMaps";
import { getIosMapPreviewSource } from "../../src/config/mapPreview";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { Text } from "../Typography";
import Icon from "../Icon";
import * as ds from "../../src/theme/tokens";
const c = vibesTheme.colors;
export default function ClassLocationMap({ address }: { address: string }) {
  const { data: session } = useAuthSession();
  const [failed, setFailed] = useState(false);
  const config = getGoogleMapsClientConfig();
  const query = address.trim();
  const source = getIosMapPreviewSource({query}, session?.access_token, {width:640,height:240}) ?? (config.apiKey ? {
    uri: `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(query)}&zoom=15&size=640x240&scale=2&maptype=roadmap&markers=color:0x${c.accentBlue.slice(1)}%7C${encodeURIComponent(query)}&key=${config.apiKey}`,
    headers: config.headers,
  } : null);
  if (!query) return null;
  return <TouchableOpacity accessibilityRole="link" accessibilityLabel={`Abrir ubicación de la clase: ${query}`} activeOpacity={0.85} style={s.card} onPress={async () => {
    try { await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`); }
    catch { Alert.alert("No se pudo abrir el mapa", "Intentá nuevamente más tarde."); }
  }}>
    {source && !failed ? <Image key={query} source={source} style={s.map} contentFit="cover" onError={()=>setFailed(true)} /> : <View style={s.fallback}><Icon name="location-outline" size={ds.iconSize.lg} color={c.accentBlue}/><Text style={s.address}>{query}</Text></View>}
    <View style={s.footer}><Icon name="navigate-outline" size={ds.iconSize.md} color={c.primaryText}/><Text style={s.label}>Ver ubicación</Text></View>
  </TouchableOpacity>;
}
const s = StyleSheet.create({
  card:{borderRadius:ds.radii.lg,overflow:"hidden",borderWidth:1,borderColor:c.borderSoft,backgroundColor:c.surface},
  map:{width:"100%",height:120},fallback:{minHeight:80,padding:ds.spacing[3],flexDirection:"row",alignItems:"center",gap:ds.spacing[3],backgroundColor:ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle)},
  address:{flex:1,...ds.textStyles.bodySmall,color:c.primaryText},
  footer:{minHeight:44,paddingHorizontal:ds.spacing[3],flexDirection:"row",alignItems:"center",gap:ds.spacing[2]},
  label:{...ds.textStyles.label,color:c.primaryText},
});
