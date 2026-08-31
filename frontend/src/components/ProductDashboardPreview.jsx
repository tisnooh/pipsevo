import React, { useLayoutEffect, useRef } from "react";

const PREVIEW_WIDTH = 1600;
const PREVIEW_HEIGHT = 900;

const CAPTURE_IMAGES = {
  overview: "/brand/product-captures/dashboard.png",
  journal: "/brand/product-captures/journal.png",
  discipline: "/brand/product-captures/discipline.png",
  backtest: "/brand/product-captures/backtest.png",
  coach: "/brand/product-captures/atlas.png",
  payouts: "/brand/product-captures/payouts.png",
};

const CAPTURE_LABELS = {
  overview: "tableau de bord",
  journal: "journal de trading",
  discipline: "discipline et règles de risque",
  backtest: "simulateur de stratégie",
  coach: "Atlas, coach d'analyse comportementale",
  payouts: "suivi des payouts",
};

export default function ProductDashboardPreview({
  variant = "hero",
  activeSection = "overview",
  accent = "#7C4DFF",
  className = "",
}) {
  const previewRef = useRef(null);
  const capture = CAPTURE_IMAGES[activeSection] || CAPTURE_IMAGES.overview;
  const label = CAPTURE_LABELS[activeSection] || CAPTURE_LABELS.overview;

  useLayoutEffect(() => {
    const preview = previewRef.current;
    if (!preview) return undefined;

    const updateScale = () => {
      preview.style.setProperty("--preview-scale", String(preview.clientWidth / PREVIEW_WIDTH));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={previewRef}
      className={`product-dashboard-preview product-dashboard-preview--capture product-dashboard-preview--${variant} ${className}`}
      role="img"
      aria-label={`Capture réelle de PipsEvo — ${label}, avec des données de démonstration anonymisées`}
      style={{ "--preview-accent": accent }}
    >
      <div
        className="product-dashboard-preview__scale"
        style={{ "--preview-width": `${PREVIEW_WIDTH}px`, "--preview-height": `${PREVIEW_HEIGHT}px` }}
      >
        <img
          key={capture}
          src={capture}
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable="false"
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
        />
      </div>
    </div>
  );
}
