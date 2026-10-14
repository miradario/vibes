import React from "react";
import RangeSlider from "./RangeSlider";

export default function EnergySlider({ label, value, disabled = false, onChange }: {
  label: string;
  value?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return <RangeSlider single label={label} minimum={1} maximum={10}
    lower={1} upper={value ?? null} unit="" disabled={disabled}
    onChange={(_, score) => onChange(score)} />;
}
