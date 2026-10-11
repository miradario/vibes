import React from "react";
import { createRoot } from "react-dom/client";
import { Preview } from "./runtime";
import {
  LearningExplore,
  LearningProfileDetail,
  LearningActivityDetail,
  LearningMine,
  LearningManage,
  LearningRoster,
  LearningProfileEditor,
  LearningActivityEditor,
} from "../../screens/Learning";
const screens = {
  LearningExplore,
  LearningProfile: LearningProfileDetail,
  LearningActivity: LearningActivityDetail,
  LearningMine,
  LearningManage,
  LearningRoster,
  LearningProfileEditor,
  LearningActivityEditor,
};
fetch("/api/users")
  .then((r) => r.json())
  .then((users) =>
    createRoot(document.getElementById("root")!).render(
      <Preview screens={screens} users={users} />
    )
  );
