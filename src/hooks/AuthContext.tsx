import { createContext, useContext, type ReactNode } from "react";
import { useAuthInterno } from "./useAuth.ts";

type Auth = ReturnType<typeof useAuthInterno>;

const Contexto = createContext<Auth | null>(null);

/**
 * Sessão compartilhada por toda a aplicação.
 *
 * Sem o contexto, cada componente que chamasse o hook abriria seu próprio
 * `onAuthStateChange` e manteria seu próprio estado — o cabeçalho poderia
 * mostrar o usuário logado enquanto o card do catálogo ainda o achasse
 * anônimo, e cada um faria sua consulta de perfil.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthInterno();
  return <Contexto.Provider value={auth}>{children}</Contexto.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
