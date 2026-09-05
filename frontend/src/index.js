import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { MotionProvider } from "@/components/motion/MotionSystem";
import { syncMotionAttribute } from "@/lib/motionPreference";

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
    <QueryClientProvider client={queryClient}>
      <MotionProvider><App /></MotionProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
