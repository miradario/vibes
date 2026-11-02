import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { vibesTheme } from "../src/theme/vibesTheme";
import { chipHitSlop, chipRemoveIcon, chipStyles } from "./ui/chipStyles";
import * as ds from "../src/theme/tokens";
export default function ActiveCommunityFilters({ selected, onRemove, onClear, style }: {
 selected: readonly string[]; onRemove:(community:string)=>void; onClear:()=>void; style?:StyleProp<ViewStyle>;
}) {
 if(!selected.length)return null;
 return <View style={[s.row,style]}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.chips}>
   <Text style={s.label}>Comunidad:</Text>
   {selected.map(community=><TouchableOpacity key={community} accessibilityRole="button" accessibilityLabel={`Quitar filtro de comunidad: ${community}`} onPress={()=>onRemove(community)} hitSlop={chipHitSlop} style={s.chip}>
    <Text style={s.text}>{community}</Text><Icon name="close" size={chipRemoveIcon.size} color={chipRemoveIcon.color}/>
   </TouchableOpacity>)}
  </ScrollView>
  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quitar todos los filtros de comunidad" onPress={onClear} style={s.clear}><Text style={s.clearText}>Limpiar</Text></TouchableOpacity>
 </View>;
}
const c=vibesTheme.colors;
const s=StyleSheet.create({row:{flexDirection:"row",alignItems:"center",gap:ds.spacing[2],paddingVertical:ds.spacing[1]},scroll:{flex:1,minWidth:0},chips:{alignItems:"center",gap:ds.spacing[2],paddingRight:ds.spacing[1]},label:{...ds.textStyles.labelMedium,color:c.secondaryText},chip:{...chipStyles.base,...chipStyles.selected},text:{...chipStyles.label},clear:{minHeight:44,justifyContent:"center",paddingHorizontal:ds.spacing[1]},clearText:{...ds.textStyles.label,color:c.primaryText,textDecorationLine:"underline"}});
