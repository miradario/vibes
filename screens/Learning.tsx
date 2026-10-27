import PlaceLocationPicker from "../components/learning/PlaceLocationPicker";
import { validPlacePoint, type PlacePoint } from "../src/learning/placeMap";
import ClassMeetingSummary from "../components/learning/ClassMeetingSummary";
import ClassEditorForm from "../components/learning/ClassEditorForm";
import TeacherLinkRequests from "../components/learning/TeacherLinkRequests";
import { useMatchesQuery } from "../src/queries/matches.queries";
import EventInviteSheet from "../components/EventInviteSheet";
import ClassLocationMap from "../components/learning/ClassLocationMap";
import ClassReservationPanel from "../components/learning/ClassReservationPanel";
import { useReservationRequests } from "../src/learning/reservationQueries";
import { reservationDateLabel } from "../src/learning/reservations";
import {ExternalClassCard, ExternalPlaceCard} from "../components/learning/ExternalCatalog";
import {externalClasses, externalPlaces, matchesExternalClass, matchesExternalPlace} from "../src/learning/externalCatalog";
import React, { useEffect, useState } from "react";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { Alert, View, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Text, TextInput } from "../components/Typography";
import Icon from "../components/Icon";
import { vibesTheme } from "../src/theme/vibesTheme";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import { useLearningData, useLearningRoster } from "../src/learning/queries";
import {
  formatSession,
  matchesActivity,
  modalityLabels,
  priceLabel,
  sessionsFor,
  statusLabels,
  wallDate,
  zonedDateToISO,
  learningError,
} from "../src/learning/utils";
import type {
  ActivityInput,
  LearningActivity,
  LearningData,
  LearningProfile,
  Modality,
} from "../src/learning/types";
import {
  ActivityCard,
  Button,
  Chips,
  Empty,
  Field,
  ImageField,
  LearningGate,
  Link,
  modalityOptions,
  Page,
  Photo,
  ProfileCard,
  ui,
  useLearningAction,
} from "../components/learning/LearningUI";
const useNav = () => useNavigation<any>();
const useId = () => (useRoute().params as { id?: string } | undefined)?.id;

export function LearningCreateAction() {
  const nav = useNav();
  const { data, isLoading, isError, refetch } = useLearningData();
  return <View style={{flexDirection:"row",gap:6}}>
    {<TouchableOpacity accessibilityRole="button" accessibilityLabel="Administrar mis clases" onPress={()=>nav.navigate("LearningManage")} style={explore.iconButton}><Icon name="folder-outline" size={22} color={vibesTheme.colors.primaryText}/></TouchableOpacity>}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Crear clase" accessibilityState={{busy:isLoading}} onPress={() => {
    if (isLoading) return;
    if (isError || !data) {
      Alert.alert("No pudimos comprobar tus permisos", "Volvé a intentar cargar la información.", [{text:"Cerrar",style:"cancel"},{text:"Reintentar",onPress:()=>{void refetch();}}]);
      return;
    }
    if (!data.access.can_create && !data.access.managed_ids.length) {
      Alert.alert("Crear clase", "Tu cuenta todavía no está habilitada como responsable de clases. Necesitás esa habilitación para crear y publicar una clase.");
      return;
    }
    nav.navigate(data.access.managed_ids.length ? "LearningActivityEditor" : "LearningProfileEditor", data.access.managed_ids.length ? undefined : { continueToClass: true });
  }} style={explore.iconButton}><Icon name="add" size={22} color={vibesTheme.colors.primaryText} /></TouchableOpacity></View>;
}

export function LearningExplore({ embedded = false }: { embedded?: boolean }) {
  const requests = useReservationRequests();
  const nav = useNav(),
    q = useLearningData();
  const [tab, setTab] = useState("activity"),
    [query, setQuery] = useState(""),
    [specialty, setSpecialty] = useState(""),
    [modality, setModality] = useState(""),
    [location, setLocation] = useState(""),
    [date, setDate] = useState(""),
    [filters, setFilters] = useState(false);
  return (
    <Page title="Clases y espacios" embedded={embedded}>
      <LearningGate query={q}>
        {(data) => {
          const availableClasses = data.activities.filter(activity => activity.status === "published" && sessionsFor(data, activity.id).some(session => Date.parse(session.ends_at) > Date.now()));
          const availableExternalClasses = externalClasses.filter(item => item.horarios_semanales.some(slot => Boolean(slot.hora_inicio)) || Boolean(item.proxima_fecha_confirmada));
          const teacherIds = new Set(availableClasses.flatMap(activity => activity.teacher_ids));
          const specs = Array.from(new Set([
            ...data.profiles.filter(profile => teacherIds.has(profile.id)).flatMap(profile => profile.specialties),
            ...availableExternalClasses.map(item => item.categoria),
          ])).sort();
          const availableModalities = modalityOptions.filter(option => availableClasses.some(activity => activity.modality === option.value || activity.modality === "mixed") || availableExternalClasses.some(item => option.value === "in_person" ? /presencial/i.test(item.modalidad) : option.value === "online" ? /online|distancia/i.test(item.modalidad) : /presencial/i.test(item.modalidad) && /online|distancia/i.test(item.modalidad)));
          const availableLocations = Array.from(new Set([...availableClasses.map(activity => activity.location), ...availableExternalClasses.map(item => {const place = externalPlaces.find(place => place.id === item.lugar_id); return place?.ubicacion.barrio || place?.ubicacion.ciudad || "";})].filter(Boolean))).sort();
          const availableDates = Array.from(new Set([...availableClasses.flatMap(activity => sessionsFor(data, activity.id).filter(session => Date.parse(session.starts_at) > Date.now()).map(session => wallDate(session.starts_at,activity.timezone).slice(0,10))), ...availableExternalClasses.flatMap(item => { const confirmed = item.proxima_fecha_confirmada as string | null; return confirmed ? [confirmed] : []; })])).sort();
          const activeFilters = [
            { key: "specialty", value: specialty, label: specialty, clear: () => setSpecialty("") },
            { key: "modality", value: modality, label: modalityLabels[modality as keyof typeof modalityLabels] ?? modality, clear: () => setModality("") },
            { key: "location", value: location, label: location, clear: () => setLocation("") },
            { key: "date", value: date, label: date ? new Date(`${date}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" }) : "", clear: () => setDate("") },
          ].filter(filter => Boolean(filter.value));
          const activities = availableClasses.filter((a) =>
            sessionsFor(data, a.id).length > 0 && matchesActivity(a, data, {
              query,
              specialty,
              modality,
              location,
              date,
            })
          );
          const listedExternalClasses = availableExternalClasses.filter(item =>
            (item.horarios_semanales.some(slot => Boolean(slot.hora_inicio)) || Boolean(item.proxima_fecha_confirmada)) &&
            matchesExternalClass(item, {query,specialty,location,modality,date}));
          const listedExternalPlaces = externalPlaces.filter(item => matchesExternalPlace(item,query,specialty));
          const enrolledIds = new Set(data.enrollments.filter(enrollment => enrollment.status === "confirmed").map(enrollment => enrollment.activity_id));
          const myClasses = activities.filter(activity => enrolledIds.has(activity.id));
          const requestedIds = new Set((requests.data ?? []).filter(request => request.status === "pending_confirmation" && request.starts_at.some(iso => Date.parse(iso) > Date.now())).map(request => request.source_id));
          const myRequestedClasses = listedExternalClasses.filter(item => requestedIds.has(item.id));
          const myRequestedActivities = activities.filter(activity => requestedIds.has(activity.id) && !enrolledIds.has(activity.id));
          const otherClasses = activities.filter(activity => !enrolledIds.has(activity.id) && !requestedIds.has(activity.id));
          const profiles = data.profiles.filter(
            (p) =>
              p.kind === tab &&
              p.published &&
              `${p.name} ${p.description} ${p.specialties.join(" ")}`
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase()) &&
              (!specialty || p.specialties.includes(specialty)) &&
              (!modality ||
                p.modality === modality ||
                p.modality === "mixed") &&
              p.location
                .toLocaleLowerCase()
                .includes(location.trim().toLocaleLowerCase()) &&
              (!date ||
                activities.some((a) =>
                  p.kind === "teacher"
                    ? a.teacher_ids.includes(p.id)
                    : a.place_id === p.id
                ))
          );
          return (
            <>
              {!embedded && <View style={explore.toolbar}><LearningCreateAction /></View>}
              <View style={explore.search}>
                <Icon name="search" size={20} color={vibesTheme.colors.secondaryText} />
                <TextInput accessibilityLabel="Buscar clases o lugares" placeholder="¿Qué te gustaría practicar?" placeholderTextColor={vibesTheme.colors.secondaryText} value={query} onChangeText={setQuery} style={explore.searchInput} returnKeyType="search" />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Filtrar clases" onPress={() => setFilters(true)} style={explore.clear}><Icon name="options-outline" size={22} color={vibesTheme.colors.primaryText} /></TouchableOpacity>
                {!!query && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setQuery("")} style={explore.clear}><Icon name="close" size={20} color={vibesTheme.colors.secondaryText} /></TouchableOpacity>}
              </View>
              <Chips value={tab} onChange={setTab} options={[
                {value:"activity",label:"Clases y cursos"}, {value:"place",label:"Lugares"}
              ]} />
              <Chips value={specialty} onChange={setSpecialty} options={[{value:"",label:"Todas las prácticas"},...specs.map(value=>({value,label:value}))]} />
              {!!activeFilters.length && <View accessibilityLabel="Filtros seleccionados" style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {activeFilters.map(filter => <TouchableOpacity key={filter.key} accessibilityRole="button" accessibilityLabel={`Quitar filtro ${filter.label}`} onPress={filter.clear} style={[explore.action, explore.activeFilter]}>
                  <Text style={[explore.actionLabel,{flexShrink:1}]}>{filter.label}</Text>
                  <Icon name="close" size={16} color={vibesTheme.colors.primaryText} />
                </TouchableOpacity>)}
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar filtros seleccionados" style={explore.action} onPress={() => {setSpecialty("");setModality("");setLocation("");setDate("");}}><Text style={explore.actionLabel}>Limpiar filtros</Text></TouchableOpacity>
              </View>}
              {tab === "activity" ? <>
                {myClasses.length + myRequestedClasses.length + myRequestedActivities.length > 0 ? <>
                <Text accessibilityRole="header" style={explore.sectionTitle}>Mis clases</Text>
                <Text style={explore.sectionHint}>Inscripciones y solicitudes pendientes</Text>
                {myRequestedActivities.map(activity => <ActivityCard key={activity.id} activity={activity} compact data={data} status="Solicitud pendiente" onPress={() => nav.navigate("LearningActivity", {id:activity.id})} />)}
                {myRequestedClasses.map(item => <View key={item.id}><ExternalClassCard item={item} onPress={() => nav.navigate("ExternalCatalogDetail", {id:item.id})} /><Text style={explore.sectionHint}>Pendiente de confirmación con el organizador</Text></View>)}
                {myClasses.map(activity => <ActivityCard key={activity.id} activity={activity} compact data={data} onPress={() => nav.navigate("LearningActivity", {id:activity.id})} />)}
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver todas mis clases y cursos" onPress={() => nav.navigate("LearningMine")} style={explore.mineLink}><Text style={explore.actionLabel}>Ver mis clases y cursos</Text><Icon name="chevron-forward" size={18} color={vibesTheme.colors.primaryText} /></TouchableOpacity>
                </> : null}
                {!!(otherClasses.length + listedExternalClasses.length) && <Text accessibilityRole="header" style={explore.sectionTitle}>Más clases</Text>}
                {otherClasses.map(activity => <ActivityCard key={activity.id} activity={activity} compact data={data} onPress={() => nav.navigate("LearningActivity", {id:activity.id})} />)}
                {listedExternalClasses.filter(item => !requestedIds.has(item.id)).map(item => <ExternalClassCard key={item.id} item={item} onPress={() => nav.navigate("ExternalCatalogDetail", {id:item.id})} />)}
              </> : <>
                <Text accessibilityRole="header" style={explore.sectionTitle}>Lugares para practicar</Text>
                {profiles.map(profile => <ProfileCard key={profile.id} profile={profile} onPress={() => nav.navigate("LearningProfile", {id:profile.id})} />)}
                {listedExternalPlaces.map(item => <ExternalPlaceCard key={item.id} item={item} onPress={() => nav.navigate("ExternalCatalogDetail", {id:item.id})} />)}
              </>}
              {(tab === "activity" ? activities.length + listedExternalClasses.length : profiles.length + listedExternalPlaces.length) === 0 && (
                <View style={explore.empty}>
                  <View style={explore.emptyIcon}><Icon name="school-outline" size={30} color={vibesTheme.colors.accentBlue} /></View>
                  <Text style={explore.emptyTitle}>{query || specialty || modality || location || date ? "No encontramos coincidencias" : tab === "activity" ? "Pronto, nuevas clases" : "Pronto, más propuestas"}</Text>
                  <Text style={explore.emptyBody}>{query || specialty || modality || location || date ? "Probá con otra búsqueda o ajustá los filtros." : "Volvé a explorar para descubrir nuevas prácticas y personas."}</Text>
                  <TouchableOpacity accessibilityRole="button" style={explore.action} onPress={() => {if(query || specialty || modality || location || date){setQuery("");setSpecialty("");setModality("");setLocation("");setDate("");}else void q.refetch();}}><Text style={explore.actionLabel}>{query || specialty || modality || location || date ? "Limpiar filtros" : "Actualizar"}</Text></TouchableOpacity>
                </View>
              )}
              <AnimatedSheetModal
                visible={filters}
                onClose={() => setFilters(false)}
                sheetStyle={ui.sheet}
              >
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 16 }}
                >
                  <Text style={ui.title}>Filtrar clases y perfiles</Text>
                  <Chips
                    value={modality}
                    onChange={setModality}
                    options={[
                      { value: "", label: "Todas" },
                      ...availableModalities,
                    ]}
                  />
                  {!!availableLocations.length && <><Text style={ui.body}>Ciudad o barrio</Text><Chips value={location} onChange={setLocation} options={[{value:"",label:"Todas"},...availableLocations.map(value=>({value,label:value}))]} /></>}
                  {!!availableDates.length && <><Text style={ui.body}>Fecha del encuentro</Text><Chips value={date} onChange={setDate} options={[{value:"",label:"Todas"},...availableDates.map(value=>({value,label:value}))]} /></>}
                  <Button
                    label="Ver resultados"
                    onPress={() => setFilters(false)}
                  />
                  <Button
                    label="Limpiar filtros"
                    secondary
                    onPress={() => {
                      setSpecialty("");
                      setModality("");
                      setLocation("");
                      setDate("");
                      setFilters(false);
                    }}
                  />
                </ScrollView>
              </AnimatedSheetModal>
            </>
          );
        }}
      </LearningGate>
    </Page>
  );
}

export function LearningProfileDetail() {
  const id = useId(),
    nav = useNav(),
    q = useLearningData();
  return (
    <Page title="Perfil">
      <LearningGate query={q}>
        {(data) => {
          const p = data.profiles.find((p) => p.id === id);
          if (!p) return <Empty text="Este perfil no está disponible." />;
          const activities = data.activities.filter(
            (a) =>
              a.status === "published" &&
              (a.teacher_ids.includes(p.id) || a.place_id === p.id)
          );
          const related = data.profiles.filter((r) =>
            data.links.some((l) =>
              p.kind === "teacher"
                ? l.teacher_id === p.id && l.place_id === r.id
                : l.place_id === p.id && l.teacher_id === r.id
            )
          );
          return (
            <>
              <Photo
                key={p.cover_url ?? p.image_url}
                url={p.cover_url ?? p.image_url}
                cover
              />
              <View style={ui.row}>
                <Photo key={p.image_url} url={p.image_url} />
                <View style={ui.grow}>
                  <Text style={ui.heading}>{p.name}</Text>
                  <Text style={ui.muted}>{p.specialties.join(" · ")}</Text>
                </View>
              </View>
              <Text style={ui.body}>{p.description}</Text>
              <Text style={ui.muted}>
                {modalityLabels[p.modality]}
                {p.location ? ` · ${p.location}` : ""}
              </Text>
              {!!p.location_details && <Text style={ui.muted}>{p.location_details}</Text>}
              {p.kind === "place" && (validPlacePoint(p) || /\d/.test(p.location)) && <ClassLocationMap key={p.location} address={p.location} point={validPlacePoint(p) ? p : null}/>}
              {data.access.managed_ids.includes(p.id) && (
                <Link
                  label="Editar perfil"
                  onPress={() =>
                    nav.navigate("LearningProfileEditor", { id: p.id })
                  }
                />
              )}
              <Text style={ui.title}>Clases y cursos disponibles</Text>
              {activities.length ? (
                activities.map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    data={data}
                    onPress={() =>
                      nav.navigate("LearningActivity", { id: a.id })
                    }
                  />
                ))
              ) : (
                <Empty text="Todavía no hay actividades publicadas." />
              )}
              <Text style={ui.title}>
                {p.kind === "teacher"
                  ? "Lugares donde enseña"
                  : "Profesores de este lugar"}
              </Text>
              {related.length ? (
                related.map((r) => (
                  <ProfileCard
                    key={r.id}
                    profile={r}
                    onPress={() =>
                      nav.navigate("LearningProfile", { id: r.id })
                    }
                  />
                ))
              ) : (
                <Empty text="Todavía no hay perfiles vinculados." />
              )}
            </>
          );
        }}
      </LearningGate>
    </Page>
  );
}

export function LearningActivityDetail() {
  const [inviteVisible, setInviteVisible] = useState(false);
  const id = useId(),
    nav = useNav(),
    q = useLearningData(),
    action = useLearningAction();
  return (
    <Page title={q.data?.activities.find(activity => activity.id === id)?.title ?? "Clase"}>
      <LearningGate query={q}>
        {(data) => {
          const a = data.activities.find((a) => a.id === id);
          if (!a) return <Empty text="Esta actividad no está disponible." />;
          const sessions = sessionsFor(data, a.id),
            e = data.enrollments.find((e) => e.activity_id === a.id),
            started =
              !sessions[0] || Date.parse(sessions[0].starts_at) <= Date.now();
          const mine = data.access.managed_ids.includes(a.organizer_id),
            paid = Number(a.price) > 0;
          return (
            <>
              <Photo key={a.image_url} url={a.image_url} cover />
              <Text style={ui.muted}>
                {a.kind === "course" ? "Curso completo" : "Clase"} ·{" "}
                {statusLabels[a.status]}
              </Text>
              {data.profiles
                .filter((p) => a.teacher_ids.includes(p.id))
                .map((p) => (
                  <Link
                    key={p.id}
                    label={`Con ${p.name} → Ver perfil`}
                    onPress={() =>
                      nav.navigate("LearningProfile", { id: p.id })
                    }
                  />
                ))}
              {a.place_id && (
                <Link
                  label={`${
                    data.profiles.find((p) => p.id === a.place_id)?.name ??
                    "Lugar"
                  } → Ver lugar`}
                  onPress={() =>
                    nav.navigate("LearningProfile", { id: a.place_id })
                  }
                />
              )}
              <Text style={ui.body}>
                {a.modality === "in_person" && (validPlacePoint(data.profiles.find(profile=>profile.id===a.place_id)) || /\d/.test(a.location)) ? a.location : [modalityLabels[a.modality],a.location].filter(Boolean).join(" · ")}
              </Text>
              {a.modality !== "online" && (validPlacePoint(data.profiles.find(profile=>profile.id===a.place_id)) || /\d/.test(a.location)) && <ClassLocationMap key={a.location} address={a.location} point={validPlacePoint(data.profiles.find(profile=>profile.id===a.place_id)) ? data.profiles.find(profile=>profile.id===a.place_id) as PlacePoint : null} />}
              {!!data.profiles.find(profile=>profile.id===a.place_id)?.location_details && <Text style={ui.muted}>{data.profiles.find(profile=>profile.id===a.place_id)?.location_details}</Text>}
              {a.status === "published" && <Button secondary label="Invitar a alguien" onPress={() => setInviteVisible(true)} />}
              <EventInviteSheet classInvite={{id:a.id,title:a.title,date:sessions[0] ? formatSession(sessions[0],a.timezone) : undefined,url:`com.gurudevelopers.vibes://learning/${a.id}`}} visible={inviteVisible} onClose={()=>setInviteVisible(false)} onDiscover={()=>nav.navigate("Tab",{screen:"Discover"})} />
              <Text style={ui.body}>{a.description}</Text>
              {a.kind === "class" ? <ClassMeetingSummary sessions={sessions} timezone={a.timezone}/> : <>
              <Text style={ui.title}>Programa y encuentros</Text>
              {sessions.map((s, index) => (
                <View key={s.id} style={ui.card}>
                  <Text style={ui.title}>
                    {index + 1}. {s.title}
                  </Text>
                  <Text style={ui.body}>{formatSession(s, a.timezone)}</Text>
                  <Text style={ui.muted}>
                    {Math.round(
                      (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60000
                    )}{" "}
                    minutos · {a.timezone}
                  </Text>
                </View>
              ))}
              </>}
              <View style={ui.notice}>
                <Text style={ui.title}>
                  {priceLabel(a)}
                  {a.kind === "course" ? " · precio total" : ""}
                </Text>
                <Text style={ui.body}>
                  {a.capacity - a.reserved_count} cupos disponibles
                </Text>
                {paid && a.kind === "course" && (
                  <Text style={ui.body}>
                    El pago con Mercado Pago todavía no está disponible. No
                    podés reservar esta actividad paga por ahora.
                  </Text>
                )}
              </View>
              {e && (
                <Text style={ui.body}>
                  {e.status === "confirmed"
                    ? "Tu inscripción está confirmada."
                    : "Tu inscripción está cancelada."}
                </Text>
              )}
              {e?.status === "confirmed" ? (
                <Button
                  label="Cancelar mi inscripción"
                  secondary
                  disabled={
                    action.pending || started || a.status !== "published"
                  }
                  onPress={() =>
                    action.confirm({
                      text: "Vas a liberar tu lugar en la actividad completa.",
                      name: "cancel_enrollment",
                      args: { p_id: a.id },
                      success: "Inscripción cancelada. Se liberó tu cupo.",
                    })
                  }
                />
              ) : a.kind === "class" ? (
                a.status === "published" ? <ClassReservationPanel key={a.id} source={{id:a.id,timezone:a.timezone,sessions,bookingModes:a.booking_modes}} /> : <Text style={ui.muted}>Esta clase no está abierta para solicitudes.</Text>
              ) : (
                <Button
                  label={
                    paid
                      ? "Pago todavía no disponible"
                      : started
                      ? "Inscripción cerrada"
                      : a.status !== "published"
                      ? "Actividad no disponible"
                      : a.capacity <= a.reserved_count
                      ? "Sin cupos"
                      : "Inscribirme gratis"
                  }
                  disabled={
                    action.pending ||
                    paid ||
                    started ||
                    a.status !== "published" ||
                    a.capacity <= a.reserved_count
                  }
                  onPress={() =>
                    action.confirm({
                      text:
                        a.kind === "course"
                          ? "Te inscribís gratis en todos los encuentros del curso."
                          : "Te inscribís gratis en esta clase.",
                      name: "enroll",
                      args: { p_id: a.id },
                      success:
                        "Inscripción confirmada. Ya está en Mis clases y cursos.",
                    })
                  }
                />
              )}
              {mine && (
                <>
                  <Button
                    label="Ver alumnos y asistencia"
                    secondary
                    onPress={() => nav.navigate("LearningRoster", { id: a.id })}
                  />
                  {!["cancelled", "completed"].includes(a.status) && (
                    <Link
                      label="Editar actividad"
                      onPress={() =>
                        nav.navigate("LearningActivityEditor", { id: a.id })
                      }
                    />
                  )}
                </>
              )}
              {action.elements}
            </>
          );
        }}
      </LearningGate>
    </Page>
  );
}

export function LearningMine() {
  const requests = useReservationRequests();
  const q = useLearningData(),
    nav = useNav(),
    [tab, setTab] = useState("next");
  return (
    <Page title="Mis clases y cursos">
      <LearningGate query={q}>
        {(data) => {
          const entries = data.enrollments.flatMap((e) => {
            const a = data.activities.find((a) => a.id === e.activity_id);
            return a ? [{ a, e }] : [];
          });
          const next = (item: (typeof entries)[number]) =>
            item.e.status === "confirmed" &&
            item.a.status === "published" &&
            sessionsFor(data, item.a.id).some(
              (s) => Date.parse(s.ends_at) > Date.now()
            );
          const shown = entries
            .filter((i) => (tab === "next" ? next(i) : !next(i)))
            .sort(
              (a, b) =>
                Date.parse(sessionsFor(data, a.a.id)[0]?.starts_at ?? "") -
                Date.parse(sessionsFor(data, b.a.id)[0]?.starts_at ?? "")
            );
          return (
            <>
              <Chips
                value={tab}
                onChange={setTab}
                options={[
                  { value: "next", label: "Próximas" },
                  { value: "history", label: "Historial" },
                ]}
              />
              {requests.isError && <Button secondary label="Reintentar cargar solicitudes" onPress={() => void requests.refetch()} />}
              {(requests.data ?? []).filter(request => {
                const upcoming = request.status === "pending_confirmation" && request.starts_at.some(iso => Date.parse(iso) > Date.now());
                return tab === "next" ? upcoming : !upcoming;
              }).map(request => <TouchableOpacity key={request.id} accessibilityRole="button" onPress={() => nav.navigate(request.source_id.startsWith("clase_") ? "ExternalCatalogDetail" : "LearningActivity", {id:request.source_id})} style={ui.card}>
                <Text style={ui.title}>{request.title}</Text>
                <Text style={ui.body}>{request.status === "cancelled" ? "Solicitud cancelada" : "Pendiente de confirmación con el organizador"}</Text>
                <Text style={ui.muted}>{request.mode === "monthly" ? "Plan mensual" : "Clase suelta"} · {request.starts_at.length} fechas</Text>
                {request.starts_at.map(iso => <Text key={iso} style={ui.muted}>{reservationDateLabel(iso,data.activities.find(activity=>activity.id===request.source_id)?.timezone)}</Text>)}
              </TouchableOpacity>)}
              {shown.length ? (
                shown.map(({ a, e }) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    data={data}
                    status={`${
                      e.status === "confirmed"
                        ? "Inscripción confirmada"
                        : "Inscripción cancelada"
                    } · ${statusLabels[a.status]}`}
                    onPress={() =>
                      nav.navigate("LearningActivity", { id: a.id })
                    }
                  />
                ))
              ) : !(requests.data ?? []).some(request => {
                const upcoming = request.status === "pending_confirmation" && request.starts_at.some(iso => Date.parse(iso) > Date.now());
                return tab === "next" ? upcoming : !upcoming;
              }) && !requests.isLoading ? (
                <Empty
                  text={
                    tab === "next"
                      ? "Todavía no tenés próximas actividades."
                      : "Todavía no hay actividades en tu historial."
                  }
                />
              ) : null}
              <Button
                label="Explorar clases y cursos"
                secondary
                onPress={() => nav.navigate("LearningExplore")}
              />
            </>
          );
        }}
      </LearningGate>
    </Page>
  );
}

export function LearningManage() {
  const q = useLearningData(),
    nav = useNav(),
    action = useLearningAction();
  const [teacher, setTeacher] = useState(""),
    [place, setPlace] = useState("");
  return (
    <Page title="Mi espacio">
      <LearningGate query={q}>
        {(data) => {
          const mine = data.profiles.filter((p) =>
              data.access.managed_ids.includes(p.id)
            ),
            activities = data.activities.filter((a) =>
              data.access.managed_ids.includes(a.organizer_id)
            );
          if (!data.access.can_create && !mine.length)
            return (
              <Empty text="El panel está disponible únicamente para responsables autorizados." />
            );
          const linked = data.links.some(
            (l) => l.teacher_id === teacher && l.place_id === place
          );
          return (
            <>
              <Text style={ui.muted}>
                Administrá tus perfiles y tu oferta. Los alumnos se muestran
                solo a los responsables.
              </Text>
              {data.access.can_create && (
                <Button
                  label="Crear perfil de profesor o lugar"
                  onPress={() => nav.navigate("LearningProfileEditor")}
                />
              )}
              <TeacherLinkRequests />
              {mine.map((p) => (
                <View key={p.id} style={ui.card}>
                  <Text style={ui.title}>{p.name}</Text>
                  <Text style={ui.muted}>
                    {p.kind === "teacher" ? "Profesor" : "Lugar"} ·{" "}
                    {p.published ? "Publicado" : "Borrador"}
                  </Text>
                  <Link
                    label="Editar perfil"
                    onPress={() =>
                      nav.navigate("LearningProfileEditor", { id: p.id })
                    }
                  />
                  <Link
                    label="Ver perfil"
                    onPress={() =>
                      nav.navigate("LearningProfile", { id: p.id })
                    }
                  />
                </View>
              ))}
              {mine.some((p) => p.kind === "teacher") &&
                mine.some((p) => p.kind === "place") && (
                  <View style={ui.card}>
                    <Text style={ui.title}>Vincular profesores y lugares</Text>
                    <Text style={ui.muted}>
                      Podés vincular los perfiles que administrás. Para lugares
                      de otro responsable se requiere aprobación del
                      administrador.
                    </Text>
                    <Chips
                      value={teacher}
                      onChange={setTeacher}
                      options={mine
                        .filter((p) => p.kind === "teacher")
                        .map((p) => ({ value: p.id, label: p.name }))}
                    />
                    <Chips
                      value={place}
                      onChange={setPlace}
                      options={mine
                        .filter((p) => p.kind === "place")
                        .map((p) => ({ value: p.id, label: p.name }))}
                    />
                    <Button
                      label={linked ? "Quitar vínculo" : "Vincular perfiles"}
                      secondary
                      disabled={!teacher || !place || action.pending}
                      onPress={() =>
                        void action.run(
                          "link_profiles",
                          {
                            p_teacher: teacher,
                            p_place: place,
                            p_link: !linked,
                          },
                          linked
                            ? "Vínculo quitado."
                            : "Profesor y lugar vinculados."
                        )
                      }
                    />
                  </View>
                )}
              {!!mine.length && (
                <Button
                  label="Crear clase o curso"
                  onPress={() => nav.navigate("LearningActivityEditor")}
                />
              )}
              <Text style={ui.title}>Mis actividades</Text>
              {activities.length ? (
                activities.map((a) => (
                  <View key={a.id} style={ui.card}>
                    <Text style={ui.title}>{a.title}</Text>
                    <Text style={ui.muted}>
                      {statusLabels[a.status]} · {a.reserved_count}/{a.capacity}{" "}
                      inscriptos
                    </Text>
                    <Link
                      label="Ver detalle"
                      onPress={() =>
                        nav.navigate("LearningActivity", { id: a.id })
                      }
                    />
                    <Link
                      label="Alumnos y asistencia"
                      onPress={() =>
                        nav.navigate("LearningRoster", { id: a.id })
                      }
                    />
                    {!["cancelled", "completed"].includes(a.status) && (
                      <Link
                        label="Editar actividad"
                        onPress={() =>
                          nav.navigate("LearningActivityEditor", { id: a.id })
                        }
                      />
                    )}
                    {a.status === "draft" && (
                      <Button
                        label="Publicar"
                        disabled={action.pending}
                        onPress={() =>
                          action.confirm({
                            text: "La clase aparecerá en el listado. El perfil del responsable, los profesores y el lugar deben estar publicados.",
                            name: "set_status",
                            args: { p_id: a.id, p_status: "published" },
                            success: "Actividad publicada.",
                          })
                        }
                      />
                    )}
                    {a.status === "published" && (
                      <Button
                        label="Finalizar actividad"
                        secondary
                        disabled={action.pending}
                        onPress={() =>
                          action.confirm({
                            text: "Solo podés finalizar cuando haya terminado el último encuentro.",
                            name: "set_status",
                            args: { p_id: a.id, p_status: "completed" },
                            success: "Actividad finalizada.",
                          })
                        }
                      />
                    )}
                    {["draft", "published"].includes(a.status) && (
                      <Link
                        label="Cancelar actividad"
                        onPress={() =>
                          action.confirm({
                            text: "Se cancelará la actividad y todas sus inscripciones. Esta acción no se puede deshacer.",
                            name: "set_status",
                            args: { p_id: a.id, p_status: "cancelled" },
                            success: "Actividad e inscripciones canceladas.",
                          })
                        }
                      />
                    )}
                  </View>
                ))
              ) : (
                <Empty text="Creá una clase gratuita para comenzar." />
              )}
              {action.elements}
            </>
          );
        }}
      </LearningGate>
    </Page>
  );
}

export function LearningRoster() {
  const id = useId() ?? "",
    q = useLearningData(),
    action = useLearningAction(),
    [sessionId, setSessionId] = useState("");
  const a = q.data?.activities.find((a) => a.id === id),
    allowed = !!a && !!q.data?.access.managed_ids.includes(a.organizer_id);
  const roster = useLearningRoster(id, allowed);
  return (
    <Page title="Alumnos y asistencia">
      <LearningGate query={q}>
        {(data) => {
          if (!a || !allowed)
            return (
              <Empty text="No tenés permiso para ver los alumnos de esta actividad." />
            );
          const sessions = sessionsFor(data, id),
            selected = sessions.find((s) => s.id === sessionId) ?? sessions[0];
          const canMark =
            !!selected &&
            Date.parse(selected.starts_at) <= Date.now() &&
            ["published", "completed"].includes(a.status);
          return (
            <>
              <Text style={ui.heading}>{a.title}</Text>
              <Text style={ui.body}>
                {a.reserved_count} inscriptos · {a.capacity - a.reserved_count}{" "}
                cupos libres
              </Text>
              <Text style={ui.muted}>
                Lista privada. Solo se muestra el nombre, estado de inscripción
                y asistencia.
              </Text>
              <Chips
                value={selected?.id ?? ""}
                onChange={setSessionId}
                options={sessions.map((s, i) => ({
                  value: s.id,
                  label: `${i + 1}. ${s.title}`,
                }))}
              />
              {selected && (
                <Text style={ui.body}>
                  {formatSession(selected, a.timezone)}
                </Text>
              )}
              {!canMark && (
                <Text style={ui.muted}>
                  La asistencia se habilita al comenzar el encuentro, salvo que
                  la actividad esté cancelada.
                </Text>
              )}
              {roster.isPending && <Empty text="Cargando alumnos…" />}
              {roster.isError && (
                <View style={ui.notice}>
                  <Text style={ui.body}>{learningError(roster.error)}</Text>
                  <Button
                    label="Reintentar"
                    secondary
                    onPress={() => void roster.refetch()}
                  />
                </View>
              )}
              {roster.data?.length === 0 && (
                <Empty text="Todavía no hay alumnos inscriptos." />
              )}
              {roster.data?.map((student) => {
                const mark = student.attendance.find(
                  (r) => r.session_id === selected?.id
                );
                return (
                  <View key={student.id} style={ui.card}>
                    <Text style={ui.title}>{student.name}</Text>
                    <Text style={ui.muted}>
                      {student.status === "cancelled"
                        ? "Inscripción cancelada"
                        : mark
                        ? mark.present
                          ? "Presente"
                          : "Ausente"
                        : "Asistencia sin registrar"}
                    </Text>
                    {student.status === "confirmed" && (
                      <View style={ui.row}>
                        <Link
                          disabled={!canMark || action.pending}
                          label={
                            mark?.present ? "✓ Presente" : "Marcar presente"
                          }
                          onPress={() => {
                            if (canMark && !action.pending)
                              void action.run(
                                "record_attendance",
                                {
                                  p_session: selected!.id,
                                  p_enrollment: student.id,
                                  p_present: true,
                                },
                                "Asistencia guardada."
                              );
                          }}
                        />
                        <Link
                          disabled={!canMark || action.pending}
                          label={
                            mark?.present === false
                              ? "✓ Ausente"
                              : "Marcar ausente"
                          }
                          onPress={() => {
                            if (canMark && !action.pending)
                              void action.run(
                                "record_attendance",
                                {
                                  p_session: selected!.id,
                                  p_enrollment: student.id,
                                  p_present: false,
                                },
                                "Asistencia guardada."
                              );
                          }}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
              {action.elements}
            </>
          );
        }}
      </LearningGate>
    </Page>
  );
}

function ProfileEditorForm({ data, id, onKindChange }: { data: LearningData; id?: string; onKindChange: (kind:string)=>void }) {
  const { data: session } = useAuthSession();
  const ownProfile = useProfileQuery(session?.user.id);
  const profileParams=useRoute().params as {initialKind?:"teacher"|"place";publishByDefault?:boolean}|undefined;
  const [identity, setIdentity] = useState<"self" | "managed" | "user">("self");
  const contacts = useMatchesQuery();
  const [contactQuery, setContactQuery] = useState("");
  const [target, setTarget] = useState("");
  const [specialtyOpen, setSpecialtyOpen] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");
  const continueToClass = Boolean((useRoute().params as { continueToClass?: boolean } | undefined)?.continueToClass);
  const nav = useNav(),
    action = useLearningAction(),
    existing = data.profiles.find((p) => p.id === id);
  const [imageBusy, setImageBusy] = useState(false),
    [coverBusy, setCoverBusy] = useState(false);
  const [kind, setKind] = useState(existing?.kind ?? (profileParams?.initialKind ?? "teacher")),
    [name, setName] = useState(existing?.name ?? (profileParams?.initialKind === "place" ? "" : String(ownProfile.data?.displayName ?? ""))),
    [description, setDescription] = useState(existing?.description ?? ""),
    [specialties, setSpecialties] = useState(
      existing?.specialties.join(", ") ?? ""
    ),
    [location, setLocation] = useState(existing?.location ?? ""),
    [locationDetails,setLocationDetails] = useState(existing?.location_details ?? ""),
    [placePoint,setPlacePoint] = useState<PlacePoint|null>(validPlacePoint(existing) ? {latitude:existing!.latitude!,longitude:existing!.longitude!} : null),
    [modality, setModality] = useState<Modality>(
      existing?.modality ?? (profileParams?.initialKind === "place" ? "in_person" : "online")
    ),
    [image, setImage] = useState(existing?.image_url ?? ""),
    [cover, setCover] = useState(existing?.cover_url ?? ""),
    [published, setPublished] = useState(existing?.published ?? (continueToClass || Boolean(profileParams?.publishByDefault)));
  const ownName=String(ownProfile.data?.displayName ?? session?.user.user_metadata?.display_name ?? session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.name ?? "").trim();
  useEffect(()=>{
    if(!id && kind === "teacher" && identity === "self" && ownName) setName(ownName);
  },[id,kind,identity,ownName]);
  if (
    id
      ? !existing || !data.access.managed_ids.includes(id)
      : !data.access.can_create
  )
    return <Empty text="No tenés permiso para editar este perfil." />;
  return (
    <>
      {!id && <Chips value={kind} onChange={value => {setKind(value as "teacher" | "place"); onKindChange(value); setName(value === "place" ? "" : identity === "self" ? String(ownProfile.data?.displayName ?? "") : ""); if (value === "place") setModality("in_person");}} options={[{value:"teacher",label:"Agregar profesor"},{value:"place",label:"Agregar lugar"}]} />}
      {kind === "teacher" && !id && <>
        <Text style={ui.muted}>Elegí a quién querés agregar.</Text>
        {([
          {value:"self" as const,title:"Soy yo",hint:"Usar mi cuenta de Vibes"},
          {value:"user" as const,title:"Otro usuario de Vibes",hint:"Buscar y solicitar vinculación"},
          {value:"managed" as const,title:"Persona sin cuenta",hint:"Crear una ficha administrada por vos"},
        ]).map(option => <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityState={{checked:identity === option.value}} onPress={() => {
          setIdentity(option.value);
          setName(option.value === "self" ? ownName : "");
        }} style={[profileForm.choice, identity === option.value && profileForm.chosen]}>
          <Icon name={identity === option.value ? "radio-button-on" : "radio-button-off"} size={24} color={identity === option.value ? vibesTheme.colors.accentBlue : vibesTheme.colors.secondaryText} />
          <View style={{flex:1,gap:2}}><Text style={profileForm.choiceTitle}>{option.title}</Text><Text style={profileForm.hint}>{option.hint}</Text></View>
        </TouchableOpacity>)}
      </>}
      {kind === "teacher" && !id && identity === "user" ? <>
        <Field label="Buscar entre tus conexiones" value={contactQuery} onChange={setContactQuery}/>
        {contacts.isLoading && <Text style={ui.muted}>Cargando conexiones…</Text>}
        {contacts.isError && <Button secondary label="Reintentar cargar conexiones" onPress={()=>void contacts.refetch()}/>}
        {(contacts.data ?? []).filter(contact=>contact.otherUserName.toLocaleLowerCase().includes(contactQuery.trim().toLocaleLowerCase())).map(contact=><TouchableOpacity key={contact.otherUserId} accessibilityRole="radio" accessibilityState={{checked:target===contact.otherUserId}} style={[profileForm.choice,target===contact.otherUserId && profileForm.chosen]} onPress={()=>{setTarget(contact.otherUserId);setName(contact.otherUserName);}}><Icon name={target===contact.otherUserId ? "radio-button-on" : "radio-button-off"} size={22} color={vibesTheme.colors.accentBlue}/><Text style={profileForm.choiceTitle}>{contact.otherUserName}</Text></TouchableOpacity>)}
        {!contacts.isLoading && !contacts.isError && !(contacts.data ?? []).filter(contact=>contact.otherUserName.toLocaleLowerCase().includes(contactQuery.trim().toLocaleLowerCase())).length && <Text style={ui.muted}>No hay conexiones que coincidan. Podés conectar con esa persona desde Descubrir.</Text>}
        <Text style={profileForm.hint}>La ficha queda como borrador hasta que la persona acepte en Mi espacio. La solicitud no crea una cuenta nueva.</Text>
      </> : <Field label={kind === "place" ? "Nombre del lugar *" : "Nombre y apellido *"} value={name} onChange={setName} />}
      {kind === "place" && <>
        <PlaceLocationPicker address={location} point={placePoint} onAddressChange={setLocation} onPointChange={setPlacePoint}/>
        <Field label="Piso, unidad o indicaciones (opcional)" value={locationDetails} onChange={value=>setLocationDetails(value.slice(0,300))} hint="Ej.: 1.er piso, timbre B."/>
        <View style={ui.notice}><Icon name="information-circle-outline" size={22} color={vibesTheme.colors.accentBlue}/><Text style={profileForm.hint}>La ubicación del lugar se usa en las clases presenciales.</Text></View>
      </>}
      <Text style={profileForm.label}>Especialidades</Text>
      <View style={profileForm.specialties}>
        {specialties.split(",").map(value => value.trim()).filter(Boolean).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityLabel={`Quitar especialidad ${value}`} onPress={() => setSpecialties(specialties.split(",").map(item=>item.trim()).filter(item=>item!==value).join(", "))} style={[explore.action,explore.activeFilter]}><Text style={explore.actionLabel}>{value}</Text><Icon name="close" size={16} color={vibesTheme.colors.primaryText}/></TouchableOpacity>)}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Agregar especialidad" style={explore.iconButton} onPress={()=>setSpecialtyOpen(true)}><Icon name="add" size={22} color={vibesTheme.colors.accentBlue}/></TouchableOpacity>
      </View>
      <AnimatedSheetModal visible={specialtyOpen} onClose={()=>setSpecialtyOpen(false)} placement="center" sheetStyle={[ui.sheet,{borderRadius:24}]}>
        <Text style={ui.title}>Agregar especialidad</Text>
        <Field label="Especialidad" value={newSpecialty} onChange={setNewSpecialty}/>
        <Button label="Agregar" disabled={!newSpecialty.trim() || specialties.split(",").filter(Boolean).length >= 20} onPress={()=>{setSpecialties([...new Set([...specialties.split(","),...newSpecialty.split(",")].map(value=>value.trim()).filter(Boolean))].slice(0,20).join(", "));setNewSpecialty("");setSpecialtyOpen(false);}}/>
        <Button secondary label="Volver" onPress={()=>setSpecialtyOpen(false)}/>
      </AnimatedSheetModal>
      <Field label="Descripción" value={description} onChange={setDescription} multiline />
      {kind === "teacher" && <>
        <Text style={profileForm.label}>Modalidad</Text>
        <Chips value={modality} onChange={value=>setModality(value as Modality)} options={modalityOptions}/>
        {modality !== "online" && <Field label="Ubicación *" value={location} onChange={setLocation} hint="Ciudad, barrio y dirección para actividades presenciales."/>}
      </>}
      <ImageField compact label={kind === "teacher" ? "Foto del profesor" : "Foto del lugar"} value={image} onChange={setImage} onBusy={setImageBusy}/>
      {!!cover && <><ImageField label="Portada" value={cover} onChange={setCover} onBusy={setCoverBusy}/><Photo key={cover} url={cover} cover/></>}
      {kind === "teacher" && !id && identity === "managed" && <View style={ui.notice}><Text style={profileForm.choiceTitle}>Esta ficha no crea una cuenta ni acceso para esa persona.</Text><Text style={profileForm.hint}>Vos administrás la información del profesor.</Text></View>}
      {!(kind === "teacher" && !id && identity === "user") && <Chips
        value={published ? "published" : "draft"}
        onChange={(v) => setPublished(v === "published")}
        options={[
          { value: "draft", label: "Borrador" },
          { value: "published", label: "Publicado" },
        ]}
      />
      }
      <Button
        label={action.pending ? "Guardando…" : !id && kind === "teacher" && identity === "user" ? "Solicitar vinculación" : kind === "place" ? "Guardar lugar" : "Guardar profesor"}
        disabled={
          action.pending ||
          imageBusy ||
          coverBusy ||
          !name.trim() ||
          (!id && kind === "teacher" && identity === "user" && !target) ||
          (modality !== "online" && !location.trim())
        }
        onPress={() =>
          void action.run(
            !id && kind === "teacher" ? "save_teacher" : kind === "place" ? "save_place" : "save_profile",
            {
              ...(!id && kind === "teacher" ? {p_mode:identity,p_target:identity === "user" ? target : null} : {p_id:id ?? null}),
              p_data: {
                kind,
                name: name.trim(),
                description,
                specialties: specialties
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                location,
                location_details: locationDetails,
                ...(kind === "place" ? {latitude:placePoint?.latitude ?? null,longitude:placePoint?.longitude ?? null} : {}),
                modality,
                image_url: image.trim(),
                cover_url: cover.trim(),
                published,
              },
            },
            !id && kind === "teacher" && identity === "user" ? "Solicitud pendiente de aceptación en Mi espacio." : "Perfil guardado.",
            () => !id && kind === "teacher" && identity === "user" ? nav.replace("LearningManage") : continueToClass ? nav.replace("LearningActivityEditor") : nav.goBack()
          )
        }
      />
      {action.elements}
    </>
  );
}
export function LearningProfileEditor() {
  const profileParams=useRoute().params as {initialKind?:string}|undefined;
  const [kind,setKind] = useState(profileParams?.initialKind ?? "teacher");
  const id = useId(),
    q = useLearningData();
  return (
    <Page title={id ? "Editar perfil" : kind === "place" ? "Agregar lugar" : "Agregar profesor"}>
      <LearningGate query={q}>
        {(data) => <ProfileEditorForm key={id ?? "new"} data={data} id={id} onKindChange={setKind} />}
      </LearningGate>
    </Page>
  );
}

type DraftMeeting = {
  key: string;
  title: string;
  date: string;
  duration: string;
};
let meetingKey = 0;
function newMeeting(): DraftMeeting {
  return { key: `new-${++meetingKey}`, title: "", date: "", duration: "60" };
}
function ActivityEditorForm({ data, id }: { data: LearningData; id?: string }) {
  const nav = useNav(),
    action = useLearningAction(),
    existing = data.activities.find((a) => a.id === id),
    mine = data.profiles.filter((p) => data.access.managed_ids.includes(p.id));
  const [imageBusy, setImageBusy] = useState(false);
  const [organizer, setOrganizer] = useState(
      existing?.organizer_id ?? mine[0]?.id ?? ""
    ),
    [kind, setKind] = useState(existing?.kind ?? "class"),
    [title, setTitle] = useState(existing?.title ?? ""),
    [description, setDescription] = useState(existing?.description ?? ""),
    [image, setImage] = useState(existing?.image_url ?? ""),
    [teachers, setTeachers] = useState(existing?.teacher_ids ?? mine.filter(profile => profile.kind === "teacher").slice(0, 1).map(profile => profile.id)),
    [place, setPlace] = useState(existing?.place_id ?? ""),
    [modality, setModality] = useState<Modality>(
      existing?.modality ?? "online"
    ),
    [location, setLocation] = useState(existing?.location ?? ""),
    [capacity, setCapacity] = useState(String(existing?.capacity ?? 12)),
    [price, setPrice] = useState(String(existing?.price ?? 0)),
    [currency, setCurrency] = useState(existing?.currency ?? "ARS"),
    [timezone, setTimezone] = useState(
      existing?.timezone ?? "America/Argentina/Buenos_Aires"
    );
  const initialSessions = existing ? sessionsFor(data, existing.id) : [];
  const [meetings, setMeetings] = useState<DraftMeeting[]>(
    initialSessions.length
      ? initialSessions.map((s) => ({
          key: s.id,
          title: s.title,
          date: wallDate(s.starts_at, existing!.timezone),
          duration: String(
            (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60000
          ),
        }))
      : [newMeeting()]
  );
  const [error, setError] = useState("");
  // Keep requested/enrolled dates stable, including their history.
  const locked = !!existing?.schedule_locked;
  if (
    !mine.length ||
    (id &&
      (!existing || !data.access.managed_ids.includes(existing.organizer_id)))
  )
    return <Empty text="No tenés permiso para editar esta actividad." />;
  if (existing && ["cancelled", "completed"].includes(existing.status))
    return <Empty text="Esta actividad está cerrada." />;
  const teacherOptions = data.profiles.filter(
    (p) =>
      p.kind === "teacher" &&
      (data.access.managed_ids.includes(p.id) ||
        (organizer === place &&
          data.links.some(
            (l) => l.teacher_id === p.id && l.place_id === place
          )))
  );
  const updateMeeting = (key: string, patch: Partial<DraftMeeting>) =>
    setMeetings((m) => m.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const save = () => {
    setError("");
    try {
      if (
        !title.trim() ||
        !teachers.length ||
        !Number.isInteger(Number(capacity)) ||
        Number(capacity) < 1 ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0 ||
        !/^[A-Z]{3}$/.test(currency)
      )
        throw Error("Revisá el título, el profesor y los cupos de la clase.");
      const sessions = locked
        ? initialSessions.map((s) => ({
            title: s.title,
            starts_at: new Date(s.starts_at).toISOString(),
            ends_at: new Date(s.ends_at).toISOString(),
          }))
        : meetings
            .map((m) => {
              const starts_at = zonedDateToISO(m.date, timezone),
                duration = Number(m.duration);
              if (
                (kind === "course" && !m.title.trim()) ||
                !Number.isFinite(duration) ||
                duration <= 0 ||
                duration > 1440
              )
                throw Error(
                  "Completá el título y una duración entre 1 y 1440 minutos para cada encuentro."
                );
              return {
                title: m.title.trim() || title.trim(),
                starts_at,
                ends_at: new Date(
                  Date.parse(starts_at) + duration * 60000
                ).toISOString(),
              };
            })
            .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
      if (!locked && sessions.some(session => Date.parse(session.starts_at) <= Date.now())) throw Error("Elegí una fecha y hora futura.");
      if (sessions.some((session,index) => index > 0 && Date.parse(session.starts_at) < Date.parse(sessions[index-1].ends_at))) throw Error("Los encuentros no pueden superponerse.");
      if (modality !== "online" && !location.trim()) throw Error("Completá la dirección de la clase presencial.");
      const input: ActivityInput = {
        organizer_id: organizer,
        kind,
        title: title.trim(),
        description,
        image_url: image.trim() || null,
        teacher_ids: teachers,
        place_id: place || null,
        modality,
        location,
        timezone,
        capacity: Number(capacity),
        price: Number(price),
        currency,
        sessions,
      };
      void action.run(
        "save_activity",
        { p_id: id ?? null, p_data: input },
        existing ? "Cambios guardados." : "Clase guardada como borrador.",
        () => existing ? nav.goBack() : nav.replace("LearningManage")
      );
    } catch (e) {
      setError(learningError(e));
    }
  };
  return (
    <>
      <Text style={ui.muted}>
        Primero guardá el borrador. Después publicalo desde Mi espacio.
      </Text>
      {locked && (
        <Text style={ui.muted}>
          Con solicitudes o inscripciones, se conservan horarios, profesores, lugar y
          modalidad. Podés editar título, descripción, imagen y cupos.
        </Text>
      )}
      <Text style={ui.body}>Perfil responsable</Text>
      <Chips
        value={organizer}
        onChange={(v) => {
          if (!id) setOrganizer(v);
        }}
        options={mine.map((p) => ({ value: p.id, label: p.name }))}
      />
      <Chips
        value={kind}
        onChange={(v) => {
          if (!locked) {
            setKind(v as "class" | "course");
            setMeetings((m) =>
              v === "class" ? [m[0]] : m.length < 2 ? [...m, newMeeting()] : m
            );
          }
        }}
        options={[
          { value: "class", label: "Clase" },
          { value: "course", label: "Curso" },
        ]}
      />
      <Field label="Título" value={title} onChange={setTitle} />
      <Field
        label="Descripción y programa"
        value={description}
        onChange={setDescription}
        multiline
      />
      <ImageField
        label="Imagen de la actividad"
        value={image}
        onChange={setImage}
        onBusy={setImageBusy}
      />
      {!!image && <Photo key={image} url={image} cover />}
      <Text style={ui.body}>Lugar (opcional para online)</Text>
      <Chips
        value={place}
        onChange={(v) => {
          if (!locked) {
            setPlace(v);
            const selectedPlace=data.profiles.find(profile=>profile.id===v);
            if(selectedPlace?.location) {setLocation(selectedPlace.location);setModality("in_person");}
          }
        }}
        options={[
          { value: "", label: "Sin lugar" },
          ...data.profiles
            .filter(
              (p) =>
                p.kind === "place" &&
                (data.access.managed_ids.includes(p.id) ||
                  data.links.some(
                    (l) =>
                      l.place_id === p.id && teachers.includes(l.teacher_id)
                  ))
            )
            .map((p) => ({ value: p.id, label: p.name })),
        ]}
      />
      <Text style={ui.body}>Profesores · selección múltiple</Text>
      <View style={ui.row}>
        {teacherOptions.map((p) => (
          <TouchableOpacity
            key={p.id}
            accessibilityRole="checkbox"
            accessibilityState={{
              checked: teachers.includes(p.id),
              disabled: locked,
            }}
            disabled={locked}
            style={[ui.chip, teachers.includes(p.id) && ui.selected]}
            onPress={() =>
              setTeachers((t) =>
                t.includes(p.id) ? t.filter((id) => id !== p.id) : [...t, p.id]
              )
            }
          >
            <Text
              style={[ui.chipText, teachers.includes(p.id) && ui.selectedText]}
            >
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {!teacherOptions.length && <>
        <Text style={ui.muted}>Para publicar una clase necesitás un perfil de profesor.</Text>
        <Button secondary label="Crear perfil de profesor y continuar" onPress={()=>nav.navigate("LearningProfileEditor",{continueToClass:true})} />
      </>}
      <Chips
        value={modality}
        onChange={(v) => {
          if (!locked) setModality(v as Modality);
        }}
        options={modalityOptions}
      />
      <Field
        label="Ubicación presencial"
        value={location}
        onChange={setLocation}
        editable={!locked}
      />
      <Field
        label="Zona horaria IANA"
        value={timezone}
        onChange={setTimezone}
        editable={!locked}
        hint="Ejemplo: America/Argentina/Buenos_Aires"
      />
      <Field
        label="Cupos"
        value={capacity}
        onChange={setCapacity}
        keyboardType="numeric"
      />
      {existing && Number(existing.price) > 0 && <Text style={ui.muted}>Se conserva el precio de esta actividad existente. En este flujo no se realizan cobros.</Text>}
      <Text style={ui.title}>Encuentros</Text>
      {meetings.map((m, index) => (
        <View key={m.key} style={ui.card}>
          <Text style={ui.title}>Encuentro {index + 1}</Text>
          <Field
            label={kind === "class" ? "Nombre del encuentro (opcional)" : `Título del encuentro ${index + 1}`}
            value={m.title}
            onChange={(title) => updateMeeting(m.key, { title })}
            editable={!locked}
          />
          <Field
            label={`Fecha y hora del encuentro ${index + 1}`}
            value={m.date}
            onChange={(date) => updateMeeting(m.key, { date })}
            editable={!locked}
            hint="AAAA-MM-DD HH:mm, en la zona horaria seleccionada."
          />
          <Field
            label={`Duración en minutos del encuentro ${index + 1}`}
            value={m.duration}
            onChange={(duration) => updateMeeting(m.key, { duration })}
            keyboardType="numeric"
            editable={!locked}
          />
          {kind === "course" && !locked && meetings.length > 2 && (
            <Link
              label="Quitar encuentro"
              onPress={() =>
                setMeetings((s) => s.filter((x) => x.key !== m.key))
              }
            />
          )}
        </View>
      ))}
      {kind === "course" && !locked && (
        <Button
          label="Agregar encuentro"
          secondary
          onPress={() => setMeetings((m) => [...m, newMeeting()])}
        />
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={ui.body}>
          {error}
        </Text>
      )}
      <Button
        label={action.pending ? "Guardando…" : "Guardar actividad"}
        disabled={action.pending || imageBusy}
        onPress={save}
      />
      {action.elements}
    </>
  );
}
export function LearningActivityEditor() {
  const id=useId(),q=useLearningData();
  return <LearningGate query={q}>{data=>data.activities.find(activity=>activity.id===id)?.kind === "course" ? <Page title="Editar curso"><ActivityEditorForm key={id} data={data} id={id}/></Page> : <ClassEditorForm key={id ?? "new"} data={data} id={id}/>}</LearningGate>;
}

const explore = StyleSheet.create({
  toolbar: {flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},
  subtitle: {flex:1,fontSize:15,lineHeight:22,color:vibesTheme.colors.secondaryText},
  iconButton: {width:44,height:44,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:`${vibesTheme.colors.secondaryText}0C`},
  search: {flexDirection:"row",alignItems:"center",gap:10,minHeight:48,paddingHorizontal:14,borderRadius:16,backgroundColor:`${vibesTheme.colors.secondaryText}0C`},
  searchInput: {flex:1,minHeight:48,fontSize:16,color:vibesTheme.colors.primaryText},
  clear: {minWidth:44,minHeight:44,alignItems:"center",justifyContent:"center"},
  actions: {flexDirection:"row",gap:10},
  action: {flexDirection:"row",gap:8,minHeight:44,paddingHorizontal:16,paddingVertical:10,borderRadius:999,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:`${vibesTheme.colors.primaryText}1F`},
  actionLabel: {fontFamily:vibesTheme.fonts.semibold,fontSize:14,lineHeight:20,color:vibesTheme.colors.primaryText},
  filterLabel: {fontFamily:vibesTheme.fonts.semibold,fontSize:14,lineHeight:20,color:vibesTheme.colors.accentBlue},
  activeFilter: {backgroundColor:`${vibesTheme.colors.accentBlue}14`,borderColor:vibesTheme.colors.accentBlue},
  sectionHint: {fontSize:15,lineHeight:22,color:vibesTheme.colors.secondaryText},
  mineLink: {flexDirection:"row",alignItems:"center",justifyContent:"space-between",minHeight:44},
  sectionTitle: {fontFamily:vibesTheme.fonts.semibold,fontSize:25,lineHeight:29,color:vibesTheme.colors.primaryText,marginTop:8},
  empty: {paddingVertical:28,paddingHorizontal:16,alignItems:"center",gap:12},
  emptyIcon: {width:64,height:64,borderRadius:32,backgroundColor:`${vibesTheme.colors.accentBlue}14`,alignItems:"center",justifyContent:"center"},
  emptyTitle: {fontFamily:vibesTheme.fonts.bold,fontSize:20,lineHeight:26,color:vibesTheme.colors.primaryText,textAlign:"center"},
  emptyBody: {fontSize:15,lineHeight:22,color:vibesTheme.colors.secondaryText,textAlign:"center",maxWidth:300},
});

const profileForm = StyleSheet.create({
  choice: {flexDirection:"row",alignItems:"center",gap:12,padding:14,borderRadius:16,borderWidth:1,borderColor:`${vibesTheme.colors.primaryText}1F`,minHeight:72},
  chosen: {backgroundColor:`${vibesTheme.colors.accentBlue}14`,borderColor:vibesTheme.colors.accentBlue},
  choiceTitle: {fontFamily:vibesTheme.fonts.semibold,fontSize:16,lineHeight:22,color:vibesTheme.colors.primaryText},
  hint: {fontFamily:vibesTheme.fonts.regular,fontSize:14,lineHeight:20,color:vibesTheme.colors.secondaryText},
  label: {fontFamily:vibesTheme.fonts.semibold,fontSize:14,lineHeight:20,color:vibesTheme.colors.primaryText},
  specialties: {flexDirection:"row",flexWrap:"wrap",gap:8,alignItems:"center"},
});
