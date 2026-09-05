import { useSyncExternalStore } from "react";

export const MOTION_STORAGE_KEY = "pipsevo-motion";
const CHANGE_EVENT = "pipsevo-motion-change";
const validPreferences = new Set(["system", "full", "reduced"]);

export function getMotionPreference() {
  try {
    const value = window.localStorage.getItem(MOTION_STORAGE_KEY);
    return validPreferences.has(value) ? value : "system";
  } catch { return "system"; }
}

export function isMotionReduced() {
  const preference = getMotionPreference();
  return preference === "reduced" || (preference === "system"
    && typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true);
}

export function syncMotionAttribute() {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.motion = isMotionReduced() ? "reduced" : "full";
  }
}

export function setMotionPreference(value) {
  if (!validPreferences.has(value)) return;
  try { window.localStorage.setItem(MOTION_STORAGE_KEY, value); } catch { return; }
  syncMotionAttribute();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback) {
  const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const update = () => { syncMotionAttribute(); callback(); };
  const onStorage = (event) => {
    if (event.key === MOTION_STORAGE_KEY || event.key === null) update();
  };
  window.addEventListener(CHANGE_EVENT, update);
  window.addEventListener("storage", onStorage);
  media?.addEventListener?.("change", update);
  return () => {
    window.removeEventListener(CHANGE_EVENT, update);
    window.removeEventListener("storage", onStorage);
    media?.removeEventListener?.("change", update);
  };
}

export const useMotionPreference = () => useSyncExternalStore(subscribe, getMotionPreference, () => "system");
export const usePipsReducedMotion = () => useSyncExternalStore(subscribe, isMotionReduced, () => true);
