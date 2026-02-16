/** @format */

import React from "react";
import { useRoute } from "@react-navigation/native";
import SessionScreen from "../components/SessionScreen";

const Session = () => {
  const route = useRoute();
  const title = ((route.params as { title?: string } | undefined)?.title ??
    "Breath Session") as string;

  return <SessionScreen title={title} />;
};

export default Session;
