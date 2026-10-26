import type { LearningProfile } from "./types";

// Read-only examples for development. Never persisted to Supabase.
const examples: LearningProfile[] = [
  {
    id: "dev-example-teacher-lucia",
    kind: "teacher",
    name: "EJEMPLO · Lucía Fernández",
    description: "Perfil ficticio de desarrollo. Profesora de yoga y meditación, con prácticas suaves para empezar. Este ejemplo no ofrece inscripciones reales.",
    specialties: ["Yoga", "Meditación"],
    image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600",
    cover_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1000",
    location: "Palermo · Buenos Aires",
    modality: "mixed",
    published: true,
  },
  {
    id: "dev-example-teacher-tomas",
    kind: "teacher",
    name: "EJEMPLO · Tomás Ruiz",
    description: "Perfil ficticio de desarrollo. Profesor de respiración consciente y meditación, con encuentros online. Este ejemplo no ofrece inscripciones reales.",
    specialties: ["Respiración", "Meditación"],
    image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600",
    cover_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1000",
    location: "Online",
    modality: "online",
    published: true,
  },
];

export function withDevelopmentProfiles(profiles: LearningProfile[], development: boolean): LearningProfile[] {
  if (!development) return profiles;
  const ids = new Set(profiles.map((profile) => profile.id));
  return [...profiles, ...examples.filter((profile) => !ids.has(profile.id))];
}
