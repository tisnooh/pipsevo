import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import "@/index.css";
import App from "@/App";
import { MotionProvider } from "@/components/motion/MotionSystem";
import { syncMotionAttribute } from "@/lib/motionPreference";

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

syncMotionAttribute();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="pipsevo-theme" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <MotionProvider><App /></MotionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
