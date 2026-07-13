import React from "react";
import { Globe2 } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export default function LanguageSwitcher({ compact = false, className = "" }) {
  const { language, setLanguage } = useI18n();
  const next = language === "fr" ? "en" : "fr";
  return <button
    type="button"
    onClick={() => setLanguage(next)}
    aria-label={language === "fr" ? "Switch to English" : "Passer en français"}
    title={language === "fr" ? "English" : "Français"}
    className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] text-[#B5BBC9] transition hover:border-[#7C4DFF]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60 ${compact ? "h-9 w-9" : "h-9 px-3 text-xs"} ${className}`}
  >
    <Globe2 className="h-4 w-4"/>
    {!compact && <span className="font-semibold uppercase">{next}</span>}
  </button>;
}
