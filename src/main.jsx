import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { initSessionListener } from "./admin/sessionStore";
import "./index.css";

// Escucha de sesión del admin (antes del primer render para evitar parpadeos)
initSessionListener();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
