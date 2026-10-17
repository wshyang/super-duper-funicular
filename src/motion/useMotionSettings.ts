import { useState } from "react";
import { getMotionDefaults, type MotionType } from "./motions";
import type { Gait } from "./gait";
export function useMotionSettings() {
  const [motion, setMotion] = useState<MotionType>("run");
  const [settings, setSettings] = useState<Record<MotionType, Gait>>({
    run: getMotionDefaults("run"),
    walk: getMotionDefaults("walk"),
    "brisk-walk": getMotionDefaults("brisk-walk"),
  });
  function setGait(gait: Gait) {
    setSettings((previous) => ({ ...previous, [motion]: { ...gait, motion } }));
  }
  return { motion, setMotion, gait: settings[motion], setGait };
}
