import { Navigate, useLocation } from "react-router-dom";
import { T } from "../theme.ts";
import { destinoDaRaiz } from "../lib/rotas.ts";

export default function Landing() {
  const { search } = useLocation();
  const destino = destinoDaRaiz(search);
  // `replace` e não `push`: o link antigo não deve ficar no histórico, senão o
  // botão voltar devolve a pessoa para o redirecionamento e ela fica presa.
  if (destino) return <Navigate to={destino} replace />;

  return (
    <section>
      <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>Blade X Lab</h2>
      <p style={{ color: T.textSecondary, fontSize: 14 }}>
        Catálogo, inventário e laboratório de Beyblade X.
      </p>
    </section>
  );
}
