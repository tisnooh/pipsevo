import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle({ className = "" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || !resolvedTheme) return;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute("content", resolvedTheme === "light" ? "#F4F6FB" : "#050505");
  }, [mounted, resolvedTheme]);

  const light = mounted && resolvedTheme === "light";
  const label = light ? "Activer le mode sombre" : "Activer le mode clair";

  return <button
    type="button"
    className={`pe-theme-toggle ${className}`}
    onClick={() => setTheme(light ? "dark" : "light")}
    aria-label={label}
    title={label}
    data-testid="theme-toggle"
  >
    <span className="pe-theme-toggle-icon" aria-hidden="true">
      {light ? <Moon /> : <Sun />}
    </span>
    <span className="pe-theme-toggle-label">{light ? "Sombre" : "Clair"}</span>
  </button>;
}
