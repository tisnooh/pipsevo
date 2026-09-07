import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BacktestHome from "../src/features/backtest/BacktestHome";
import BacktestSession from "../src/features/backtest/BacktestSession";
import "../src/index.css";

createRoot(document.getElementById("root")).render(<BrowserRouter><div style={{ padding: 12, background: "#3b2c10", color: "#ffd98d", textAlign: "center", fontSize: 13 }}>ENVIRONNEMENT DE TEST LOCAL · données synthétiques · aucun compte réel</div><Routes><Route path="/app/backtest/session/:sessionId" element={<BacktestSession/>}/><Route path="*" element={<BacktestHome/>}/></Routes></BrowserRouter>);
