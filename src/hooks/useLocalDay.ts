import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { localDayKey } from "../lib/challengeProgress";

export const useLocalDay = () => {
  const [day, setDay] = useState(() => localDayKey());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setDay(localDayKey());
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 100);
    };
    refresh();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") refresh();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  return day;
};
