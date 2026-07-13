import React from "react";
import { Link } from "react-router-dom";

const logoSizes = {
  sm: "h-7 w-[124px]",
  md: "h-8 w-36",
  lg: "h-11 w-[196px]",
};

const markSizes = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-10 w-10" };

export const Logo = ({ size = "md", to = "/", className = "" }) => {
  const dimensions = logoSizes[size] || logoSizes.md;
  return <Link to={to} aria-label="PipsEvo — accueil" className={`inline-flex shrink-0 items-center ${dimensions} ${className}`}>
    <img src="/brand/pipsevo-logo.png" alt="PipsEvo" draggable="false" className="pointer-events-none h-full w-full select-none object-contain object-left"/>
  </Link>;
};

export const LogoMark = ({ size = "md", className = "" }) => (
  <img src="/brand/pipsevo-icon.png" alt="" aria-hidden="true" draggable="false" className={`${markSizes[size] || markSizes.md} shrink-0 object-contain drop-shadow-[0_0_12px_rgba(124,77,255,.22)] ${className}`}/>
);
