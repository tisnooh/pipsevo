import React from "react";

// Chandelier décoratif 3D : corps lumineux et mèches fines.
export const Candle = ({ color = "purple", height = 80, className = "", rot = 0, style = {} }) => {
  const cls = `candle-3d candle-${color} ${className}`;
  return <div className={cls} style={{ height, "--rot": `${rot}deg`, ...style }} />;
};
