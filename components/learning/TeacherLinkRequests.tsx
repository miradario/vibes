import React, { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuthSession } from "../../src/auth/auth.queries";
import { useLearningEnabled } from "../../src/featureFlags/useLearningEnabled";
import { learningRpc } from "../../src/learning/queries";
import { Text } from "../Typography";
import { Button, ui, useLearningAction } from "./LearningUI";
type TeacherRequest = {id:string;profile_id:string;sender_id:string;recipient_id:string;status:"pending"|"accepted"|"rejected"|"cancelled";name:string;description:string;specialties:string[];sender_name:string;recipient_name:string};
export default function TeacherLinkRequests() {
  const {data:session}=useAuthSession();
  const enabled=useLearningEnabled();
  const action=useLearningAction();
  const query=useQuery({queryKey:["learning",session?.user.id,"teacherRequests"],queryFn:()=>learningRpc<TeacherRequest[]>("teacher_requests"),enabled:enabled && !!session?.user.id});
  useFocusEffect(useCallback(()=>{if(enabled && session?.user.id) void query.refetch();},[enabled,session?.user.id,query.refetch]));
  if(query.isError) return <Button secondary label="Reintentar cargar vinculaciones" onPress={()=>void query.refetch()}/>;
  if(!query.data?.length) return null;
  return <>
    <Text style={ui.title}>Vinculaciones de profesores</Text>
    {query.data.map(request => {
      const incoming=request.recipient_id===session?.user.id;
      return <View key={request.id} style={ui.card}>
        <Text style={ui.title}>{request.name}</Text>
        <Text style={ui.muted}>{incoming ? `${request.sender_name} quiere vincular esta ficha a tu cuenta.` : `Solicitud para ${request.recipient_name}`}</Text>
        {!!request.description && <Text style={ui.body}>{request.description}</Text>}
        {!!request.specialties.length && <Text style={ui.muted}>{request.specialties.join(" · ")}</Text>}
        <Text style={ui.body}>{({pending:"Pendiente de aceptación",accepted:"Vinculación aceptada",rejected:"Solicitud rechazada",cancelled:"Solicitud cancelada"})[request.status]}</Text>
        {request.status === "pending" && <>
          {incoming && <Button label="Aceptar vinculación" disabled={action.pending} onPress={()=>action.confirm({name:"respond_teacher",args:{p_id:request.id,p_status:"accepted"},text:"Esta ficha se vinculará a tu cuenta. Vos y quien la creó podrán administrarla. Seguirá como borrador hasta que decidan publicarla.",success:"Vinculación aceptada. La ficha está disponible en Mi espacio."})}/>}
          <Button secondary label={incoming ? "Rechazar" : "Cancelar solicitud"} disabled={action.pending} onPress={()=>action.confirm({name:"respond_teacher",args:{p_id:request.id,p_status:incoming ? "rejected" : "cancelled"},text:incoming ? "Vas a rechazar esta vinculación. No se asociará la ficha a tu cuenta." : "Vas a cancelar esta solicitud de vinculación.",success:"Solicitud actualizada."})}/>
        </>}
      </View>;
    })}
    {action.elements}
  </>;
}
