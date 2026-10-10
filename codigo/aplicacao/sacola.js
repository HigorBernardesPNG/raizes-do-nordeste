import {
  criarSacolaInicial,
  validarEstado,
  incluirItem,
  editarItem,
  removerItem,
  resumirSacola,
  prepararTroca,
} from "../dominio/sacola";

export function criarControleSacola(catalogo, repositorio) {
  let estado = criarSacolaInicial(catalogo.unidades[0].id);
  let disponivel = false;
  let aviso = "";

  async function carregar() {
    try {
      const salvo = await repositorio.ler();
      estado = validarEstado(
        salvo ?? criarSacolaInicial(catalogo.unidades[0].id),
        catalogo,
      );
      disponivel = true;
      aviso = "";
    } catch (erro) {
      disponivel = false;
      aviso = `${erro.message} O cardápio continua disponível para consulta.`;
    }
  }

  async function alterar(transformar, revisao = estado.revisao) {
    if (!disponivel) throw new Error(aviso);
    const unidadeEsperada = estado.unidadeId;
    let salvo;
    try {
      salvo = await repositorio.alterar((atual) => {
        const base = validarEstado(
          atual ?? criarSacolaInicial(catalogo.unidades[0].id),
          catalogo,
        );
        // Leio e confiro a revisão dentro da mesma transação para não sobrescrever outra aba.
        if (base.revisao !== revisao || base.unidadeId !== unidadeEsperada) {
          const erro = new Error(
            "A sacola mudou em outra aba. Confira os itens antes de tentar novamente.",
          );
          erro.codigo = "CONFLITO";
          throw erro;
        }
        const proximo = transformar(base);
        proximo.revisao = base.revisao + 1;
        return validarEstado(proximo, catalogo);
      });
    } catch (erro) {
      if (erro.codigo === "CONFLITO") await carregar();
      throw erro;
    }
    estado = salvo;
  }

  return {
    carregar,
    consultar: () => ({
      ...resumirSacola(estado, catalogo),
      disponivel,
      aviso,
    }),
    consultarCatalogo: () =>
      structuredClone(
        catalogo.unidades.find((unidade) => unidade.id === estado.unidadeId),
      ),
    incluir: (entrada) =>
      alterar((atual) =>
        incluirItem(atual, catalogo, { ...entrada, id: crypto.randomUUID() }),
      ),
    editar: (id, quantidade, observacao) =>
      alterar((atual) =>
        editarItem(atual, catalogo, id, quantidade, observacao),
      ),
    remover: (id) => alterar((atual) => removerItem(atual, id)),
    prepararTroca: (unidadeId) => prepararTroca(estado, catalogo, unidadeId),
    confirmarTroca: (previa) =>
      alterar(
        (atual) => prepararTroca(atual, catalogo, previa.destino.id).proximo,
        previa.revisao,
      ),
    limpar: () =>
      alterar((atual) => ({
        ...criarSacolaInicial(catalogo.unidades[0].id),
        revisao: atual.revisao,
      })),
  };
}
