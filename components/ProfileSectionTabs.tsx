import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import { sectionTabStyles as s } from "./SectionTabStyles";

export default function ProfileSectionTabs({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <View accessibilityRole="tablist" style={s.tabs}>
    {["Identidad", "Intereses", "Planes"].map((label, index) => <TouchableOpacity key={label}
      accessibilityRole="tab" accessibilityState={{ selected: value === index }}
      onPress={() => onChange(index)} style={[s.tab, value === index && s.active]}>
      <Text style={[s.text, value === index && s.activeText]}>{label}</Text>
    </TouchableOpacity>)}
  </View>;
}
