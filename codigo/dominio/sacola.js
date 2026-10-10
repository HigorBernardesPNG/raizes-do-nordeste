// As regras ficam aqui para que a mesma validação sirva à tela e à persistência.
// Este módulo não conhece HTML nem IndexedDB.
export function criarSacolaInicial(unidadeId) {
  return { versao: 1, revisao: 0, unidadeId, itens: [] };
}

export function validarQuantidade(quantidade, limite) {
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new Error("Informe uma quantidade inteira maior que zero.");
  }
  if (quantidade > limite) {
    throw new Error(
      `Quantidade indisponível. O limite deste produto é ${limite}.`,
    );
  }
}

export function validarObservacao(observacao) {
  if (typeof observacao !== "string" || observacao.length > 200) {
    throw new Error("A observação deve ter até 200 caracteres.");
  }
  return observacao.trim();
}

export function obterUnidade(catalogo, unidadeId) {
  const unidade = catalogo.unidades.find((item) => item.id === unidadeId);
  if (!unidade) throw new Error("Unidade não encontrada.");
  return unidade;
}

export function validarEstado(estado, catalogo) {
  if (
    !estado ||
    estado.versao !== 1 ||
    !Number.isSafeInteger(estado.revisao) ||
    estado.revisao < 0 ||
    !Array.isArray(estado.itens)
  ) {
    throw new Error(
      "Não foi possível ler a sacola salva. Os dados não foram substituídos.",
    );
  }
  const unidade = obterUnidade(catalogo, estado.unidadeId);
  const ids = new Set();
  for (const item of estado.itens) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      !unidade.produtos.some((produto) => produto.id === item.produtoId)
    ) {
      throw new Error(
        "A sacola salva contém um item inválido. Os dados foram preservados.",
      );
    }
    ids.add(item.id);
    validarQuantidade(item.quantidade, 999);
    validarObservacao(item.observacao);
  }
  return estado;
}

export function incluirItem(estado, catalogo, entrada) {
  const proximo = structuredClone(estado);
  const unidade = obterUnidade(catalogo, estado.unidadeId);
  const produto = unidade.produtos.find(
    (item) => item.id === entrada.produtoId,
  );
  if (!produto?.disponivel || produto.estoque < 1) {
    throw new Error("Produto indisponível nesta unidade.");
  }
  const observacao = validarObservacao(entrada.observacao);
  const acumulado = estado.itens
    .filter((item) => item.produtoId === produto.id)
    .reduce((total, item) => total + item.quantidade, 0);
  validarQuantidade(entrada.quantidade, produto.estoque - acumulado);
  // Observações diferentes permanecem em linhas separadas para não perder o pedido do cliente.
  const existente = proximo.itens.find(
    (item) => item.produtoId === produto.id && item.observacao === observacao,
  );
  if (existente) existente.quantidade += entrada.quantidade;
  else
    proximo.itens.push({
      id: entrada.id,
      produtoId: produto.id,
      quantidade: entrada.quantidade,
      observacao,
    });
  return proximo;
}

export function editarItem(estado, catalogo, itemId, quantidade, observacao) {
  const proximo = structuredClone(estado);
  const item = proximo.itens.find((linha) => linha.id === itemId);
  if (!item) throw new Error("O item não está mais na sacola.");
  const produto = obterUnidade(catalogo, estado.unidadeId).produtos.find(
    (produto) => produto.id === item.produtoId,
  );
  if (!produto?.disponivel)
    throw new Error(
      "Produto indisponível nesta unidade. Remova o item para continuar.",
    );
  const outrasQuantidades = proximo.itens
    .filter(
      (linha) => linha.produtoId === item.produtoId && linha.id !== itemId,
    )
    .reduce((total, linha) => total + linha.quantidade, 0);
  validarQuantidade(quantidade, produto.estoque - outrasQuantidades);
  item.quantidade = quantidade;
  item.observacao = validarObservacao(observacao);
  return proximo;
}

export function removerItem(estado, itemId) {
  return {
    ...structuredClone(estado),
    itens: estado.itens.filter((item) => item.id !== itemId),
  };
}

export function resumirSacola(estado, catalogo) {
  const unidade = obterUnidade(catalogo, estado.unidadeId);
  const itens = estado.itens.map((item) => {
    const produto = unidade.produtos.find(
      (produto) => produto.id === item.produtoId,
    );
    return {
      ...item,
      produto,
      totalCentavos: produto.precoCentavos * item.quantidade,
    };
  });
  return {
    unidade,
    itens,
    quantidade: itens.reduce((total, item) => total + item.quantidade, 0),
    subtotalCentavos: itens.reduce(
      (total, item) => total + item.totalCentavos,
      0,
    ),
  };
}

export function prepararTroca(estado, catalogo, unidadeId) {
  const origem = obterUnidade(catalogo, estado.unidadeId);
  const destino = obterUnidade(catalogo, unidadeId);
  const proximo = { ...structuredClone(estado), unidadeId, itens: [] };
  const diferencas = [];
  const saldo = new Map(
    destino.produtos.map((produto) => [
      produto.id,
      produto.disponivel ? produto.estoque : 0,
    ]),
  );
  // A prévia calcula tudo sem alterar a sacola. Só a confirmação poderá gravar o resultado.
  for (const item of estado.itens) {
    const antes = origem.produtos.find(
      (produto) => produto.id === item.produtoId,
    );
    const depois = destino.produtos.find(
      (produto) => produto.id === item.produtoId,
    );
    const quantidade = Math.min(
      item.quantidade,
      saldo.get(item.produtoId) ?? 0,
    );
    diferencas.push({
      nome: antes.nome,
      observacao: item.observacao,
      quantidadeAntes: item.quantidade,
      quantidadeDepois: quantidade,
      precoAntes: antes.precoCentavos,
      precoDepois: depois?.precoCentavos ?? null,
      receitaAntes: antes.descricao,
      receitaDepois: depois?.descricao ?? "Não oferecido nesta unidade",
    });
    if (quantidade > 0) {
      proximo.itens.push({ ...item, quantidade });
      saldo.set(item.produtoId, saldo.get(item.produtoId) - quantidade);
    }
  }
  return { revisao: estado.revisao, destino, diferencas, proximo };
}
