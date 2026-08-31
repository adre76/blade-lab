import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.ts";
import type { Database } from "../types/database.ts";

export type Perfil = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Sessão e perfil do usuário.
 *
 * Espelha o `useAuth` do Trocação, sem Facebook e sem modo anônimo — o spec §2
 * fixa somente Google. O provedor `email` aparece habilitado no projeto por ser
 * o padrão do Supabase; a interface não o expõe.
 */
/** Uso interno: consuma via `useAuth` de AuthContext.tsx, que compartilha um estado só. */
export function useAuthInterno() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarPerfil = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("erro ao carregar perfil:", error.message);
      return null;
    }
    return data;
  }, []);

  useEffect(() => {
    let cancelado = false;

    const aplicar = async (sessao: Session | null) => {
      if (cancelado) return;
      if (sessao?.user) {
        setUsuario(sessao.user);
        setPerfil(await carregarPerfil(sessao.user.id));
      } else {
        setUsuario(null);
        setPerfil(null);
      }
      if (!cancelado) setCarregando(false);
    };

    supabase.auth.getSession().then(({ data }) => aplicar(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((evento, sessao) => {
      // TOKEN_REFRESHED importa tanto quanto SIGNED_IN: a sessão restaurada de
      // um recarregamento chega pelo primeiro, não pelo segundo. Tratar só
      // SIGNED_IN deixaria o usuário deslogado ao atualizar a página.
      if (evento === "SIGNED_IN" || evento === "TOKEN_REFRESHED" || evento === "INITIAL_SESSION") {
        void aplicar(sessao);
        // O access_token volta no hash da URL depois do OAuth. Limpar evita
        // que ele fique visível na barra de endereços e no histórico.
        if (window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
      if (evento === "SIGNED_OUT") void aplicar(null);
    });

    return () => {
      cancelado = true;
      sub.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  const entrarComGoogle = useCallback(async () => {
    setErro(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // origin, e não a URL de produção fixa: fixá-la quebraria o login em
        // desenvolvimento. As duas precisam estar nas Redirect URLs do painel.
        redirectTo: window.location.origin,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setErro(
        error.message.includes("provider is not enabled")
          ? "O login com Google ainda não foi habilitado neste projeto."
          : error.message,
      );
    }
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const atualizarNome = useCallback(async (nome: string) => {
    if (!usuario) return { erro: "Não autenticado" };
    const limpo = nome.trim();
    if (!limpo) return { erro: "O nome não pode ficar vazio" };

    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: limpo })
      .eq("id", usuario.id)
      .select()
      .single();

    if (error) return { erro: error.message };
    setPerfil(data);
    return { erro: null };
  }, [usuario]);

  return { usuario, perfil, carregando, erro, entrarComGoogle, sair, atualizarNome };
}
