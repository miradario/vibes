import React, { useEffect, useRef, useState } from "react";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import * as ExpoLocation from "expo-location";
import { Text, TextInput } from "../Typography";
import Icon from "../Icon";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { placeMapHtml,validPlacePoint,type PlacePoint } from "../../src/learning/placeMap";
import { findPlaceAddress,placeAddressForPoint } from "../../src/learning/placeGeocoding";
const c=vibesTheme.colors;
export default function PlaceLocationPicker({address,point,onAddressChange,onPointChange}:{address:string;point:PlacePoint|null;onAddressChange:(value:string)=>void;onPointChange:(point:PlacePoint|null)=>void}){
  const map=useRef<WebView>(null),version=useRef(0);
  const source=useRef({html:placeMapHtml(point),baseUrl:"https://vibes.gurudevelopers.dev/maps/"});
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [mapError,setMapError]=useState(false),[reload,setReload]=useState(0);
  useEffect(()=>()=>{version.current++;},[]);
  useEffect(()=>{if(ready && validPlacePoint(point)) map.current?.injectJavaScript(`window.moveToPlacePoint && window.moveToPlacePoint(${point.latitude},${point.longitude});true;`);},[ready,point?.latitude,point?.longitude]);
  const choosePoint=async(value:PlacePoint)=>{
    if(!validPlacePoint(value))return;
    const current=++version.current;setBusy(false);
    onPointChange(value);onAddressChange("Ubicación elegida en el mapa");setError("");
    const name=await placeAddressForPoint(value);
    if(version.current===current && name)onAddressChange(name);
  };
  const search=async()=>{
    if(address.trim().length<3 || busy)return;
    const current=++version.current;setBusy(true);setError("");
    try{const result=await findPlaceAddress(address);if(current===version.current){onAddressChange(result.address);onPointChange(result.point);}}
    catch{if(current===version.current)setError("No encontramos esa dirección. Agregá la ciudad o elegí el punto moviendo el mapa.");}
    finally{if(current===version.current)setBusy(false);}
  };
  return <View style={{gap:10}}>
    <Text style={s.label}>Ubicación *</Text>
    <View style={s.input}><Icon name="search" size={22} color={c.secondaryText}/><TextInput accessibilityLabel="Dirección del lugar" placeholder="Calle, número y ciudad" placeholderTextColor={c.secondaryText} value={address} onChangeText={value=>{version.current++;setBusy(false);onAddressChange(value);onPointChange(null);setError("");}} onSubmitEditing={()=>void search()} returnKeyType="search" style={s.textInput}/>{!!address && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar ubicación" style={s.icon} onPress={()=>{version.current++;onAddressChange("");onPointChange(null);setBusy(false);}}><Icon name="close" size={22} color={c.secondaryText}/></TouchableOpacity>}</View>
    <TouchableOpacity accessibilityRole="button" disabled={busy || address.trim().length<3} onPress={()=>void search()} style={s.searchButton}><Text style={s.link}>{busy ? "Buscando ubicación…" : "Buscar dirección en el mapa"}</Text></TouchableOpacity>
    <View style={s.map}>
      {!mapError ? <WebView key={reload} ref={map} source={source.current} originWhitelist={["https://*","about:blank"]} applicationNameForUserAgent="Vibes/1.0 (+https://vibes.gurudevelopers.dev)" javaScriptEnabled nestedScrollEnabled cacheEnabled setSupportMultipleWindows={false} style={{backgroundColor:c.surface}} onMessage={event=>{
        try{const value=JSON.parse(event.nativeEvent.data);if(value.type==="ready")setReady(true);else if(value.type==="point" && validPlacePoint(value))void choosePoint({latitude:value.latitude,longitude:value.longitude});else if(value.type==="error")setMapError(true);}catch{setMapError(true);}
      }} onError={()=>setMapError(true)} onShouldStartLoadWithRequest={request=>{if(request.url==="about:blank"||request.url.startsWith("https://vibes.gurudevelopers.dev/maps/"))return true;if(request.url.startsWith("https://www.openstreetmap.org/"))void Linking.openURL(request.url);return false;}}/> : <View style={s.fallback}><Text style={s.hint}>No se pudo cargar el mapa. Podés conservar la dirección escrita.</Text><TouchableOpacity accessibilityRole="button" style={s.icon} onPress={()=>{setReady(false);setMapError(false);setReload(value=>value+1);}}><Text style={s.link}>Reintentar</Text></TouchableOpacity></View>}
      {!mapError && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Usar mi ubicación para el lugar" style={s.locate} disabled={busy} onPress={async()=>{
        const current=++version.current;setBusy(true);setError("");
        try{const permission=await ExpoLocation.requestForegroundPermissionsAsync();if(permission.status!=="granted")throw Error("permission");const position=await ExpoLocation.getCurrentPositionAsync({accuracy:ExpoLocation.Accuracy.Balanced});if(current===version.current)await choosePoint({latitude:position.coords.latitude,longitude:position.coords.longitude});}
        catch{if(current===version.current)setError("No pudimos obtener tu ubicación. Buscá una dirección o elegí el punto en el mapa.");}
        finally{setBusy(false);}
      }}><Icon name="locate-outline" size={24} color={c.accentBlue}/></TouchableOpacity>}
    </View>
    <Text style={s.hint}>Mové el mapa o tocá una calle para elegir el punto del lugar.</Text>
    {point && <View style={s.summary}><Icon name="location" size={24} color={c.accentBlue}/><View style={{flex:1,gap:4}}><Text style={s.label}>{address.split(",")[0] || "Ubicación elegida"}</Text><Text style={s.hint}>{address.split(",").slice(1).join(",").trim() || "Punto elegido en el mapa"}</Text></View></View>}
    {!!error && <Text accessibilityRole="alert" style={s.hint}>{error}</Text>}
  </View>;
}
const s=StyleSheet.create({
  label:{fontFamily:vibesTheme.fonts.semibold,fontSize:14,lineHeight:20,color:c.primaryText},hint:{fontFamily:vibesTheme.fonts.regular,fontSize:13,lineHeight:18,color:c.secondaryText},
  input:{minHeight:48,borderRadius:16,borderWidth:1,borderColor:`${c.primaryText}1F`,paddingLeft:12,flexDirection:"row",alignItems:"center",gap:8},textInput:{flex:1,minWidth:0,minHeight:48,fontFamily:vibesTheme.fonts.regular,fontSize:16,lineHeight:24,color:c.primaryText},icon:{minWidth:44,minHeight:44,justifyContent:"center",alignItems:"center"},
  link:{fontFamily:vibesTheme.fonts.semibold,fontSize:14,lineHeight:20,color:c.accentBlue},searchButton:{minHeight:44,justifyContent:"center"},map:{height:240,borderRadius:16,overflow:"hidden",borderWidth:1,borderColor:`${c.primaryText}1F`,backgroundColor:c.surface},
  locate:{position:"absolute",right:12,bottom:28,width:44,height:44,borderRadius:22,backgroundColor:c.surface,borderWidth:1,borderColor:`${c.primaryText}1F`,alignItems:"center",justifyContent:"center"},
  summary:{padding:12,gap:10,flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:`${c.primaryText}1F`,borderRadius:16},fallback:{flex:1,padding:16,gap:12,alignItems:"center",justifyContent:"center"},
});
