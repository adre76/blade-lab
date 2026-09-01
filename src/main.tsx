import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import Catalogo from "./components/Catalogo.tsx";
import Landing from "./components/Landing.tsx";
import Faq from "./components/Faq.tsx";
import Laboratorio from "./components/Laboratorio.tsx";
import DetalheBey from "./components/DetalheBey.tsx";
import DetalhePeca from "./components/DetalhePeca.tsx";
import Creditos from "./components/Creditos.tsx";
import Login from "./components/Login.tsx";
import Perfil from "./components/Perfil.tsx";
import Inventario from "./components/Inventario.tsx";
import { AuthProvider } from "./hooks/AuthContext.tsx";
import { InventarioProvider } from "./hooks/InventarioContext.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado no index.html");

createRoot(root).render(
  <StrictMode>
    {/* InventarioProvider depende da sessão, então fica dentro do AuthProvider. */}
    <AuthProvider>
      <InventarioProvider>
        <BrowserRouter>
          <Routes>
            {/* App é o layout: cabeçalho e moldura. As telas entram no Outlet. */}
            <Route element={<App />}>
              <Route path="/" element={<Landing />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/bey/:id" element={<DetalheBey />} />
              <Route path="/peca/:id" element={<DetalhePeca />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/creditos" element={<Creditos />} />
              <Route path="/entrar" element={<Login />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/lab" element={<Laboratorio />} />
              <Route path="*" element={<Landing />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </InventarioProvider>
    </AuthProvider>
  </StrictMode>,
);
