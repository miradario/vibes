/** @format */

import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { IconT } from "../types";
import * as ds from "../src/theme/tokens";

const Icon = ({ color, name, size, style }: IconT) => (
  <Ionicons name={name} size={size ?? ds.iconSize.lg} color={color} style={style} />
);

export default Icon;
