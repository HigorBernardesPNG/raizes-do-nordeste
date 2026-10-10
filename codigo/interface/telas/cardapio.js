import {
  criarElemento,
  criarTitulo,
  criarLink,
  formatarPreco,
} from "../componentes/elementos";

export function montarCardapio(dados) {
  const elemento = criarElemento("section");
  const unidade = criarElemento("div", "", "unidade");
  unidade.append(
    criarElemento(
      "strong",
      `${dados.unidade.nome} · ${dados.unidade.cidade}/${dados.unidade.uf}`,
    ),
    criarElemento("p", "Cardápio da unidade"),
    criarElemento(
      "p",
      `${dados.unidade.aberta ? "Aberta" : "Fechada"} · ${dados.unidade.horario}`,
    ),
    criarLink("Trocar unidade", "#/unidades"),
  );
  elemento.append(
    unidade,
    criarTitulo("Cardápio"),
    criarElemento("p", "Preparado com sabor de casa.", "texto-apoio"),
  );
  if (!dados.unidade.aberta) {
    elemento.append(
      criarElemento(
        "p",
        "Esta unidade está fechada. O cardápio pode ser consultado, mas novos pedidos não serão confirmados.",
        "aviso",
      ),
    );
  }

  elemento.append(
    criarElemento(
      "aside",
      "Promoção RAIZES5: R$ 5,00 de desconto a partir de R$ 20,00 em produtos. Válida durante a demonstração. Escolha no pagamento; não acumula com pontos.",
      "aviso",
    ),
  );
  const filtros = criarElemento("div", "", "filtros");
  filtros.setAttribute("role", "group");
  filtros.setAttribute("aria-label", "Filtrar por categoria");
  const lista = criarElemento("div", "", "lista-produtos");
  const resumo = criarElemento("p", "", "texto-apoio");
  resumo.setAttribute("role", "status");
  const categorias = [
    "Todos",
    ...new Set(dados.produtos.map((produto) => produto.categoria)),
  ];
  const ouvintes = new AbortController();

  function mostrarProdutos(categoria) {
    const produtos = dados.produtos.filter(
      (produto) => categoria === "Todos" || produto.categoria === categoria,
    );
    lista.replaceChildren();
    for (const produto of produtos) {
      const cartao = criarElemento("article", "", "produto");
      cartao.append(
        criarElemento("p", produto.categoria, "categoria"),
        criarElemento("h2", produto.nome),
        criarElemento("p", produto.descricao, "texto-apoio"),
        criarElemento("strong", formatarPreco(produto.precoCentavos), "preco"),
      );
      if (produto.disponivel) {
        const link = criarLink("Ver detalhes", `#/produto/${produto.id}`);
        link.setAttribute("aria-label", `Ver detalhes de ${produto.nome}`);
        cartao.append(link);
      } else {
        cartao.append(
          criarElemento("p", "Indisponível nesta unidade", "indisponivel"),
        );
      }
      lista.append(cartao);
    }
    for (const botao of filtros.children)
      botao.setAttribute(
        "aria-pressed",
        String(botao.textContent === categoria),
      );
    resumo.textContent = `${produtos.length} ${produtos.length === 1 ? "produto encontrado" : "produtos encontrados"}.`;
  }

  for (const categoria of categorias) {
    const botao = criarElemento("button", categoria, "filtro");
    botao.type = "button";
    botao.addEventListener("click", () => mostrarProdutos(categoria), {
      signal: ouvintes.signal,
    });
    filtros.append(botao);
  }
  elemento.append(filtros, resumo, lista);
  mostrarProdutos("Todos");
  return { elemento, titulo: "Cardápio", desmontar: () => ouvintes.abort() };
}
