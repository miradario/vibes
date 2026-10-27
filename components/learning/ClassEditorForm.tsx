import React, { useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "../Typography";
import Icon from "../Icon";
import ScreenContainer from "../ScreenContainer";
import AnimatedSheetModal from "../AnimatedSheetModal";
import { validPlacePoint } from "../../src/learning/placeMap";
import ClassLocationMap from "./ClassLocationMap";
import { Button, Field, ImageField, ui, useLearningAction } from "./LearningUI";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { classScheduleFromSessions, classScheduleSessions } from "../../src/learning/classSchedule";
import { learningError, modalityLabels, sessionsFor, wallDate } from "../../src/learning/utils";
import { RESERVATION_TIMEZONE, WEEKDAYS } from "../../src/learning/reservations";
import type { ActivityInput, LearningData, Modality } from "../../src/learning/types";
const c=vibesTheme.colors;
const WEEK=[1,2,3,4,5,6,0];
const shortDate=(value:string)=>value.split("-").reverse().join("/");
const pad=(value:number)=>String(value).padStart(2,"0");
function ScheduleField({label,value,onChange,date=false,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;date?:boolean;disabled?:boolean}) {
  const [open,setOpen]=useState(false);
  const parts=(date ? value : `2026-01-01`).split("-").map(Number);
  const time=(date ? "12:00" : value).split(":").map(Number);
  const tentative=new Date(parts[0]||2026,(parts[1]||1)-1,parts[2]||1,time[0]||0,time[1]||0);
  const current=Number.isFinite(tentative.getTime()) ? tentative : new Date();
  const apply=(selected:Date)=>onChange(date ? `${selected.getFullYear()}-${pad(selected.getMonth()+1)}-${pad(selected.getDate())}` : `${pad(selected.getHours())}:${pad(selected.getMinutes())}`);
  return <View style={s.grow}><Text style={s.label}>{label}</Text><View style={s.inputRow}>
    <TextInput accessibilityLabel={label} editable={!disabled} value={date ? shortDate(value) : value} placeholder={date ? "DD/MM/AAAA" : "HH:mm"} placeholderTextColor={c.secondaryText} onChangeText={text=>onChange(date ? text.split("/").reverse().join("-") : text)} style={s.fieldText}/>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Elegir ${label.toLowerCase()}`} disabled={disabled} onPress={()=>{if(Platform.OS==="android") DateTimePickerAndroid.open({value:current,mode:date ? "date" : "time",is24Hour:true,onChange:(event,selected)=>{if(event.type==="set" && selected) apply(selected);},positiveButton:{label:"Elegir",textColor:c.primaryText},negativeButton:{label:"Volver",textColor:c.primaryText}});else setOpen(true);}} style={s.iconButton}><Icon name={date ? "calendar-outline" : "time-outline"} size={22} color={c.secondaryText}/></TouchableOpacity>
  </View>
  {Platform.OS==="ios" && <AnimatedSheetModal visible={open} onClose={()=>setOpen(false)} sheetStyle={ui.sheet}><Text style={ui.title}>{label}</Text>{open && <DateTimePicker value={current} mode={date ? "date" : "time"} display="spinner" locale="es-AR" textColor={c.primaryText} onChange={(_,selected)=>{if(selected) apply(selected);}}/>}<Button label="Listo" onPress={()=>setOpen(false)}/></AnimatedSheetModal>}
  </View>;
}
export default function ClassEditorForm({data,id}:{data:LearningData;id?:string}) {
  const nav=useNavigation<any>(),insets=useSafeAreaInsets(),action=useLearningAction();
  const existing=data.activities.find(activity=>activity.id===id);
  const mine=data.profiles.filter(profile=>data.access.managed_ids.includes(profile.id));
  const zone=existing?.timezone ?? RESERVATION_TIMEZONE;
  const initial=existing ? sessionsFor(data,existing.id) : [];
  const pattern=classScheduleFromSessions(initial,zone);
  const tomorrow=wallDate(new Date(Date.now()+86400000).toISOString(),zone).slice(0,10);
  const [title,setTitle]=useState(existing?.title ?? ""),[image,setImage]=useState(existing?.image_url ?? ""),[imageBusy,setImageBusy]=useState(false);
  const [teachers,setTeachers]=useState(existing?.teacher_ids ?? mine.filter(profile=>profile.kind==="teacher").slice(0,1).map(profile=>profile.id));
  const [organizer,setOrganizer]=useState(existing?.organizer_id ?? mine.find(profile=>profile.kind==="teacher")?.id ?? mine[0]?.id ?? "");
  const [modality,setModality]=useState<Modality>(existing?.modality ?? "in_person");
  const [place,setPlace]=useState(existing?.place_id ?? ""),[location,setLocation]=useState(existing?.location ?? "");
  const [days,setDays]=useState(pattern?.days ?? []),[start,setStart]=useState(pattern?.start ?? "09:00"),[end,setEnd]=useState(pattern?.end ?? "10:00");
  const [from,setFrom]=useState(pattern?.from ?? tomorrow),[until,setUntil]=useState(pattern?.until ?? wallDate(new Date(Date.now()+90*86400000).toISOString(),zone).slice(0,10));
  const [capacity,setCapacity]=useState(String(existing?.capacity ?? 12)),[description,setDescription]=useState(existing?.description ?? "");
  const [modes,setModes]=useState<string[]>(existing?.booking_modes ?? ["single","monthly"]);
  const [more,setMore]=useState(false),[selector,setSelector]=useState<"teacher"|"place"|null>(null),[error,setError]=useState("");
  const [review,setReview]=useState<ActivityInput|null>(null),[savedId,setSavedId]=useState(id),[saving,setSaving]=useState(false);
  const saveGuard=useRef(false);
  const locked=!!existing?.schedule_locked;
  if(!mine.length || (id && (!existing || !data.access.managed_ids.includes(existing.organizer_id)))) return <Text style={ui.body}>No tenés permiso para editar esta clase.</Text>;
  if(existing && ["cancelled","completed"].includes(existing.status)) return <Text style={ui.body}>Esta clase está cerrada.</Text>;
  const teacherOptions=data.profiles.filter(profile=>profile.kind==="teacher" && (data.access.managed_ids.includes(profile.id) || (organizer===place && data.links.some(link=>link.teacher_id===profile.id && link.place_id===place))));
  const placeOptions=data.profiles.filter(profile=>profile.kind==="place" && (data.access.managed_ids.includes(profile.id) || teachers.every(teacher=>data.links.some(link=>link.teacher_id===teacher && link.place_id===profile.id))));
  const selectedPlace=data.profiles.find(profile=>profile.id===place);
  const selectedTeachers=data.profiles.filter(profile=>teachers.includes(profile.id));
  const profilesReady=[organizer,...teachers,...(modality!=="online" && place ? [place] : [])].every(profileId=>data.profiles.find(profile=>profile.id===profileId)?.published);
  const prepare=()=>{
    setError("");
    try {
      if(!title.trim()) throw Error("Completá el nombre de la clase.");
      if(!teachers.length || teachers.some(teacher=>!teacherOptions.some(profile=>profile.id===teacher))) throw Error("Elegí un profesor habilitado para esta clase.");
      if(!Number.isInteger(Number(capacity))||Number(capacity)<1) throw Error("Ingresá un cupo válido para cada clase.");
      if(!modes.length) throw Error("Elegí al menos una opción de inscripción.");
      if(modality!=="online" && !location.trim()) throw Error("Elegí un lugar o ingresá la dirección de la clase.");
      const sessions=locked ? initial.map(session=>({title:session.title,starts_at:new Date(session.starts_at).toISOString(),ends_at:new Date(session.ends_at).toISOString()})) : classScheduleSessions({days,start,end,from,until,timezone:zone,title});
      setReview({organizer_id:organizer,kind:"class",title:title.trim(),description,image_url:image||null,teacher_ids:teachers,place_id:locked ? existing!.place_id : modality==="online" ? null : place||null,modality,location:locked ? existing!.location : modality==="online" ? "" : location.trim(),timezone:zone,capacity:Number(capacity),price:existing?.price ?? 0,currency:existing?.currency ?? "ARS",sessions,booking_modes:modes});
    }catch(cause){setError(learningError(cause));}
  };
  const persist=async(publish:boolean)=>{
    if(!review || saveGuard.current) return;
    saveGuard.current=true;setSaving(true);
    try {
      let resultId=savedId;
      const saved=await action.run("save_activity",{p_id:savedId ?? null,p_data:review},"Borrador guardado.",result=>{resultId=String(result);setSavedId(resultId);});
      if(!saved) return;
      if(publish){const published=await action.run("set_status",{p_id:resultId,p_status:"published"},"Clase publicada. Ya está disponible en el listado.");if(!published) return;}
      setReview(null);
      nav.replace("LearningManage");
    } finally {saveGuard.current=false;setSaving(false);}
  };
  const addProfile=(kind:"teacher"|"place")=>{setSelector(null);nav.navigate("LearningProfileEditor",{initialKind:kind,publishByDefault:true});};
  return <ScreenContainer style={{flex:1,backgroundColor:c.background}} edges={["top","left","right"]}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,gap:16,paddingBottom:24}}>
    <View style={s.row}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" onPress={()=>nav.goBack()} style={s.iconButton}><Icon name="chevron-back" size={28} color={c.accentBlue}/></TouchableOpacity><Text style={[ui.heading,{flex:1}]}>{id ? "Editar clase" : "Nueva clase"}</Text></View>
    {locked && <Text style={s.hint}>Esta clase ya tiene solicitudes. Se conservan los días, horarios, profesores y lugar.</Text>}
    <Field label="Nombre de la clase *" value={title} onChange={setTitle}/>
    <ImageField compact rectangular label="Foto de la clase" value={image} onChange={setImage} onBusy={setImageBusy}/>
    <Text style={s.label}>Profesor *</Text>
    {selectedTeachers.map(teacher=><TouchableOpacity key={teacher.id} accessibilityRole="button" accessibilityLabel={`Cambiar profesor ${teacher.name}`} disabled={locked} style={[s.card,s.selected]} onPress={()=>setSelector("teacher")}><View style={s.avatar}><Text style={s.initials}>{teacher.name.split(" ").map(part=>part[0]).join("").slice(0,2).toUpperCase()}</Text></View><View style={s.grow}><Text style={s.cardTitle}>{teacher.name}</Text><Text style={s.hint}>{teacher.account_user_id ? "Cuenta de Vibes vinculada" : "Ficha administrada"}{teacher.published ? "" : " · Borrador"}</Text></View><Icon name="chevron-forward" size={22} color={c.secondaryText}/></TouchableOpacity>)}
    {!teachers.length && <Button secondary label="Elegir profesor" disabled={locked} onPress={()=>setSelector("teacher")}/>}
    {!locked && <TouchableOpacity accessibilityRole="button" onPress={()=>addProfile("teacher")} style={s.add}><Icon name="add" size={22} color={c.accentBlue}/><Text style={s.addText}>Agregar profesor</Text></TouchableOpacity>}
    <Text style={s.label}>Modalidad *</Text>
    <View style={s.row}>{(["in_person","online","mixed"] as Modality[]).map(value=><TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{checked:modality===value,disabled:locked}} disabled={locked} onPress={()=>setModality(value)} style={[s.mode,modality===value && s.selected]}><Icon name={value==="in_person" ? "location-outline" : value==="online" ? "videocam-outline" : "people-outline"} size={20} color={c.primaryText}/><Text style={s.modeText}>{value==="mixed" ? "Mixta" : modalityLabels[value]}</Text></TouchableOpacity>)}</View>
    {modality!=="online" && <>
      <Text style={s.label}>Lugar *</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Elegir lugar de la clase" disabled={locked} style={s.card} onPress={()=>setSelector("place")}><View style={s.avatar}><Icon name="location" size={24} color={c.accentBlue}/></View><View style={s.grow}><Text style={s.cardTitle}>{selectedPlace?.name ?? "Elegir lugar"}</Text><Text style={s.hint}>{selectedPlace?.location ?? "Seleccioná una ficha o ingresá la dirección"}</Text></View><Icon name="chevron-forward" size={22} color={c.secondaryText}/></TouchableOpacity>
      {!place && <Field label="Dirección *" value={location} onChange={setLocation} editable={!locked}/>}
      {!!location.trim() && (validPlacePoint(selectedPlace) || /\d/.test(location)) && <ClassLocationMap key={location} address={location} point={validPlacePoint(selectedPlace) ? selectedPlace : null}/>}
      {!!selectedPlace?.location_details && <Text style={s.hint}>{selectedPlace.location_details}</Text>}
      {!locked && <TouchableOpacity accessibilityRole="button" style={s.add} onPress={()=>addProfile("place")}><Icon name="add" size={22} color={c.accentBlue}/><Text style={s.addText}>Agregar lugar</Text></TouchableOpacity>}
    </>}
    <Text style={s.label}>Días y horario *</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.week}>{WEEK.map(day=><TouchableOpacity key={day} accessibilityRole="checkbox" accessibilityLabel={WEEKDAYS[day]} accessibilityState={{checked:days.includes(day),disabled:locked}} disabled={locked} onPress={()=>setDays(value=>value.includes(day) ? value.filter(item=>item!==day) : [...value,day])} style={[s.day,days.includes(day) && s.daySelected]}><Text style={s.dayText}>{WEEKDAYS[day][0]}</Text></TouchableOpacity>)}</ScrollView>
    <Text style={s.hint}>{WEEK.filter(day=>days.includes(day)).map(day=>WEEKDAYS[day]).join(" y ") || "Elegí los días de la clase"}</Text>
    <View style={s.row}><ScheduleField label="Desde" value={start} onChange={setStart} disabled={locked}/><ScheduleField label="Hasta" value={end} onChange={setEnd} disabled={locked}/></View>
    <View style={s.row}><ScheduleField label="Inicio" value={from} onChange={setFrom} date disabled={locked}/><View style={s.grow}><Field label="Cupo por clase" value={capacity} onChange={setCapacity} keyboardType="numeric"/></View></View>
    <ScheduleField label="Fechas hasta" value={until} onChange={setUntil} date disabled={locked}/>
    <Text style={s.hint}>Se crearán encuentros hasta el {shortDate(until)}. Podés cambiar la fecha final antes de publicar.</Text>
    <Text style={s.label}>Opciones de inscripción</Text>
    <View style={s.row}>{[{value:"single",label:"Clase suelta"},{value:"monthly",label:"Plan mensual"}].map(option=><TouchableOpacity key={option.value} accessibilityRole="checkbox" accessibilityState={{checked:modes.includes(option.value),disabled:locked}} disabled={locked} onPress={()=>setModes(values=>values.includes(option.value) ? values.filter(value=>value!==option.value) : [...values,option.value])} style={s.check}><Icon name={modes.includes(option.value) ? "checkbox" : "square-outline"} size={24} color={c.accentBlue}/><Text style={s.modeText}>{option.label}</Text></TouchableOpacity>)}</View>
    <Text style={s.hint}>Sin cobros. Las solicitudes quedan pendientes de confirmación.</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:more}} style={s.card} onPress={()=>setMore(value=>!value)}><Text style={[s.cardTitle,{flex:1}]}>Descripción y más opciones</Text><Icon name={more ? "chevron-up" : "chevron-down"} size={22} color={c.secondaryText}/></TouchableOpacity>
    {more && <>
      <Field label="Descripción" value={description} onChange={setDescription} multiline/>
      <Text style={s.hint}>Horarios de {zone}. Máximo 100 encuentros por clase.</Text>
      <Text style={s.label}>Perfil responsable</Text>
      {mine.map(profile=><TouchableOpacity key={profile.id} accessibilityRole="radio" accessibilityState={{checked:organizer===profile.id,disabled:!!id}} disabled={!!id} style={[s.card,organizer===profile.id && s.selected]} onPress={()=>setOrganizer(profile.id)}><Text style={s.cardTitle}>{profile.name}</Text></TouchableOpacity>)}
    </>}
    {!!error && <Text accessibilityRole="alert" style={ui.body}>{error}</Text>}
    <AnimatedSheetModal visible={selector!==null} onClose={()=>setSelector(null)} sheetStyle={[ui.sheet,{paddingBottom:24+insets.bottom}]}>
      <Text style={ui.title}>{selector==="teacher" ? "Elegir profesor" : "Elegir lugar"}</Text>
      <ScrollView style={{flexGrow:0,flexShrink:1}} contentContainerStyle={{gap:8}}>
        {(selector==="teacher" ? teacherOptions : placeOptions).map(profile=><TouchableOpacity key={profile.id} accessibilityRole={selector==="teacher" ? "checkbox" : "radio"} accessibilityState={{checked:selector==="teacher" ? teachers.includes(profile.id) : place===profile.id}} style={[s.card,(selector==="teacher" ? teachers.includes(profile.id) : place===profile.id) && s.selected]} onPress={()=>{if(selector==="teacher") setTeachers(values=>values.includes(profile.id) ? values.filter(value=>value!==profile.id) : [...values,profile.id]);else {setPlace(profile.id);setLocation(profile.location);setSelector(null);}}}><Text style={[s.cardTitle,{flex:1}]}>{profile.name}</Text>{(selector==="teacher" ? teachers.includes(profile.id) : place===profile.id) && <Icon name="checkmark" size={20} color={c.primaryText}/>}</TouchableOpacity>)}
        {selector==="place" && <Button secondary label="Usar una dirección sin ficha" onPress={()=>{setPlace("");setSelector(null);}}/>}
      </ScrollView>
      <Button secondary label={selector==="teacher" ? "Agregar profesor" : "Agregar lugar"} onPress={()=>addProfile(selector ?? "teacher")}/>
      <Button label="Listo" onPress={()=>setSelector(null)}/>
    </AnimatedSheetModal>
    <AnimatedSheetModal visible={!!review} onClose={()=>{if(!saving)setReview(null);}} closeOnBackdropPress={!saving} sheetStyle={[ui.sheet,{paddingBottom:24+insets.bottom}]}>
      <Text style={ui.title}>Revisar clase</Text>
      <ScrollView style={{flexGrow:0,flexShrink:1}} contentContainerStyle={{gap:12}}>
        <Text style={s.cardTitle}>{review?.title}</Text><Text style={s.hint}>{selectedTeachers.map(teacher=>teacher.name).join(" · ")}</Text>
        <Text style={ui.body}>{modalityLabels[modality]}{modality!=="online" ? ` · ${location}` : ""}</Text>
        <Text style={ui.body}>{review?.sessions.length} encuentros · {capacity} alumnos por clase</Text>
        <Text style={ui.body}>{shortDate(from)} al {shortDate(until)} · {start}–{end}</Text>
        {review?.sessions.map(session=><Text key={session.starts_at} style={s.hint}>{new Date(session.starts_at).toLocaleString("es-AR",{timeZone:zone,weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",hour12:false})}</Text>)}
        <Text style={s.hint}>{modes.map(mode=>mode==="single" ? "Clase suelta" : "Plan mensual").join(" · ")} · Sin cobros</Text>
        {!profilesReady && <Text style={ui.body}>Para publicar, los perfiles de profesores, lugar y responsable deben estar publicados. Podés guardar el borrador y completarlos desde Mi espacio.</Text>}
        {action.elements}
      </ScrollView>
      <Button label={saving ? "Guardando…" : existing?.status==="published" ? "Guardar cambios" : "Publicar clase"} disabled={saving || !profilesReady} onPress={()=>void persist(existing?.status!=="published")}/>
      {existing?.status!=="published" && <Button secondary label="Guardar borrador" disabled={saving} onPress={()=>void persist(false)}/>}
      <Button secondary label="Volver a editar" disabled={saving} onPress={()=>setReview(null)}/>
    </AnimatedSheetModal>
    </ScrollView>
    <View style={[s.footer,{paddingHorizontal:16,paddingBottom:Math.max(insets.bottom,12)}]}><Text style={s.hint}>Se crearán fechas según los días elegidos.</Text><Button label={existing?.status==="published" ? "Revisar cambios" : "Revisar y publicar"} onPress={prepare} disabled={imageBusy || saving}/></View>
  </ScreenContainer>;
}
const s=StyleSheet.create({
  label:{fontFamily:vibesTheme.fonts.semibold,fontSize:14,lineHeight:20,color:c.primaryText},
  hint:{fontFamily:vibesTheme.fonts.regular,fontSize:13,lineHeight:18,color:c.secondaryText},
  row:{flexDirection:"row",gap:10,alignItems:"flex-start"},grow:{flex:1,gap:8,minWidth:0},
  card:{flexDirection:"row",alignItems:"center",gap:12,minHeight:64,padding:12,borderWidth:1,borderColor:`${c.primaryText}1F`,borderRadius:16},selected:{backgroundColor:`${c.accentBlue}14`,borderColor:c.accentBlue},
  cardTitle:{fontFamily:vibesTheme.fonts.semibold,fontSize:16,lineHeight:22,color:c.primaryText},
  avatar:{width:44,height:44,borderRadius:22,alignItems:"center",justifyContent:"center",backgroundColor:`${c.accentBlue}24`},initials:{fontFamily:vibesTheme.fonts.semibold,fontSize:16,color:c.primaryText},
  add:{flexDirection:"row",alignItems:"center",gap:8,minHeight:44},addText:{fontFamily:vibesTheme.fonts.medium,fontSize:16,lineHeight:22,color:c.accentBlue},
  mode:{flex:1,minHeight:48,padding:8,gap:6,flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:`${c.primaryText}1F`,borderRadius:12},modeText:{fontFamily:vibesTheme.fonts.medium,fontSize:14,lineHeight:20,color:c.primaryText},
  week:{flexDirection:"row",justifyContent:"space-between",gap:4},day:{width:44,height:44,borderRadius:22,alignItems:"center",justifyContent:"center",backgroundColor:`${c.secondaryText}0C`,borderWidth:1,borderColor:"transparent"},daySelected:{backgroundColor:c.accentBlue,borderColor:c.primaryText},dayText:{fontFamily:vibesTheme.fonts.semibold,fontSize:14,color:c.primaryText},
  inputRow:{flexDirection:"row",alignItems:"center",minHeight:48,borderWidth:1,borderColor:`${c.primaryText}1F`,borderRadius:16,paddingLeft:12},fieldText:{flex:1,minWidth:0,fontFamily:vibesTheme.fonts.regular,fontSize:16,lineHeight:24,color:c.primaryText},iconButton:{width:40,minHeight:48,alignItems:"center",justifyContent:"center"},
  check:{flex:1,flexDirection:"row",gap:8,alignItems:"center",minHeight:44},footer:{gap:8,paddingVertical:12,borderTopWidth:1,borderColor:c.borderSoft},
});
