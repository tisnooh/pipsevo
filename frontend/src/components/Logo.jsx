import React from "react";
import { Link } from "react-router-dom";

const logoSizes = {
  sm: "h-7 w-[124px]",
  md: "h-8 w-36",
  lg: "h-11 w-[196px]",
};

const markSizes = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-10 w-10" };
const wordmarkSizes = { sm: "h-7 w-[100px]", md: "h-8 w-[114px]", lg: "h-11 w-[156px]" };

export const Logo = ({ size = "md", to = "/", className = "" }) => {
  const dimensions = logoSizes[size] || logoSizes.md;
  return <Link to={to} aria-label="PipsEvo — accueil" className={`pe-logo pe-logo--${size} inline-flex shrink-0 items-center ${dimensions} ${className}`}>
    <img src="/brand/pipsevo-icon.png" alt="" aria-hidden="true" draggable="false" className="pe-logo-symbol pointer-events-none select-none"/>
    <span className="pe-logo-word" aria-hidden="true"><span>Pips</span><span>Evo</span><span>.</span></span>
  </Link>;
};

export const LogoMark = ({ size = "md", className = "" }) => (
  <img src="/brand/pipsevo-icon.png" alt="" aria-hidden="true" draggable="false" className={`${markSizes[size] || markSizes.md} shrink-0 object-contain drop-shadow-[0_0_12px_rgba(124,77,255,.22)] ${className}`}/>
);

export const LogoWordmark = ({ size = "md", to = "/", className = "" }) => (
  <Link to={to} aria-label="PipsEvo — tableau de bord" className={`pe-logo pe-logo--${size} inline-flex shrink-0 items-center ${wordmarkSizes[size] || wordmarkSizes.md} ${className}`}>
    <span className="pe-logo-word pe-logo-word--only" aria-hidden="true"><span>Pips</span><span>Evo</span><span>.</span></span>
  </Link>
);
