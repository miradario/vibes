import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";
export default function ActiveCommunityFilters({ selected, onRemove, onClear, style }: {
 selected: readonly string[]; onRemove:(community:string)=>void; onClear:()=>void; style?:StyleProp<ViewStyle>;
}) {
 if(!selected.length)return null;
 return <View style={[s.row,style]}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.chips}>
   <Text style={s.label}>Comunidad:</Text>
   {selected.map(community=><TouchableOpacity key={community} accessibilityRole="button" accessibilityLabel={`Quitar filtro de comunidad: ${community}`} onPress={()=>onRemove(community)} style={s.chip}>
    <Text style={s.text}>{community}</Text><Icon name="close" size={ds.iconSize.sm} color={vibesTheme.colors.primaryText}/>
   </TouchableOpacity>)}
  </ScrollView>
  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quitar todos los filtros de comunidad" onPress={onClear} style={s.clear}><Text style={s.clearText}>Limpiar</Text></TouchableOpacity>
 </View>;
}
const c=vibesTheme.colors;
const s=StyleSheet.create({row:{flexDirection:"row",alignItems:"center",gap:ds.spacing[2],paddingVertical:ds.spacing[1]},scroll:{flex:1,minWidth:0},chips:{alignItems:"center",gap:ds.spacing[2],paddingRight:ds.spacing[1]},label:{...ds.textStyles.labelMedium,color:c.secondaryText},chip:{minHeight:44,flexDirection:"row",alignItems:"center",gap:ds.spacing[2],paddingHorizontal:ds.spacing[3],borderRadius:ds.radii.xl,borderWidth:1,borderColor:ds.withAlpha(ds.colors.base.blue, ds.opacity.scrim),backgroundColor:ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle)},text:{...ds.textStyles.label,color:c.primaryText},clear:{minHeight:44,justifyContent:"center",paddingHorizontal:ds.spacing[1]},clearText:{...ds.textStyles.label,color:c.primaryText,textDecorationLine:"underline"}});
