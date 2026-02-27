import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");

function showFatalFallback() {
  if (!rootElement) {
    return;
  }

  rootElement.innerHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 40px auto; padding: 16px; border: 1px solid #f3b3b3; border-radius: 8px; background: #fff6f6; color: #8a1f1f;">
      MediKids could not load in this browser session. Please refresh the page. If the issue continues, clear browser cache and try again.
    </div>
  `;
}

window.addEventListener("error", () => {
  showFatalFallback();
});

window.addEventListener("unhandledrejection", () => {
  showFatalFallback();
});

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
