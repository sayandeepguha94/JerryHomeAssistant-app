import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

console.log("[Jerry] React mounting...");
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[Jerry] FATAL: #root element not found!");
} else {
  ReactDOM.createRoot(rootElement).render(<App />);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}
