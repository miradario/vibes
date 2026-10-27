import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import { vibesTheme } from "../../src/theme/vibesTheme";
import type { LearningSession } from "../../src/learning/types";
import { ui } from "./LearningUI";
export default function ClassMeetingSummary({sessions,timezone}:{sessions:LearningSession[];timezone:string}) {
  const [expanded,setExpanded]=useState(false);
  const slots=[...new Set(sessions.map(session=>`${new Date(session.starts_at).toLocaleString("es-AR",{timeZone:timezone,weekday:"long",hour:"2-digit",minute:"2-digit",hour12:false})}–${new Date(session.ends_at).toLocaleTimeString("es-AR",{timeZone:timezone,hour:"2-digit",minute:"2-digit",hour12:false})}`))];
  return <View style={ui.card}>
    <Text style={ui.title}>Días y horarios</Text>
    {slots.map(slot=><Text key={slot} style={ui.body}>{slot}</Text>)}
    <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={expanded ? "Ocultar fechas de la clase" : "Ver todas las fechas de la clase"} style={{minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"space-between"}} onPress={()=>setExpanded(value=>!value)}><Text style={ui.chipText}>{sessions.length} {sessions.length===1 ? "encuentro programado" : "encuentros programados"}</Text><Icon name={expanded ? "chevron-up" : "chevron-down"} size={20} color={vibesTheme.colors.primaryText}/></TouchableOpacity>
    {expanded && sessions.map(session=><Text key={session.id} style={ui.muted}>{new Date(session.starts_at).toLocaleString("es-AR",{timeZone:timezone,weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false})}</Text>)}
  </View>;
}
