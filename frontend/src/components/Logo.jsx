import React from "react";
import { Link } from "react-router-dom";

export const Logo = ({ size = "md" }) => {
  const text = size === "lg" ? "text-2xl" : "text-xl";
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight">
      <LogoMark />
      <span className={`${text} text-white`}>PipsEvo<span className="text-[#7C4DFF]">.</span></span>
    </Link>
  );
};

export const LogoMark = () => (
  <span className="inline-block w-7 h-7 relative">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C4DFF" />
          <stop offset="100%" stopColor="#4F8CFF" />
        </linearGradient>
      </defs>
      <path d="M6 4 L10 4 L10 8 L8 8 L8 24 L10 24 L10 28 L6 28 Z" fill="url(#lg1)" />
      <path d="M26 4 L22 4 L22 8 L24 8 L24 24 L22 24 L22 28 L26 28 Z" fill="url(#lg1)" />
    </svg>
  </span>
);
