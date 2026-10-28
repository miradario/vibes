import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { vibesTheme } from "../src/theme/vibesTheme";
export default function ActiveCommunityFilters({ selected, onRemove, onClear, style }: {
 selected: readonly string[]; onRemove:(community:string)=>void; onClear:()=>void; style?:StyleProp<ViewStyle>;
}) {
 if(!selected.length)return null;
 return <View style={[s.row,style]}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.chips}>
   <Text style={s.label}>Comunidad:</Text>
   {selected.map(community=><TouchableOpacity key={community} accessibilityRole="button" accessibilityLabel={`Quitar filtro de comunidad: ${community}`} onPress={()=>onRemove(community)} style={s.chip}>
    <Text style={s.text}>{community}</Text><Icon name="close" size={17} color={vibesTheme.colors.primaryText}/>
   </TouchableOpacity>)}
  </ScrollView>
  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quitar todos los filtros de comunidad" onPress={onClear} style={s.clear}><Text style={s.clearText}>Limpiar</Text></TouchableOpacity>
 </View>;
}
const c=vibesTheme.colors;
const s=StyleSheet.create({row:{flexDirection:"row",alignItems:"center",gap:8,paddingVertical:4},scroll:{flex:1,minWidth:0},chips:{alignItems:"center",gap:8,paddingRight:4},label:{fontFamily:vibesTheme.fonts.medium,fontSize:13,lineHeight:18,color:c.secondaryText},chip:{minHeight:44,flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:12,borderRadius:22,borderWidth:1,borderColor:`${c.accentBlue}4D`,backgroundColor:`${c.accentBlue}14`},text:{fontFamily:vibesTheme.fonts.semibold,fontSize:13,lineHeight:18,color:c.primaryText},clear:{minHeight:44,justifyContent:"center",paddingHorizontal:4},clearText:{fontFamily:vibesTheme.fonts.semibold,fontSize:13,lineHeight:18,color:c.primaryText,textDecorationLine:"underline"}});
