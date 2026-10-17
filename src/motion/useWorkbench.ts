import { downloadCycleAudit } from "./cycle-audit";
import { defaultEndCuts } from "./photo/end-cuts";
import { defaultHipCut } from "./photo/hip-cut";
import { loadPhotoAssets, type PhotoStatus } from "./photo/assets";
import { personas, type PersonaId } from "./personas";
import { useEffect, useState } from "react";
import { useMotionSettings } from "./useMotionSettings";
import type { MotionType } from "./motions";
import { downloadSheet } from "./render";
import { usePlayback } from "./usePlayback";
export function useWorkbench() {
  const [endCuts, setEndCuts] = useState(defaultEndCuts);
  const [hipCut, setHipCut] = useState(defaultHipCut);
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>("idle");
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const retryPhoto = () => setPhotoAttempt((value) => value + 1);
  const [persona, setPersona] = useState<PersonaId>("wei-ming");
  function selectPersona(value: PersonaId) {
    setPersona(value);
    setMode("procedural");
  }
  const [mode, setMode] = useState("procedural");
  const { motion, setMotion, gait, setGait } = useMotionSettings();
  const [palette, setPalette] = useState(0);
  function selectMotion(value: MotionType) {
    setMotion(value);
    setMode("procedural");
  }
  const [skeleton, setSkeleton] = useState(false),
    [onion, setOnion] = useState(false),
    [ground, setGround] = useState(true);
  useEffect(() => {
    if (personas[persona].renderStyle !== "photo") return;
    let isActive = true;
    setPhotoStatus("loading");
    loadPhotoAssets()
      .then(() => {
        if (isActive) setPhotoStatus("ready");
      })
      .catch(() => {
        if (isActive) setPhotoStatus("error");
      });
    return () => {
      isActive = false;
    };
  }, [persona, photoAttempt]);
  const canExport =
    personas[persona].renderStyle !== "photo" || photoStatus === "ready";
  const playback = usePlayback(gait.cadence);
  const options = {
    gait,
    palette,
    persona,
    skeleton,
    photoStatus,
    hipCut,
    endCuts,
    phase: playback.phase,
  };
  const activeFrame = Math.floor(playback.phase * 8) % 8;
  const phasePercent = Math.round(playback.phase * 100);
  const frequency = (gait.cadence / 120).toFixed(2);
  function exportAudit() {
    if (canExport) downloadCycleAudit(options);
  }
  function exportSheet() {
    if (!canExport) return;
    downloadSheet({ ...options, skeleton: false });
  }
  return {
    endCuts,
    setEndCuts,
    motion,
    selectMotion,
    hipCut,
    setHipCut,
    canExport,
    retryPhoto,
    mode,
    setMode,
    persona,
    selectPersona,
    gait,
    setGait,
    palette,
    setPalette,
    skeleton,
    setSkeleton,
    onion,
    setOnion,
    ground,
    setGround,
    playback,
    options,
    activeFrame,
    phasePercent,
    frequency,
    exportSheet,
    exportAudit,
  };
}
export type Workbench = ReturnType<typeof useWorkbench>;
