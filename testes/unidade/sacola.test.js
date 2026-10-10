import { describe, it, expect } from "vitest";
import { consultarCatalogoInicial } from "../../codigo/servicos/simulados/catalogo";
import {
  criarSacolaInicial,
  incluirItem,
  editarItem,
  prepararTroca,
  removerItem,
  resumirSacola,
  validarEstado,
} from "../../codigo/dominio/sacola";
import { criarControleSacola } from "../../codigo/aplicacao/sacola";

const catalogo = consultarCatalogoInicial();
const inicial = () => criarSacolaInicial("recife-boa-vista");
const entrada = (quantidade = 1, observacao = "") => ({
  id: "item-1",
  produtoId: "cuscuz-recheado",
  quantidade,
  observacao,
});

describe("regras da sacola", () => {
  it.each([0, -1, 1.5, NaN])("recusa quantidade inválida %s", (quantidade) => {
    expect(() => incluirItem(inicial(), catalogo, entrada(quantidade))).toThrow(
      "inteira maior que zero",
    );
  });
  it("limita o estoque somando linhas com observações diferentes", () => {
    const estado = incluirItem(inicial(), catalogo, entrada(2, "Bem quente"));
    expect(() =>
      incluirItem(estado, catalogo, {
        ...entrada(2, "Sem manteiga"),
        id: "item-2",
      }),
    ).toThrow("Quantidade indisponível");
    expect(estado.itens[0].quantidade).toBe(2);
  });
  it("reúne inclusões iguais e preserva observações diferentes", () => {
    let estado = incluirItem(inicial(), catalogo, entrada());
    estado = incluirItem(estado, catalogo, entrada());
    estado = incluirItem(estado, catalogo, {
      ...entrada(1, "Sem manteiga"),
      id: "item-2",
    });
    expect(estado.itens.map((item) => item.quantidade)).toEqual([2, 1]);
    expect(resumirSacola(estado, catalogo).subtotalCentavos).toBe(6000);
  });
  it("impede produto indisponível e observação excessiva", () => {
    expect(() =>
      incluirItem(inicial(), catalogo, {
        ...entrada(),
        produtoId: "bolo-macaxeira",
      }),
    ).toThrow("indisponível");
    expect(() =>
      incluirItem(inicial(), catalogo, entrada(1, "a".repeat(201))),
    ).toThrow("200");
  });
  it("edita sem alterar a entrada e permite remover o último item", () => {
    const estado = incluirItem(inicial(), catalogo, entrada());
    const editado = editarItem(estado, catalogo, "item-1", 3, " Sem manteiga ");
    expect(estado.itens[0].quantidade).toBe(1);
    expect(editado.itens[0].observacao).toBe("Sem manteiga");
    expect(removerItem(editado, "item-1").itens).toEqual([]);
  });
  it("calcula troca sem mutação e evidencia redução, remoção, preço e receita", () => {
    let estado = incluirItem(inicial(), catalogo, entrada(3));
    estado = incluirItem(estado, catalogo, {
      ...entrada(),
      id: "item-2",
      produtoId: "tapioca-queijo",
    });
    const previa = prepararTroca(estado, catalogo, "recife-casa-amarela");
    expect(estado.unidadeId).toBe("recife-boa-vista");
    expect(estado.itens).toHaveLength(2);
    expect(previa.proximo.itens).toHaveLength(1);
    expect(previa.proximo.itens[0].quantidade).toBe(2);
    expect(previa.diferencas[0]).toMatchObject({
      precoAntes: 2000,
      precoDepois: 2200,
      quantidadeAntes: 3,
      quantidadeDepois: 2,
    });
    expect(previa.diferencas[0].receitaAntes).not.toBe(
      previa.diferencas[0].receitaDepois,
    );
    expect(resumirSacola(previa.proximo, catalogo).subtotalCentavos).toBe(4400);
  });
  it("divide o estoque da nova unidade entre as linhas na ordem da sacola", () => {
    let estado = incluirItem(inicial(), catalogo, entrada(2));
    estado = incluirItem(estado, catalogo, {
      ...entrada(1, "Sem manteiga"),
      id: "item-2",
    });
    expect(
      prepararTroca(estado, catalogo, "recife-casa-amarela").proximo.itens,
    ).toHaveLength(1);
  });
  it("recusa formato persistido desconhecido sem tentar corrigi-lo", () => {
    expect(() => validarEstado({ ...inicial(), versao: 2 }, catalogo)).toThrow(
      "não foram substituídos",
    );
    expect(() =>
      validarEstado({ ...inicial(), unidadeId: "inexistente" }, catalogo),
    ).toThrow("Unidade não encontrada");
  });
});

// Este substituto verifica a coordenação. O IndexedDB real é exercitado nos testes de navegador.
function criarRepositorioDeTeste() {
  let salvo;
  return {
    ler: async () => structuredClone(salvo),
    alterar: async (transformar) => {
      const proximo = transformar(structuredClone(salvo));
      salvo = structuredClone(proximo);
      return structuredClone(salvo);
    },
  };
}

describe("coordenação da persistência", () => {
  it("reabre a sacola sem substituir os dados pela massa inicial", async () => {
    const repositorio = criarRepositorioDeTeste();
    const primeiro = criarControleSacola(catalogo, repositorio);
    await primeiro.carregar();
    await primeiro.incluir(entrada(2));
    const segundo = criarControleSacola(catalogo, repositorio);
    await segundo.carregar();
    expect(segundo.consultar().quantidade).toBe(2);
  });
  it("não anuncia uma alteração que falhou ao salvar", async () => {
    const controle = criarControleSacola(catalogo, {
      ler: async () => undefined,
      alterar: async () => {
        throw new Error("Gravação recusada");
      },
    });
    await controle.carregar();
    await expect(controle.incluir(entrada())).rejects.toThrow(
      "Gravação recusada",
    );
    expect(controle.consultar().quantidade).toBe(0);
  });
  it("recusa uma prévia vencida por alteração em outra aba", async () => {
    const repositorio = criarRepositorioDeTeste();
    const primeiro = criarControleSacola(catalogo, repositorio);
    const segundo = criarControleSacola(catalogo, repositorio);
    await primeiro.carregar();
    await segundo.carregar();
    const previa = primeiro.prepararTroca("recife-casa-amarela");
    await segundo.incluir(entrada());
    await expect(primeiro.confirmarTroca(previa)).rejects.toThrow("outra aba");
    expect(primeiro.consultar().unidade.id).toBe("recife-boa-vista");
    expect(primeiro.consultar().quantidade).toBe(1);
  });
  it("bloqueia alterações quando não consegue ler o armazenamento", async () => {
    const controle = criarControleSacola(catalogo, {
      ler: async () => {
        throw new Error("Indisponível");
      },
    });
    await controle.carregar();
    expect(controle.consultar().disponivel).toBe(false);
    await expect(controle.incluir(entrada())).rejects.toThrow("Indisponível");
  });
});
