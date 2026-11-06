/**
 * Diseño-only: home de clases para un alumno que entró por link de profesor/institución.
 * Datos fake en `studentClassesHomeMock`. En __DEV__ reemplaza el contenido del tab Clases
 * (bottom bar visible, sin chevron back). Ver ClassesTab en Activities.tsx.
 */
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { BookOpen } from "lucide-react-native";
import { Text } from "../components/Typography";
import ScreenContainer from "../components/ScreenContainer";
import SectionHeader from "../components/ui/SectionHeader";
import ListItem from "../components/ui/ListItem";
import PersonCard from "../components/ui/PersonCard";
import WeekDayCell from "../components/ui/WeekDayCell";
import { cardStyles } from "../components/ui/surfaceStyles";
import Icon from "../components/Icon";
import {
  STUDENT_CLASSES_HOME_MOCK,
  type MockClassRow,
} from "../src/learning/studentClassesHomeMock";
import { getBottomTabContentPadding } from "../src/lib/tabBarLayout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ds from "../src/theme/tokens";

const mock = STUDENT_CLASSES_HOME_MOCK;

export default function StudentClassesHomeMock() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(mock.todayDate);

  const rows = useMemo(() => {
    const forDay = mock.weekClasses.filter((row) => row.date === selectedDate);
    return forDay.length ? forDay : mock.weekClasses;
  }, [selectedDate]);

  const showingFiltered = mock.weekClasses.some((row) => row.date === selectedDate);

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getBottomTabContentPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text
            style={styles.devBadge}
            accessibilityLabel="Vista de diseño con datos de ejemplo"
          >
            Diseño · datos de ejemplo
          </Text>
          <Text
            style={styles.greeting}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            accessibilityRole="header"
          >
            {`Hola, ${mock.studentFirstName}`}
          </Text>
          <Text style={styles.subtitle}>{mock.contextSubtitle}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Próxima clase</Text>
          <NextClassCard />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Mis clases esta semana"
            onPress={() => {}}
            accessibilityLabel="Ver calendario"
          />
          <View style={styles.weekStrip} accessibilityRole="tablist">
            {mock.week.map((day) => (
              <WeekDayCell
                key={day.date}
                letter={day.letter}
                dayNumber={day.dayNumber}
                selected={day.date === selectedDate}
                hasClass={day.hasClass}
                accessibilityLabel={`${day.weekdayLabel} ${day.dayNumber}${day.hasClass ? ", con clases" : ""}`}
                onPress={() => setSelectedDate(day.date)}
              />
            ))}
          </View>
          <View style={styles.classList}>
            {rows.map((row, index) => (
              <ClassRow key={row.id} row={row} divider={index < rows.length - 1} />
            ))}
            {!showingFiltered ? (
              <Text style={styles.emptyDay}>
                No tenés clases este día. Mostramos el resto de la semana.
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Tus profesores e instituciones" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hostsRow}
          >
            {mock.hosts.map((host) => (
              <PersonCard
                key={host.id}
                name={host.name}
                tag={host.tag}
                source={null}
                onPress={() => {}}
                accessibilityLabel={`${host.name}, ${host.tag}`}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function NextClassCard() {
  const next = mock.nextClass;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle de ${next.title}`}
      activeOpacity={ds.opacity.pressed}
      onPress={() => {}}
      style={styles.nextCard}
    >
      <View
        style={styles.nextMedia}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <BookOpen color={ds.colors.base.mustard} size={ds.iconSize.xl} />
      </View>
      <View style={styles.nextCopy}>
        <Text style={styles.nextTitle} numberOfLines={2}>
          {next.title}
        </Text>
        <Text style={styles.nextMeta}>{next.whenLabel}</Text>
        <Text style={styles.nextMeta}>{next.teacherLabel}</Text>
        <Text style={styles.nextMeta}>{next.locationLabel}</Text>
      </View>
      <Icon
        name="chevron-forward"
        size={ds.iconSize.md}
        color={ds.colors.icon.muted}
      />
    </TouchableOpacity>
  );
}

function ClassRow({ row, divider }: { row: MockClassRow; divider: boolean }) {
  return (
    <ListItem
      title={row.title}
      subtitle={row.hostName}
      size="lg"
      divider={divider}
      trailing={{ type: "chevron" }}
      onPress={() => {}}
      accessibilityLabel={`${row.title}, ${row.dateLabel} a las ${row.timeLabel}, ${row.hostName}`}
      leading={
        <View style={styles.dateLead}>
          <Text style={styles.dateLeadDay}>{row.dateLabel}</Text>
          <Text style={styles.dateLeadTime}>{row.timeLabel}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.colors.bg.screen },
  devBadge: {
    ...ds.textStyles.caption,
    color: ds.colors.text.secondary,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: ds.spacing[6],
    paddingTop: ds.spacing[2],
    gap: ds.spacing[6],
  },
  hero: { gap: ds.spacing[2] },
  greeting: {
    ...ds.textStyles.display,
    color: ds.colors.text.primary,
  },
  subtitle: {
    ...ds.textStyles.bodySmall,
    color: ds.colors.text.secondary,
  },
  section: { gap: ds.spacing[3] },
  sectionEyebrow: {
    ...ds.textStyles.label,
    color: ds.colors.text.secondary,
  },
  nextCard: {
    ...cardStyles.base,
    ...cardStyles.padding,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    borderWidth: 2,
    borderColor: ds.colors.border.default,
  },
  nextMedia: {
    width: ds.componentSize.cardThumb,
    height: ds.componentSize.cardThumb,
    borderRadius: ds.radii.md,
    backgroundColor: ds.colors.bg.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  nextCopy: { flex: 1, gap: ds.spacing[1], minWidth: 0 },
  nextTitle: {
    ...ds.textStyles.heading,
    color: ds.colors.text.primary,
  },
  nextMeta: {
    ...ds.textStyles.bodySmall,
    color: ds.colors.text.secondary,
  },
  weekStrip: {
    flexDirection: "row",
    gap: ds.spacing[1],
  },
  classList: {
    ...cardStyles.base,
    overflow: "hidden",
  },
  emptyDay: {
    ...ds.textStyles.bodySmall,
    color: ds.colors.text.secondary,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
  },
  hostsRow: {
    gap: ds.spacing[3],
    paddingVertical: ds.spacing[1],
  },
  dateLead: {
    minWidth: 64,
    gap: ds.spacing[1],
  },
  dateLeadDay: {
    ...ds.textStyles.label,
    color: ds.colors.text.primary,
  },
  dateLeadTime: {
    ...ds.textStyles.caption,
    color: ds.colors.text.secondary,
  },
});
