import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SettingsProvider } from "./settings/SettingsContext";
import { App } from "./ui/App";
import "./styles/theme.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);
