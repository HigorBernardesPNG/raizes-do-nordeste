import {
  criarElemento,
  criarTitulo,
  criarLink,
} from "../componentes/elementos";

export function montarNaoEncontrada() {
  const elemento = criarElemento("section", "", "painel");
  elemento.append(
    criarTitulo("Página não encontrada"),
    criarElemento("p", "O endereço não corresponde a uma página disponível."),
    criarLink("Voltar ao cardápio", "#/cardapio"),
  );
  return { elemento, titulo: "Página não encontrada" };
}
