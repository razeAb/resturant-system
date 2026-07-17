import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css"; // ✅ updated path
import "leaflet/dist/leaflet.css";
import LoadingPage from "./pages/LoadingPage.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LoadingPage />
  </React.StrictMode>
);
