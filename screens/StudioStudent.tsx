import KeyboardViewport from "../components/KeyboardViewport";
import { useLearningData } from "../src/learning/queries";
import { isVisibleClassTeacher } from "../src/learning/visibleTeachers";
import React, { useState } from "react";
import { Switch, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Page, Button, Chips, Empty, Field, ui } from "../components/learning/LearningUI";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import { Text } from "../components/Typography";
import { useStudioStudentQuery, useStudioStudentMutation } from "../src/learning/studioStudentQueries";
import { studioCanCancel, studioCreditBalance, studioStudentError, type StudioBooking, type StudioContact } from "../src/learning/studioStudent";
import * as ds from "../src/theme/tokens";
const bookingLabel={confirmed:"Confirmada",waitlist:"Lista de espera",cancelled:"Cancelada"};
const orderLabel={pending:"Pendiente",paid:"Acreditado",refunded:"Reintegrado",cancelled:"Cancelado"};
export default function StudioStudentScreen() {
  const query=useStudioStudentQuery();
  const learning=useLearningData();
  const mutation=useStudioStudentMutation();
  const navigation=useNavigation<any>();
  const [tab,setTab]=useState("agenda");
  const [organizer,setOrganizer]=useState("");
  const [date,setDate]=useState("");
  const [cancel,setCancel]=useState<StudioBooking|null>(null);
  const data=query.data;
  const now=Date.now();
  const organizers=[...new Map((data?.activities??[]).map(item=>[item.organizer_id,item.organizer_name??"Estudio"])).entries()];
  const teacherIds=new Set((learning.data?.profiles??[]).filter(profile=>profile.kind==="teacher"&&isVisibleClassTeacher(profile.name)).map(profile=>profile.id));
  const sessions=(data?.sessions??[]).filter(session=>{
    const activity=data?.activities.find(item=>item.id===session.activity_id);
    return activity&&activity.teacher_ids.some(id=>teacherIds.has(id))&&Date.parse(session.starts_at)>now&&(!organizer||activity.organizer_id===organizer);
  }).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
  const dayKey=(iso:string,timezone:string)=>new Date(iso).toLocaleDateString("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"});
  const days=[...new Set(sessions.map(session=>dayKey(session.starts_at,data!.activities.find(item=>item.id===session.activity_id)!.timezone)))].sort();
  const activeDay=days.includes(date)?date:days[0];
  const bookings=(data?.bookings??[]).filter(item=>tab==="history" ? item.status==="cancelled"||Date.parse(item.ends_at)<=now : item.status!=="cancelled"&&Date.parse(item.ends_at)>now).sort((a,b)=>tab==="history"?Date.parse(b.starts_at)-Date.parse(a.starts_at):Date.parse(a.starts_at)-Date.parse(b.starts_at));
  const label=(iso:string,timezone="America/Argentina/Buenos_Aires")=>new Date(iso).toLocaleString("es-AR",{timeZone:timezone,weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  return <KeyboardViewport style={{flex:1}}><Page title="Mis clases">
    <Button secondary label={query.isFetching?"Actualizando…":"Actualizar agenda"} disabled={query.isFetching||mutation.isPending} onPress={()=>void query.refetch()} />
    {query.isLoading ? <Text style={ui.muted}>Cargando tu agenda…</Text> : null}
    {query.isError ? <Text accessibilityRole="alert" style={ui.body}>{studioStudentError(query.error)}</Text> : null}
    {mutation.isError ? <Text accessibilityRole="alert" style={ui.body}>{studioStudentError(mutation.error)}</Text> : null}
    {data ? <>
      <View style={ui.notice}><Text style={ui.title}>{studioCreditBalance(data.orders)} créditos disponibles</Text><Text style={ui.muted}>Cada pack pertenece a su estudio y conserva su vencimiento.</Text></View>
      <Chips value={tab} onChange={setTab} options={[{value:"agenda",label:"Reservar"},{value:"bookings",label:"Mis reservas"},{value:"history",label:"Historial"},{value:"packs",label:"Mis packs"},{value:"routines",label:"Rutinas"},{value:"contact",label:"Avisos"}]} />
      {tab==="agenda" ? <>
        <Chips value={organizer} onChange={setOrganizer} options={[{value:"",label:"Todos los estudios"},...organizers.map(([value,name])=>({value,label:name}))]} />
        {days.length ? <Chips value={activeDay??""} onChange={setDate} options={days.map(value=>({value,label:new Date(value+"T12:00:00").toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"})}))} /> : null}
        {sessions.filter(session=>dayKey(session.starts_at,data.activities.find(item=>item.id===session.activity_id)!.timezone)===activeDay).map(session=>{
          const activity=data.activities.find(item=>item.id===session.activity_id)!;
          return <View key={session.id} style={ui.card}><Text style={ui.title}>{activity.title}</Text><Text style={ui.body}>{label(session.starts_at,activity.timezone)}</Text><Text style={ui.muted}>{activity.organizer_name}{activity.location?` · ${activity.location}`:""}</Text><Text style={ui.muted}>Cancelación hasta {activity.cancellation_hours} horas antes{activity.waitlist_enabled?" · Lista de espera disponible":""}.</Text><Button label="Elegir este encuentro" onPress={()=>navigation.navigate("LearningReservation",{id:activity.id,sessionId:session.id})} /></View>;
        })}
        {!sessions.length ? <Empty text="No hay próximos encuentros para estos filtros." /> : null}
      </> : null}
      {tab==="bookings"||tab==="history" ? <>
        {bookings.map(booking=><View key={booking.id} style={ui.card}><Text style={ui.title}>{booking.title}</Text><Text style={ui.body}>{label(booking.starts_at,booking.timezone)}</Text><Text style={ui.muted}>{bookingLabel[booking.status]}{booking.present===true?" · Asistencia registrada":booking.present===false?" · Ausencia registrada":""}</Text>
          {tab==="bookings"&&studioCanCancel(booking) ? <Button secondary label={booking.status==="waitlist"?"Salir de la lista de espera":"Cancelar reserva"} disabled={mutation.isPending} onPress={()=>setCancel(booking)} /> : null}
          {tab==="bookings"&&!studioCanCancel(booking) ? <Text style={ui.muted}>El plazo para cancelar ya terminó. Contactá al estudio.</Text> : null}
        </View>)}
        {!bookings.length ? <Empty text={tab==="history"?"Todavía no hay encuentros en tu historial.":"Todavía no tenés reservas ni esperas próximas."} /> : null}
      </> : null}
      {tab==="packs" ? <>
        <Text style={ui.muted}>Saldo acreditado por cada estudio. Por ahora no se realizan compras ni cobros desde la app.</Text>
        {data.orders.map(order=><View key={order.id} style={ui.card}><Text style={ui.title}>{order.name}</Text><Text style={ui.body}>{order.remaining} de {order.credits} créditos · {orderLabel[order.status]}</Text><Text style={ui.muted}>{organizers.find(([id])=>id===order.organizer_id)?.[1]??"Estudio"}</Text><Text style={ui.muted}>{order.expires_at?`Vence ${label(order.expires_at)}`:"Vigencia desde la acreditación"}</Text>{order.status==="paid"&&order.expires_at&&Date.parse(order.expires_at)<=now?<Text style={ui.body}>Pack vencido</Text>:null}</View>)}
        {!data.orders.length ? <Empty text="Todavía no tenés packs acreditados." /> : null}
      </> : null}
      {tab==="routines" ? <>{data.routines.map(routine=><View key={routine.organizer_id} style={ui.card}><Text style={ui.title}>{routine.organizer_name}</Text><Text style={ui.body}>{routine.routine}</Text><Text style={ui.muted}>Actualizada: {label(routine.updated_at)}</Text></View>)}{!data.routines.length?<Empty text="Las rutinas que comparta tu profesor van a aparecer acá."/>:null}</> : null}
      {tab==="contact" ? <>{organizers.map(([id,name])=><StudentContact key={id} organizer={id} name={name} contact={data.contacts.find(item=>item.organizer_id===id)} />)}{!organizers.length?<Empty text="Todavía no hay estudios disponibles."/>:null}</> : null}
    </> : null}
    <Button secondary label="Inscripciones y solicitudes anteriores" onPress={()=>navigation.navigate("LearningLegacyMine")} />
    <AnimatedSheetModal visible={!!cancel} onClose={()=>{if(!mutation.isPending)setCancel(null);}} closeOnBackdropPress={!mutation.isPending} sheetStyle={ui.sheet}>
      <Text style={ui.title}>{cancel?.status==="waitlist"?"Salir de la espera":"Cancelar reserva"}</Text><Text style={ui.body}>Vas a liberar tu lugar en {cancel?.title}. Si usaste un crédito, se devolverá según las condiciones de tu pack.</Text>
      <Button label={mutation.isPending?"Guardando…":"Confirmar cancelación"} disabled={mutation.isPending||!cancel} onPress={()=>{if(cancel)void mutation.mutateAsync({action:"cancel",id:cancel.id}).then(()=>setCancel(null)).catch(()=>setCancel(null));}} />
      <Button secondary label="Volver" disabled={mutation.isPending} onPress={()=>setCancel(null)} />
    </AnimatedSheetModal>
  </Page></KeyboardViewport>;
}
function StudentContact({organizer,name,contact}:{organizer:string;name:string;contact?:StudioContact}) {
  const mutation=useStudioStudentMutation();
  const [phone,setPhone]=useState(contact?.phone??"");
  const [optIn,setOptIn]=useState(contact?.whatsapp_opt_in??false);
  const [saved,setSaved]=useState(false);
  return <View style={ui.card}><Text style={ui.title}>{name}</Text><Field label="Teléfono con código de país" value={phone} onChange={value=>{setPhone(value.replace(/\D/g,"").slice(0,15));setSaved(false);}} hint="Solo dígitos. Ejemplo: 5491112345678." />
    <View style={ui.row}><View style={ui.grow}><Text style={ui.body}>Acepto recibir avisos de este estudio por WhatsApp</Text></View><Switch accessibilityLabel={`Recibir avisos de ${name} por WhatsApp`} value={optIn} onValueChange={value=>{setOptIn(value);setSaved(false);}} trackColor={{false:ds.colors.bg.subtle,true:ds.colors.base.mustard}} thumbColor={ds.colors.bg.surface} /></View>
    <Button label={mutation.isPending?"Guardando…":"Guardar preferencias"} disabled={mutation.isPending||(optIn&&phone.length<8)} onPress={()=>void mutation.mutateAsync({action:"contact",id:organizer,data:{phone,whatsapp_opt_in:optIn}}).then(()=>setSaved(true)).catch(()=>{})} />
    {saved?<Text accessibilityLiveRegion="polite" style={ui.body}>Preferencias guardadas.</Text>:null}{mutation.isError?<Text accessibilityRole="alert" style={ui.body}>{studioStudentError(mutation.error)}</Text>:null}
  </View>;
}
