import { it, expect } from "vitest";
import {
  criarDadosFinalizacao,
  limitarRascunho,
  validarIdentificacao,
  revisarCompra,
  rascunhoVenceu,
} from "../../codigo/dominio/finalizacao";
const unidade = { cidade: "João Pessoa", uf: "PB", aberta: true };
const dados = {
  ...criarDadosFinalizacao(unidade),
  nome: "Cliente de Teste",
  telefone: "(83) 99999-0001",
};
const resumo = {
  unidade,
  subtotalCentavos: 4200,
  itens: [
    {
      quantidade: 2,
      produto: { id: "cuscuz", nome: "Cuscuz", disponivel: true, estoque: 3 },
    },
  ],
};
it("retirada remove endereço e não cobra taxa", () => {
  const r = revisarCompra(resumo, {
    ...dados,
    logradouro: "Não guardar",
    bairro: "Centro",
  });
  expect(r.totalCentavos).toBe(4200);
  expect(r.dados.logradouro).toBe("");
});
it("entrega cobra 500 centavos e aceita sem número", () => {
  const r = revisarCompra(resumo, {
    ...dados,
    recebimento: "entrega",
    cidade: " JOAO PESSOA ",
    uf: "pb",
    logradouro: "Rua Fictícia",
    bairro: "Centro",
    semNumero: true,
    numero: "123",
  });
  expect(r.totalCentavos).toBe(4700);
  expect(r.dados.numero).toBe("");
});
it("recusa cidade e UF incompatíveis preservando campos válidos", () => {
  const r = validarIdentificacao(
    { ...dados, recebimento: "entrega", cidade: "Recife", uf: "PE" },
    unidade,
  );
  expect(r.erros).toHaveProperty("cidade");
  expect(r.erros).toHaveProperty("uf");
  expect(r.dados.nome).toBe(dados.nome);
});
it("rejeita nome telefone e número ausentes", () => {
  const r = validarIdentificacao(
    { ...dados, nome: " ", telefone: "123", recebimento: "entrega" },
    unidade,
  );
  expect(Object.keys(r.erros)).toEqual(
    expect.arrayContaining(["nome", "telefone", "numero"]),
  );
});
it("recusa sacola vazia e unidade fechada", () => {
  expect(() => revisarCompra({ ...resumo, itens: [] }, dados)).toThrow("vazia");
  expect(() =>
    revisarCompra({ ...resumo, unidade: { ...unidade, aberta: false } }, dados),
  ).toThrow("fechada");
});
it("revalida estoque somado em linhas diferentes", () => {
  expect(() =>
    revisarCompra(
      { ...resumo, itens: [...resumo.itens, ...resumo.itens] },
      dados,
    ),
  ).toThrow("quantidade");
});
it("limita campos e descarta propriedades extras", () => {
  const r = limitarRascunho({
    ...dados,
    nome: "a".repeat(100),
    cartao: "nunca salvar",
  });
  expect(r.nome).toHaveLength(80);
  expect(r).not.toHaveProperty("cartao");
});
it("vence aos vinte minutos e rejeita relógio anterior", () => {
  expect(rascunhoVenceu({ ultimaAtividade: 100 }, 1200099)).toBe(false);
  expect(rascunhoVenceu({ ultimaAtividade: 100 }, 1200100)).toBe(true);
  expect(rascunhoVenceu({ ultimaAtividade: 100 }, 99)).toBe(true);
});
