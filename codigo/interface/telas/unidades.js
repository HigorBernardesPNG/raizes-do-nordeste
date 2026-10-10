import {
  criarElemento,
  criarTitulo,
  criarLink,
  formatarPreco,
} from "../componentes/elementos";

export function montarUnidades(unidades, resumo, acoes) {
  const elemento = criarElemento("section");
  elemento.append(
    criarTitulo("Escolher unidade"),
    criarElemento(
      "p",
      "A sacola acompanha a unidade escolhida. Confira as alterações antes de confirmar.",
    ),
  );
  const lista = criarElemento("div", "", "lista-unidades");
  const revisao = criarElemento("section", "", "painel revisao-unidade");
  revisao.hidden = true;
  const ouvintes = new AbortController();

  function revisar(unidade) {
    const previa = acoes.preparar(unidade.id);
    lista.hidden = true;
    revisao.hidden = false;
    const titulo = criarElemento("h2", `Revisar troca para ${unidade.nome}`);
    titulo.tabIndex = -1;
    revisao.replaceChildren(
      titulo,
      criarElemento(
        "p",
        `${unidade.cidade}/${unidade.uf} · ${unidade.aberta ? "Aberta" : "Fechada"}`,
      ),
    );
    if (!unidade.aberta)
      revisao.append(
        criarElemento(
          "p",
          "Esta unidade está fechada e não poderá confirmar novos pedidos.",
          "aviso",
        ),
      );
    if (!previa.diferencas.length)
      revisao.append(
        criarElemento(
          "p",
          "Sua sacola está vazia. A troca atualizará o cardápio.",
        ),
      );
    for (const item of previa.diferencas) {
      const linha = criarElemento("div", "", "diferenca-unidade");
      linha.append(criarElemento("h3", item.nome));
      if (item.observacao)
        linha.append(criarElemento("p", `Observação: ${item.observacao}`));
      linha.append(
        criarElemento(
          "p",
          `Quantidade: ${item.quantidadeAntes} → ${item.quantidadeDepois}`,
        ),
      );
      if (!item.quantidadeDepois)
        linha.append(
          criarElemento(
            "p",
            "Este item será removido por indisponibilidade.",
            "aviso",
          ),
        );
      else {
        linha.append(
          criarElemento(
            "p",
            `Preço por unidade: ${formatarPreco(item.precoAntes)} → ${formatarPreco(item.precoDepois)}`,
          ),
        );
        if (item.receitaAntes !== item.receitaDepois) {
          linha.append(
            criarElemento("p", `Receita atual: ${item.receitaAntes}`),
            criarElemento(
              "p",
              `Receita na nova unidade: ${item.receitaDepois}`,
            ),
          );
        }
      }
      revisao.append(linha);
    }
    const subtotal = previa.proximo.itens.reduce((total, item) => {
      const produto = previa.destino.produtos.find(
        (produto) => produto.id === item.produtoId,
      );
      return total + produto.precoCentavos * item.quantidade;
    }, 0);
    revisao.append(
      criarElemento(
        "p",
        `Subtotal após a troca: ${formatarPreco(subtotal)}`,
        "subtotal",
      ),
    );
    const confirmar = criarElemento("button", "Confirmar troca", "botao");
    const cancelar = criarElemento(
      "button",
      "Manter unidade atual",
      "botao botao--secundario",
    );
    const retorno = criarElemento("p");
    retorno.setAttribute("role", "status");
    confirmar.type = cancelar.type = "button";
    confirmar.addEventListener(
      "click",
      async () => {
        confirmar.disabled = cancelar.disabled = true;
        try {
          await acoes.confirmar(previa);
        } catch (erro) {
          retorno.textContent = `${erro.message} Volte à lista para revisar a troca novamente.`;
          cancelar.disabled = false;
        }
      },
      { signal: ouvintes.signal },
    );
    cancelar.addEventListener(
      "click",
      () => {
        lista.hidden = false;
        revisao.hidden = true;
        lista.querySelector(`[data-unidade="${unidade.id}"]`)?.focus();
      },
      { signal: ouvintes.signal },
    );
    const botoes = criarElemento("div", "", "acoes");
    botoes.append(confirmar, cancelar);
    revisao.append(botoes, retorno);
    titulo.focus();
  }

  for (const unidade of unidades) {
    const cartao = criarElemento("article", "", "item-sacola");
    cartao.append(
      criarElemento("h2", unidade.nome),
      criarElemento(
        "p",
        `${unidade.cidade}/${unidade.uf} · ${unidade.aberta ? "Aberta" : "Fechada"}`,
      ),
      criarElemento("p", unidade.horario, "texto-apoio"),
    );
    const selecionada = unidade.id === resumo.unidade.id;
    const botao = criarElemento(
      "button",
      selecionada ? "Unidade atual" : `Escolher ${unidade.nome}`,
      "botao botao--secundario",
    );
    botao.type = "button";
    botao.disabled = selecionada || !resumo.disponivel;
    botao.dataset.unidade = unidade.id;
    botao.addEventListener("click", () => revisar(unidade), {
      signal: ouvintes.signal,
    });
    cartao.append(botao);
    lista.append(cartao);
  }
  elemento.append(
    lista,
    revisao,
    criarLink("Voltar ao cardápio", "#/cardapio"),
  );
  return {
    elemento,
    titulo: "Escolher unidade",
    desmontar: () => ouvintes.abort(),
  };
}
