import { describe, it, expect } from "vitest";
import { identificarRota } from "../../codigo/aplicacao/rotas";

describe("Reconhecimento dos endereços", () => {
  it.each(["", "#", "#/"])("abre o cardápio no endereço inicial %s", (hash) => {
    expect(identificarRota(hash)).toEqual({ nome: "cardapio" });
  });
  it("recupera somente o identificador do produto", () => {
    expect(identificarRota("#/produto/cuscuz-recheado")).toEqual({
      nome: "produto",
      identificador: "cuscuz-recheado",
    });
  });
  it.each([
    "#/produto/",
    "#/produto/a/outro",
    "#/produto/%3Cscript%3E",
    "#/desconhecida",
  ])("recusa rota fora do contrato %s", (hash) => {
    expect(identificarRota(hash)).toEqual({ nome: "nao-encontrada" });
  });
});
