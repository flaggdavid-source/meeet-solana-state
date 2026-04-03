import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => {
      registration.update();
    }, 60_000);
  },
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
