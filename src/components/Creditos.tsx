import { Link } from "react-router-dom";
import { T } from "../theme.ts";

const caixa = {
  background: T.bgCard,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: "14px 16px",
  marginBottom: 12,
};

export default function Creditos() {
  return (
    <article style={{ maxWidth: 720 }}>
      <Link to="/" style={{ color: T.textMuted, fontSize: 13 }}>← catálogo</Link>

      <h2 style={{ margin: "14px 0 6px", fontSize: 26 }}>Fontes e créditos</h2>
      <p style={{ color: T.textSecondary, fontSize: 14, margin: "0 0 20px", lineHeight: 1.6 }}>
        O Blade X Lab é um projeto de fã, sem vínculo com a Takara Tomy ou a Hasbro.
      </p>

      <section style={caixa}>
        <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>De onde vêm os dados</h3>
        <p style={{ color: T.textSecondary, fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
          Os atributos de cada peça — ataque, defesa e resistência, além do peso e da
          resistência a burst — vêm em boa parte de <strong>medições feitas pela comunidade</strong>,
          e não de folha oficial da Takara Tomy. São os melhores números públicos
          disponíveis, mas podem divergir entre fontes.
        </p>
        <p style={{ color: T.textSecondary, fontSize: 13.5, lineHeight: 1.65, margin: "10px 0 0" }}>
          Cada registro do catálogo guarda a URL de onde veio, e ela aparece no
          rodapé da página de cada bey e de cada peça. Quando um dado não pôde ser
          confirmado, ele fica em branco em vez de ser estimado.
        </p>
        <ul style={{ color: T.textSecondary, fontSize: 13.5, lineHeight: 1.9, marginTop: 10 }}>
          <li><a href="https://beyblade.fandom.com" style={{ color: T.accentDim }}>Beyblade Wiki</a> — composições e lançamentos</li>
          <li><a href="https://www.beybxdb.com" style={{ color: T.accentDim }}>Beyblade X Database</a> — atributos e geometria</li>
          <li><a href="https://byybladebuilder.com/parts" style={{ color: T.accentDim }}>Byyblade Builder</a> — atributos medidos por peça</li>
          <li><a href="https://worldbeyblade.org" style={{ color: T.accentDim }}>WorldBeyblade.org</a> — discussão e correções da comunidade</li>
        </ul>
      </section>

      <section style={caixa}>
        <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Imagens</h3>
        <p style={{ color: T.textSecondary, fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
          As imagens de produto são arte oficial da Takara Tomy e da Hasbro,
          usadas aqui sem fins comerciais, para identificar os produtos num
          catálogo mantido por fãs. Todos os direitos pertencem aos respectivos
          detentores.
        </p>
        <p style={{ color: T.textSecondary, fontSize: 13.5, lineHeight: 1.65, margin: "10px 0 0" }}>
          Se você detém direitos sobre alguma imagem publicada aqui e deseja que
          ela seja removida, entre em contato pelo repositório do projeto e ela
          será retirada.
        </p>
      </section>

      <section style={caixa}>
        <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Como os números são calculados</h3>
        <p style={{ color: T.textSecondary, fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
          Os atributos exibidos para um beyblade são a <strong>soma dos atributos
          das suas peças</strong>. Nada é ponderado ou ajustado, e a origem de cada
          ponto pode ser conferida na página do bey, peça por peça.
        </p>
        <p style={{ color: T.textSecondary, fontSize: 13.5, lineHeight: 1.65, margin: "10px 0 0" }}>
          Quando a fonte publica um valor numa escala própria — como a resistência
          a burst dos bits — a conversão para a escala usada aqui fica registrada
          nas observações da peça. É derivação nossa, não dado da fonte.
        </p>
      </section>

      <section style={caixa}>
        <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Código</h3>
        <p style={{ color: T.textSecondary, fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
          O projeto é aberto:{" "}
          <a href="https://github.com/adre76/blade-lab" style={{ color: T.accentDim }}>
            github.com/adre76/blade-lab
          </a>. Correções nos dados são bem-vindas.
        </p>
      </section>
    </article>
  );
}
