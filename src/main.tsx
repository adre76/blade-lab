import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import Catalogo from "./components/Catalogo.tsx";
import DetalheBey from "./components/DetalheBey.tsx";
import DetalhePeca from "./components/DetalhePeca.tsx";
import Creditos from "./components/Creditos.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado no index.html");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* App é o layout: cabeçalho e moldura. As telas entram no Outlet. */}
        <Route element={<App />}>
          <Route path="/" element={<Catalogo />} />
          <Route path="/bey/:id" element={<DetalheBey />} />
          <Route path="/peca/:id" element={<DetalhePeca />} />
          <Route path="/creditos" element={<Creditos />} />
          {/* Rotas autenticadas (/inventario, /combos) entram na Onda 2;
              /lab entra na Onda 3. */}
          <Route path="*" element={<Catalogo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
