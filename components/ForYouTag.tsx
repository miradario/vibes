import React from "react";
import Tag from "./ui/Tag";

// "Para ti" pill for the item picked by pickFeaturedItem (src/lib/homePersonalization).
// Decisión Agus 29/10: todas las etiquetas informativas usan el Tag azul del DS.
export default function ForYouTag() {
  return <Tag label="Para ti" />;
}
