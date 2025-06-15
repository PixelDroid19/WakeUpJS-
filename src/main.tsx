import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import React from "react";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";

// Renderizar la aplicación principal
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);

// Integración de stagewise toolbar solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  import('@stagewise/toolbar').then(({ initToolbar }) => {
    const stagewiseConfig = {
      plugins: []
    };
    
    // Crear elemento para el toolbar
    const toolbarElement = document.createElement('div');
    toolbarElement.id = 'stagewise-toolbar';
    document.body.appendChild(toolbarElement);
    
    // Inicializar toolbar
    initToolbar(stagewiseConfig);
  }).catch((error) => {
    console.warn('Stagewise toolbar no se pudo cargar:', error);
  });
}

postMessage({ payload: "removeLoading" }, "*");
