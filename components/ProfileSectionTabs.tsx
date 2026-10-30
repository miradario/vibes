import React from "react";
import SegmentedControl from "./ui/SegmentedControl";

const OPTIONS = [
  { key: "0", label: "Identidad" },
  { key: "1", label: "Intereses" },
  { key: "2", label: "Planes" },
] as const;

/** Tabs de Ajustes y Preguntas: SegmentedControl del DS (decisión Agus 29/10). */
export default function ProfileSectionTabs({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <SegmentedControl options={OPTIONS} selected={String(value) as "0" | "1" | "2"} onChange={(key) => onChange(Number(key))} />;
}
