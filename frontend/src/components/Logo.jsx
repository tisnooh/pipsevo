import React from "react";
import { Link } from "react-router-dom";

const logoSizes = {
  sm: { frame: "h-7 w-[116px]", image: "w-[176px] -left-8 -top-[34px]" },
  md: { frame: "h-[34px] w-[142px]", image: "w-[216px] -left-10 -top-[42px]" },
  lg: { frame: "h-[42px] w-[174px]", image: "w-[264px] -left-12 -top-[52px]" },
};

const markSizes = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-10 w-10" };

export const Logo = ({ size = "md", to = "/", className = "" }) => {
  const config = logoSizes[size] || logoSizes.md;
  return <Link to={to} aria-label="PipsEvo" className={`relative inline-block shrink-0 overflow-hidden ${config.frame} ${className}`}>
    <img src="/brand/pipsevo-logo.png" alt="PipsEvo" draggable="false" className={`pointer-events-none absolute h-auto max-w-none select-none mix-blend-lighten ${config.image}`}/>
  </Link>;
};

export const LogoMark = ({ size = "md", className = "" }) => (
  <img src="/brand/pipsevo-icon.png" alt="" aria-hidden="true" draggable="false" className={`${markSizes[size] || markSizes.md} shrink-0 rounded-[24%] object-cover shadow-[0_0_18px_rgba(124,77,255,.12)] ${className}`}/>
);
