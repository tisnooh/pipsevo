import React, { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { tradeScreenshots } from "@/lib/api";
import { isRemoteImageUrl } from "@/lib/tradeMedia";

export default function PrivateTradeImage({ path, alt, className = "" }) {
  const [src, setSrc] = useState(() => isRemoteImageUrl(path) ? path : "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    if (!path) { setSrc(""); return () => { active = false; }; }
    if (isRemoteImageUrl(path)) { setSrc(path); return () => { active = false; }; }
    setSrc("");
    tradeScreenshots.signedUrl(path).then((url) => {
      if (active) setSrc(url);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [path]);

  if (failed) return <div className={`grid place-items-center bg-[#0F1117] text-[#687183] ${className}`}><ImageOff className="h-5 w-5"/><span className="sr-only">Image indisponible</span></div>;
  if (!src) return <div className={`animate-pulse bg-white/[0.04] ${className}`} aria-label="Chargement de la capture"/>;
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)}/>;
}
