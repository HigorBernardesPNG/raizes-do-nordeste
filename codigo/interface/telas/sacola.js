import {
  criarElemento,
  criarTitulo,
  criarLink,
  formatarPreco,
} from "../componentes/elementos";
import { criarFormularioItem } from "../componentes/formulario-item";

export function montarSacola(resumo, acoes) {
  const elemento = criarElemento("section");
  const ouvintes = new AbortController();
  const formularios = [];
  elemento.append(
    criarTitulo("Minha sacola"),
    criarElemento(
      "p",
      `${resumo.unidade.nome} · ${resumo.unidade.cidade}/${resumo.unidade.uf}`,
      "texto-apoio",
    ),
    criarLink("Trocar unidade", "#/unidades"),
  );
  if (!resumo.itens.length) {
    elemento.append(
      criarElemento(
        "p",
        "Sua sacola está vazia. Escolha um produto para começar.",
      ),
      criarLink("Ver cardápio", "#/cardapio"),
    );
  }
  for (const item of resumo.itens) {
    const cartao = criarElemento("article", "", "item-sacola");
    cartao.append(
      criarElemento("h2", item.produto.nome),
      criarElemento(
        "p",
        `${formatarPreco(item.produto.precoCentavos)} por unidade · ${formatarPreco(item.totalCentavos)} neste item`,
      ),
    );
    const formulario = criarFormularioItem({
      identificador: item.id,
      quantidade: item.quantidade,
      observacao: item.observacao,
      textoBotao: "Salvar item",
      bloqueado: !resumo.disponivel,
      salvar: (quantidade, observacao) =>
        acoes.editar(item.id, quantidade, observacao),
    });
    formularios.push(formulario);
    const remover = criarElemento(
      "button",
      "Remover item",
      "botao botao--secundario",
    );
    remover.type = "button";
    remover.disabled = !resumo.disponivel;
    remover.setAttribute("aria-label", `Remover ${item.produto.nome}`);
    const erro = criarElemento("p");
    erro.setAttribute("role", "status");
    remover.addEventListener(
      "click",
      async () => {
        remover.disabled = true;
        try {
          await acoes.remover(item.id);
        } catch (falha) {
          erro.textContent = falha.message;
          remover.disabled = false;
        }
      },
      { signal: ouvintes.signal },
    );
    cartao.append(formulario.elemento, remover, erro);
    elemento.append(cartao);
  }
  elemento.append(
    criarElemento(
      "p",
      `Subtotal dos produtos: ${formatarPreco(resumo.subtotalCentavos)}`,
      "subtotal",
    ),
  );
  if (resumo.itens.length) {
    elemento.append(
      criarElemento(
        "p",
        "Confira identificação, retirada ou entrega e total na finalização. Nenhum pedido foi enviado.",
        "texto-apoio",
      ),
      criarLink("Continuar escolhendo", "#/cardapio"),
      criarLink("Ir para finalização", "#/finalizacao", "botao"),
    );
  }
  return {
    elemento,
    titulo: "Minha sacola",
    desmontar() {
      ouvintes.abort();
      formularios.forEach((formulario) => formulario.desmontar());
    },
  };
}
