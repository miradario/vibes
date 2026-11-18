import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ChevronRight, MapPin } from "lucide-react-native";
import { Text, TextInput } from "../Typography";
import Icon from "../Icon";
import { Button, Chips, Empty, Photo, ui } from "../learning/LearningUI";
import { cardStyles } from "../ui/surfaceStyles";
import { useProfessionals } from "../../src/sessions/sessionsQueries";
import { filterProfessionals, professionalSpecialties } from "../../src/sessions/professionals";
import { sessionError } from "../../src/sessions/sessions";
import * as ds from "../../src/theme/tokens";

/** Explorar › Sesiones: published and approved profiles with active session availability
 * (profiles that only give classes don't show up here). */
export default function ProfessionalsExplore() {
  const nav = useNavigation<any>();
  const query = useProfessionals();
  const [specialty, setSpecialty] = useState("");
  const [search, setSearch] = useState("");
  if (query.isLoading) return <View style={ui.notice}><ActivityIndicator color={ds.colors.base.blue} /><Text style={ui.body}>Cargando profesionales…</Text></View>;
  if (query.isError) return <View style={[ui.notice, ui.error]}><Text accessibilityRole="alert" style={ui.body}>{sessionError(query.error)}</Text><Button secondary label="Reintentar" onPress={() => void query.refetch()} /></View>;
  const profiles = query.data ?? [];
  const specialties = professionalSpecialties(profiles);
  const shown = filterProfessionals(profiles, specialty, search);
  return (
    <View style={s.list}>
      <View style={s.search}>
        <Icon name="search" size={ds.iconSize.md} color={ds.colors.text.secondary} />
        <TextInput accessibilityLabel="Buscar sesiones con profesionales" placeholder="Buscá por nombre o práctica" placeholderTextColor={ds.colors.text.secondary}
          value={search} onChangeText={setSearch} style={s.searchInput} returnKeyType="search" />
        {search ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch("")} style={s.clear}><Icon name="close" size={ds.iconSize.md} color={ds.colors.text.secondary} /></TouchableOpacity> : null}
      </View>
      {specialties.length ? <Chips value={specialty} onChange={setSpecialty} options={[{ value: "", label: "Todas las especialidades" }, ...specialties.map((value) => ({ value, label: value }))]} /> : null}
      {shown.map((profile) => (
        <TouchableOpacity key={profile.id} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${profile.name}`} activeOpacity={ds.opacity.pressed}
          onPress={() => nav.navigate("ProfessionalDetail", { id: profile.id })} style={[cardStyles.base, cardStyles.padding, ui.row]}>
          <Photo key={profile.image_url} url={profile.image_url} />
          <View style={ui.grow}>
            <Text style={s.name}>{profile.name}</Text>
            {profile.specialties.length ? <Text style={s.meta}>{profile.specialties.join(" · ")}</Text> : null}
            {profile.location ? <Text style={s.meta}><MapPin size={ds.iconSize.sm} color={ds.colors.text.secondary} /> {profile.location}</Text> : null}
            <View style={ui.row}><Text style={s.link}>Ver disponibilidad</Text><ChevronRight size={ds.iconSize.md} color={ds.colors.icon.default} /></View>
          </View>
        </TouchableOpacity>
      ))}
      {!shown.length ? (
        <Empty text={specialty || search ? "No encontramos profesionales con ese filtro. Probá con otra especialidad." : "Todavía no hay profesionales con turnos disponibles. Volvé pronto."} />
      ) : null}
      {specialty || search ? <Button secondary label="Limpiar filtros" onPress={() => { setSpecialty(""); setSearch(""); }} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  list: { gap: ds.spacing[3] },
  search: { flexDirection: "row", alignItems: "center", gap: ds.spacing[2], minHeight: ds.componentSize.button.md, paddingHorizontal: ds.spacing[4], borderRadius: ds.radii.pill, borderWidth: 1, borderColor: ds.colors.border.default, backgroundColor: ds.colors.bg.surface },
  searchInput: { flex: 1, ...ds.textStyles.body, color: ds.colors.text.primary },
  clear: { width: ds.touchTarget, height: ds.touchTarget, alignItems: "center", justifyContent: "center" },
  name: { ...ds.textStyles.subtitle, color: ds.colors.text.primary },
  meta: { ...ds.textStyles.bodySmall, color: ds.colors.text.secondary },
  link: { ...ds.textStyles.label, color: ds.colors.text.primary },
});
