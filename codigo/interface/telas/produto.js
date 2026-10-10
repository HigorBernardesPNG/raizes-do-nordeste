import {
  criarElemento,
  criarTitulo,
  criarLink,
  formatarPreco,
} from "../componentes/elementos";
import { criarFormularioItem } from "../componentes/formulario-item";

export function montarProduto(produto, { unidade, bloqueado, incluir }) {
  const elemento = criarElemento("section", "", "painel");
  elemento.append(
    criarLink("Voltar ao cardápio", "#/cardapio"),
    criarElemento("p", produto.categoria, "categoria"),
    criarTitulo(produto.nome),
    criarElemento(
      "p",
      `${unidade.nome} · ${unidade.cidade}/${unidade.uf}`,
      "texto-apoio",
    ),
    criarElemento("p", produto.descricao, "texto-apoio"),
    criarElemento("strong", formatarPreco(produto.precoCentavos), "preco"),
    criarElemento(
      "p",
      produto.disponivel
        ? "Disponível nesta unidade."
        : "Indisponível nesta unidade.",
    ),
  );
  const formulario = criarFormularioItem({
    identificador: produto.id,
    textoBotao: "Adicionar à sacola",
    bloqueado: bloqueado || !produto.disponivel,
    salvar: (quantidade, observacao) =>
      incluir({ produtoId: produto.id, quantidade, observacao }),
  });
  elemento.append(formulario.elemento, criarLink("Ver sacola", "#/sacola"));
  return { elemento, titulo: produto.nome, desmontar: formulario.desmontar };
}
