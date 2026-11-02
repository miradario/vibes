import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import AnimatedSheetModal from "./AnimatedSheetModal";
import { Text, TextInput } from "./Typography";
import { getEventCategoryLabel } from "../src/constants/eventClassification";
import Icon from "./Icon";
import BackButton from "./BackButton";
import MediaImage from "./MediaImage";
import ScreenContainer from "./ScreenContainer";
import type { EventFeedItem } from "../src/queries/events.queries";
import { calendarOccurrences, eventDayKey, hasEventCoordinates } from "../src/lib/eventExplorer";
import * as ds from "../src/theme/tokens";
import { vibesTheme } from "../src/theme/vibesTheme";
const c = vibesTheme.colors;
export type EventExplorerMode = "calendar" | "map";

export default function EventExplorerSheet({ mode, events, mapEvents, joinedEventIds, loading, onClose, onOpen }: {
  mode: EventExplorerMode | null; events: EventFeedItem[]; mapEvents: EventFeedItem[]; joinedEventIds: ReadonlySet<string>; loading: boolean;
  onClose: () => void; onOpen: (event: EventFeedItem) => void;
}) {
  const { height } = useWindowDimensions();
  return <AnimatedSheetModal visible={mode !== null} fullScreen onClose={onClose} sheetStyle={{ height, backgroundColor: c.surface }}>
    <ScreenContainer edges={["top", "bottom", "left", "right"]} style={s.screen}>
      <View style={s.navigationHeader}>
        <BackButton accessibilityLabel="Volver a eventos" onPress={onClose} />
        <Text style={s.navigationTitle} numberOfLines={1} adjustsFontSizeToFit>{mode === "map" ? "Mapa" : "Calendario"}</Text>
        <View style={s.headerSpacer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      </View>
      {loading ? <Text style={s.meta}>Actualizando eventos…</Text> : null}
      {mode === "calendar" ? <EventCalendar events={events} joinedEventIds={joinedEventIds} onOpen={onOpen} /> : mode === "map" ? <EventMap events={mapEvents} joinedEventIds={joinedEventIds} onOpen={onOpen} /> : null}
    </ScreenContainer>
  </AnimatedSheetModal>;
}

function EventCalendar({ events, joinedEventIds, onOpen }: { events: EventFeedItem[]; joinedEventIds: ReadonlySet<string>; onOpen: (event: EventFeedItem) => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => eventDayKey(new Date()));
  const today = eventDayKey(new Date());
  const occurrences = useMemo(() => calendarOccurrences(events), [events]);
  const daysWithEvents = new Set(occurrences.map(item => item.day));
  const joinedDays = new Set(occurrences.filter(item => joinedEventIds.has(item.event.id)).map(item => item.day));
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const changeMonth = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next); setSelected(eventDayKey(next));
  };
  const dayEvents = occurrences.filter(item => item.day === selected);
  return <ScrollView contentContainerStyle={s.content}>
    <Text style={s.calendarTitle}>Tu próximo encuentro</Text>
    <View style={s.header}>
      <Text style={[s.month, { flex: 1 }]}>{month.toLocaleDateString("es-AR", { month: "long" }).toLocaleUpperCase("es-AR")} <Text style={s.meta}>{month.getFullYear()}</Text></Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ir a hoy" onPress={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(today); }} style={s.todayButton}><Text style={s.body}>Hoy · {new Date().getDate()}</Text></TouchableOpacity>
    </View>
    <View style={s.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => changeMonth(-1)} style={s.control}><Icon name="chevron-back" size={24} color={c.primaryText} /></TouchableOpacity>
      <Text style={s.meta}>Elegí un día</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => changeMonth(1)} style={s.control}><Icon name="chevron-forward" size={24} color={c.primaryText} /></TouchableOpacity>
    </View>
    <View style={s.legend}><Icon name="checkmark-circle" size={18} color={c.accentBlue} /><Text style={s.meta}>Ya estás anotado a un evento</Text></View>
    <View style={s.grid}>{["L", "M", "M", "J", "V", "S", "D"].map((label, index) => <View key={index} style={s.day}><Text style={s.meta}>{label}</Text></View>)}</View>
    <View style={s.grid}>{Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
      const number = index - offset + 1;
      if (number < 1 || number > days) return <View key={index} style={s.day} />;
      const key = eventDayKey(new Date(month.getFullYear(), month.getMonth(), number));
      return <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={`${number} ${month.toLocaleDateString("es-AR", { month: "long" })}${joinedDays.has(key) ? ", ya estás anotado a eventos" : daysWithEvents.has(key) ? ", con eventos" : ""}`} accessibilityState={{ selected: key === selected }} onPress={() => setSelected(key)} style={s.day}>
        <View style={[s.dayCircle, joinedDays.has(key) && s.joinedDay, key === today && s.todayCircle, key === selected && s.selected]}>
          {joinedDays.has(key) ? <View style={s.joinedMark}><Icon name="checkmark" size={12} color={c.primaryText} /></View> : null}
          <Text style={s.body}>{number}</Text><View style={[s.dot, { opacity: daysWithEvents.has(key) ? 1 : 0 }]} />
        </View>
      </TouchableOpacity>;
    })}</View>
    <Text style={s.month}>{new Date(`${selected}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</Text>
    {!dayEvents.length ? <Text style={s.meta}>No hay eventos para este día con los filtros actuales.</Text> : null}
    {dayEvents.map(({ event, startsAt }) => <EventRow key={`${event.id}-${startsAt}`} event={event} date={startsAt} joined={joinedEventIds.has(event.id)} onOpen={onOpen} />)}
  </ScrollView>;
}

function EventRow({ event, date, joined = false, onOpen }: { event: EventFeedItem; date?: string; joined?: boolean; onOpen: (event: EventFeedItem) => void }) {
  return <TouchableOpacity style={s.card} accessibilityRole="button" accessibilityLabel={`Ver ${event.title}`} onPress={() => onOpen(event)}>
    <MediaImage source={typeof event.image === "string" ? { uri: event.image } : event.image} style={s.thumbnail} resizeMode="cover" />
    <View style={s.eventCopy}>
    <Text style={s.body}>{event.title}</Text>
    {joined ? <View style={s.legend}><Icon name="checkmark-circle" size={16} color={c.accentBlue} /><Text style={s.meta}>Ya estás anotado</Text></View> : null}
    {date ? <Text style={s.meta}>{new Date(date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</Text> : null}
    {event.location ? <Text style={s.meta} numberOfLines={2}>{event.location}</Text> : null}
    </View>
  </TouchableOpacity>;
}

function EventMap({ events, joinedEventIds, onOpen }: { events: EventFeedItem[]; joinedEventIds: ReadonlySet<string>; onOpen: (event: EventFeedItem) => void }) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready || failed) return;
    const timer = setTimeout(() => setFailed(true), 15000);
    return () => clearTimeout(timer);
  }, [ready, failed]);
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyFree, setOnlyFree] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [thisWeek, setThisWeek] = useState(false);
  const categories = [...new Set(events.map(event => event.category).filter(Boolean))];
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = useMemo(() => events.filter(event => {
    if (onlyMine && !joinedEventIds.has(event.id)) return false;
    if (onlyFree && event.pricingType !== "free") return false;
    if (category && event.category !== category) return false;
    if (search.trim() && !normalize(`${event.title} ${event.location ?? ""}`).includes(normalize(search.trim()))) return false;
    if (thisWeek) {
      const now = Date.now();
      if (!calendarOccurrences([event]).some(item => Date.parse(item.startsAt) >= now && Date.parse(item.startsAt) < now + 7 * 86400000)) return false;
    }
    return true;
  }), [events, joinedEventIds, onlyMine, onlyFree, category, search, thisWeek]);
  const located = useMemo(() => filtered.filter(hasEventCoordinates), [filtered]);
  const hasFilters = Boolean(search || onlyMine || onlyFree || category || thisWeek);
  useEffect(() => { setFailed(false); setReady(false); }, [located]);
  const html = useMemo(() => {
    const points = JSON.stringify(located.map(event => ({ id: event.id, title: event.title, lat: event.locationLatitude, lng: event.locationLongitude }))).replace(/</g, "\\u003c");
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""><style>html,body,#map{height:100%;margin:0;background:${c.background}} .leaflet-container{font-family:sans-serif;color:${c.primaryText}} .leaflet-bar a,.leaflet-control-attribution{background:${c.surface};color:${c.primaryText}}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script><script>
    try { const points=${points}; const map=L.map('map');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    points.forEach(p=>{const marker=L.circleMarker([p.lat,p.lng],{radius:12,color:'${c.primaryText}',weight:2,fillColor:'${c.accentMustard}',fillOpacity:1}).addTo(map);const label=document.createElement('span');label.textContent=p.title;marker.bindTooltip(label);marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({id:p.id})));});
    window.ReactNativeWebView.postMessage(JSON.stringify({ready:true})); if(points.length===1)map.setView([points[0].lat,points[0].lng],14);else map.fitBounds(points.map(p=>[p.lat,p.lng]),{padding:[30,30],maxZoom:15});
    }catch(e){window.ReactNativeWebView.postMessage(JSON.stringify({error:true}));}</script></body></html>`;
  }, [located]);
  return <View style={{ flex: 1 }}>
    <TextInput accessibilityLabel="Buscar eventos en el mapa" placeholder="Buscar evento o lugar" placeholderTextColor={c.secondaryText} value={search} onChangeText={setSearch} style={s.search} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.filterRow}>
      {([
        ["Mis eventos", onlyMine, () => setOnlyMine(value => !value)],
        ["Gratis", onlyFree, () => setOnlyFree(value => !value)],
        ["Próximos 7 días", thisWeek, () => setThisWeek(value => !value)],
        ...categories.map(value => [getEventCategoryLabel(value), category === value, () => setCategory(current => current === value ? null : value!)]),
      ] as [string, boolean, () => void][]).map(([label, active, toggle]) => <TouchableOpacity key={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={toggle} style={[s.filterChip, active && s.selected]}><Text style={s.meta}>{label}</Text></TouchableOpacity>)}
      {hasFilters ? <TouchableOpacity accessibilityRole="button" onPress={() => { setSearch(""); setOnlyMine(false); setOnlyFree(false); setCategory(null); setThisWeek(false); }} style={s.filterChip}><Text style={s.body}>Limpiar</Text></TouchableOpacity> : null}
    </ScrollView>
    <Text style={s.meta}>{located.length} eventos en el mapa{filtered.length > located.length ? ` · ${filtered.length - located.length} sin punto en el mapa` : ""}</Text>
    {located.length && !failed ? <WebView originWhitelist={["*"]} source={{ html }} applicationNameForUserAgent="Vibes/1.4 EventMap" style={s.map} javaScriptEnabled cacheEnabled onError={() => setFailed(true)} onMessage={message => {
      try { const data = JSON.parse(message.nativeEvent.data); if (data.ready) { setReady(true); return; } if (data.error) { setFailed(true); return; } const event = located.find(item => item.id === data.id); if (event) onOpen(event); } catch {}
    }} onShouldStartLoadWithRequest={request => request.url === "about:blank" || request.url.startsWith("data:text/html")} /> : <Text style={s.meta}>{failed ? "No pudimos cargar el mapa. Podés abrir los eventos de abajo." : "No hay eventos con coordenadas guardadas para estos filtros."}</Text>}
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>{filtered.map(event => <EventRow key={event.id} event={event} joined={joinedEventIds.has(event.id)} onOpen={onOpen} />)}</ScrollView>
  </View>;
}
const s = StyleSheet.create({
  search: { minHeight: 48, borderWidth: 1, borderColor: c.borderSoft, borderRadius: ds.radii.md, paddingHorizontal: ds.spacing[3], color: c.primaryText, ...ds.textStyles.bodySmall, marginBottom: ds.spacing[2] },
  filterRow: { gap: ds.spacing[2], paddingBottom: ds.spacing[2] },
  filterChip: { minHeight: 44, paddingHorizontal: ds.spacing[3], borderWidth: 1, borderColor: c.borderSoft, borderRadius: ds.radii.pill, alignItems: "center", justifyContent: "center" },
  screen: { flex: 1, backgroundColor: c.surface, paddingHorizontal: ds.spacing[4] },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: ds.spacing[2] },
  navigationHeader: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: ds.spacing[2], paddingVertical: ds.spacing[2] },
  navigationTitle: { flex: 1, textAlign: "center", ...ds.textStyles.heading, color: c.primaryText },
  headerSpacer: { width: 44 },
  calendarTitle: { ...ds.textStyles.title, color: c.primaryText, marginTop: ds.spacing[3], marginBottom: ds.spacing[4] },
  todayButton: { minHeight: 44, paddingHorizontal: ds.spacing[3], borderRadius: ds.radii.lg, justifyContent: "center", backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle) },
  dayCircle: { width: 44, height: 44, borderRadius: ds.radii.pill, borderWidth: 1, borderColor: c.surface, alignItems: "center", justifyContent: "center" },
  legend: { flexDirection: "row", alignItems: "center", gap: ds.spacing[1] },
  joinedDay: { backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.soft), borderColor: c.accentBlue },
  joinedMark: { position: "absolute", top: -3, right: -2, width: 18, height: 18, borderRadius: ds.radii.pill, backgroundColor: c.accentCoral, alignItems: "center", justifyContent: "center" },
  todayCircle: { borderColor: c.accentBlue },
  month: { ...ds.textStyles.subtitle, color: c.primaryText, marginVertical: ds.spacing[3] },
  body: { ...ds.textStyles.subtitle, color: c.primaryText }, meta: { ...ds.textStyles.bodySmall, color: c.secondaryText },
  control: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" }, day: { width: "14.285714%", minHeight: 54, alignItems: "center", justifyContent: "center" },
  selected: { backgroundColor: c.accentMustard, borderColor: c.accentMustard }, dot: { width: 4, height: 4, borderRadius: ds.radii.pill, backgroundColor: c.primaryText, marginTop: 2 },
  content: { gap: ds.spacing[2], paddingBottom: ds.spacing[6] },
  thumbnail: { width: ds.componentSize.cardThumb, height: ds.componentSize.cardThumb, borderRadius: ds.radii.md },
  eventCopy: { flex: 1, minWidth: 0, gap: ds.spacing[1] },
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: c.borderSoft, borderRadius: ds.radii.md, padding: ds.spacing[3], gap: ds.spacing[3], backgroundColor: c.surface },
  map: { flex: 0, height: 300, borderRadius: ds.radii.md, marginVertical: ds.spacing[3], backgroundColor: c.background },
});
