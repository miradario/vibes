import React from "react";
import RangeSlider from "./RangeSlider";

/** Slider de un valor (components-spec §1.7): RangeSlider con `single`. */
export default function Slider(props: Omit<React.ComponentProps<typeof RangeSlider>, "single" | "lower">) {
  return <RangeSlider {...props} lower={props.minimum} single />;
}
export { RangeSlider };
