import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css"; // ✅ updated path
import LoadingPage from "./pages/LoadingPage.jsx";
import { LanguageProvider } from "./i18n";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <LoadingPage />
    </LanguageProvider>
  </React.StrictMode>
);
