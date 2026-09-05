import React, { useId } from "react";
import { useI18n } from "@/context/I18nContext";
import { setMotionPreference, useMotionPreference, usePipsReducedMotion } from "@/lib/motionPreference";

export default function MotionPreferenceControl() {
  const { t } = useI18n();
  const id = useId();
  const preference = useMotionPreference();
  const reduced = usePipsReducedMotion();
  return <div className="flex flex-wrap items-center gap-2 text-xs text-[#AEB4BF]">
    <label htmlFor={id}>{t("Animations", "Animations")}</label>
    <select id={id} value={preference} onChange={(event) => setMotionPreference(event.target.value)} className="max-w-full rounded-lg border border-white/10 bg-[#0B0E18] px-2 py-2 text-xs text-[#D4D7DF]">
      <option value="system">{t("Selon l’appareil", "Use device setting")}</option>
      <option value="full">{t("Activées", "Enabled")}</option>
      <option value="reduced">{t("Réduites", "Reduced")}</option>
    </select>
    {preference === "system" && reduced && <span role="status" className="basis-full text-[11px] text-[#8E96A7]">{t("Ton appareil réduit les animations.", "Your device reduces animations.")}</span>}
  </div>;
}
