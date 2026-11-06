/**
 * Datos de ejemplo para el diseño de la home de clases del alumno referido
 * (Trello sP8UXNC3 / wireframe vibes-home-alumno). Sin backend.
 *
 * La semana del mock es fija (9–15 nov 2026) para que la UI no dependa del día real.
 */

import type { EventFeedItem } from "../queries/events.queries";

export type MockWeekDay = {
  /** ISO date YYYY-MM-DD (mediodía local implícito). */
  date: string;
  /** Letra corta: L M X J V S D. */
  letter: string;
  weekdayLabel: string;
  dayNumber: number;
  hasClass: boolean;
};

export type MockClassRow = {
  id: string;
  date: string;
  /** Ej. "Mié 11". */
  dateLabel: string;
  /** Ej. "10:00". */
  timeLabel: string;
  title: string;
  hostName: string;
  /** Lugar (calendario / detalle). */
  locationLabel: string;
};

export type MockNextClass = {
  id: string;
  title: string;
  /** Ej. "Mañana · 10:00 a 11:00". */
  whenLabel: string;
  teacherLabel: string;
  locationLabel: string;
  imageUri: string | null;
};

export type MockLinkedHost = {
  id: string;
  name: string;
  /** Tag bajo el nombre: Principal / Institución / Profesor. */
  tag: string;
  kind: "teacher" | "institution";
  imageUri: string | null;
};

export type StudentClassesHomeMock = {
  studentFirstName: string;
  /** Subtítulo bajo el saludo (profesor o institución de entrada). */
  contextSubtitle: string;
  nextClass: MockNextClass;
  week: MockWeekDay[];
  /** Día "hoy" del mock (debe existir en `week`). */
  todayDate: string;
  weekClasses: MockClassRow[];
  hosts: MockLinkedHost[];
};

/** Semana de ejemplo alineada al wireframe (hoy = miércoles 11). */
export const STUDENT_CLASSES_HOME_MOCK: StudentClassesHomeMock = {
  studentFirstName: "Juan",
  contextSubtitle: "Tus clases con María López",
  todayDate: "2026-11-11",
  nextClass: {
    id: "next-yoga-vinyasa",
    title: "Yoga Vinyasa",
    whenLabel: "Mañana · 10:00 a 11:00",
    teacherLabel: "Prof. María López",
    locationLabel: "Estudio Prana, Cañuelas",
    imageUri: null,
  },
  week: [
    { date: "2026-11-09", letter: "L", weekdayLabel: "Lunes", dayNumber: 9, hasClass: false },
    { date: "2026-11-10", letter: "M", weekdayLabel: "Martes", dayNumber: 10, hasClass: false },
    { date: "2026-11-11", letter: "X", weekdayLabel: "Miércoles", dayNumber: 11, hasClass: true },
    { date: "2026-11-12", letter: "J", weekdayLabel: "Jueves", dayNumber: 12, hasClass: false },
    { date: "2026-11-13", letter: "V", weekdayLabel: "Viernes", dayNumber: 13, hasClass: true },
    { date: "2026-11-14", letter: "S", weekdayLabel: "Sábado", dayNumber: 14, hasClass: true },
    { date: "2026-11-15", letter: "D", weekdayLabel: "Domingo", dayNumber: 15, hasClass: false },
  ],
  weekClasses: [
    {
      id: "class-1",
      date: "2026-11-11",
      dateLabel: "Mié 11",
      timeLabel: "10:00",
      title: "Yoga Vinyasa",
      hostName: "María López",
      locationLabel: "Estudio Prana, Cañuelas",
    },
    {
      id: "class-2",
      date: "2026-11-13",
      dateLabel: "Vie 13",
      timeLabel: "19:00",
      title: "Yoga Restaurativo",
      hostName: "María López",
      locationLabel: "Estudio Prana, Cañuelas",
    },
    {
      id: "class-3",
      date: "2026-11-14",
      dateLabel: "Sáb 14",
      timeLabel: "09:30",
      title: "Meditación guiada",
      hostName: "Centro Ananda",
      locationLabel: "Centro Ananda",
    },
  ],
  hosts: [
    { id: "host-maria", name: "María López", tag: "Principal", kind: "teacher", imageUri: null },
    { id: "host-ananda", name: "Centro Ananda", tag: "Institución", kind: "institution", imageUri: null },
    { id: "host-lucas", name: "Lucas Pérez", tag: "Profesor", kind: "teacher", imageUri: null },
  ],
};

/**
 * Mapea las clases del mock a `EventFeedItem` para reutilizar `EventCalendar`
 * (misma grilla/lista que Eventos). Solo __DEV__.
 */
export function studentClassesAsCalendarFeed(): EventFeedItem[] {
  return STUDENT_CLASSES_HOME_MOCK.weekClasses.map((row) => {
    const [year, month, day] = row.date.split("-").map(Number);
    const [hour, minute] = row.timeLabel.split(":").map(Number);
    const startsAt = new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
    return {
      id: row.id,
      type: "event" as const,
      title: row.title,
      subtitle: row.hostName,
      date: row.dateLabel,
      startsAt,
      attendees: "",
      image: "",
      location: row.locationLabel,
      hostName: row.hostName,
    };
  });
}
