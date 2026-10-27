export type Modality = "in_person" | "online" | "mixed";
export type LearningProfile = {
  id: string;
  kind: "teacher" | "place";
  name: string;
  description: string;
  specialties: string[];
  image_url: string | null;
  cover_url: string | null;
  location: string;
  location_details?: string;
  latitude?: number | null;
  longitude?: number | null;
  account_user_id?: string | null;
  modality: Modality;
  published: boolean;
};
export type LearningSession = {
  id: string;
  activity_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
};
export type LearningActivity = {
  id: string;
  organizer_id: string;
  kind: "class" | "course";
  title: string;
  description: string;
  image_url: string | null;
  teacher_ids: string[];
  place_id: string | null;
  modality: Modality;
  location: string;
  timezone: string;
  capacity: number;
  reserved_count: number;
  schedule_locked: boolean;
  booking_modes?: string[];
  price: number;
  currency: string;
  status: "draft" | "published" | "cancelled" | "completed";
};
export type Enrollment = {
  id: string;
  activity_id: string;
  user_id: string;
  status: "confirmed" | "cancelled";
  payment_status: "not_required";
};
export type RosterStudent = {
  id: string;
  name: string;
  status: "confirmed" | "cancelled";
  attendance: { session_id: string; present: boolean }[];
};
export type LearningData = {
  access: { enabled: boolean; can_create: boolean; managed_ids: string[] };
  profiles: LearningProfile[];
  activities: LearningActivity[];
  sessions: LearningSession[];
  links: { teacher_id: string; place_id: string }[];
  enrollments: Enrollment[];
};
export type ActivityInput = Omit<
  LearningActivity,
  "id" | "status" | "reserved_count" | "schedule_locked"
> & { sessions: Omit<LearningSession, "id" | "activity_id">[] };
