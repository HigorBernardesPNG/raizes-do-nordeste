import { abrirBanco } from "./banco";
const NOME_COLECAO = "estado";
const CHAVE_SACOLA = "sacola-pessoal";

export function criarRepositorioSacola() {
  async function executar(modo, transformar) {
    const banco = await abrirBanco();
    return new Promise((resolver, rejeitar) => {
      let resultado;
      let erroDaRegra;
      const transacao = banco.transaction(NOME_COLECAO, modo);
      const colecao = transacao.objectStore(NOME_COLECAO);
      const leitura = colecao.get(CHAVE_SACOLA);
      leitura.onsuccess = () => {
        try {
          // A transformação é síncrona. Um await aqui poderia encerrar a transação antes da gravação.
          resultado = transformar(leitura.result);
        } catch (erro) {
          erroDaRegra = erro;
          transacao.abort();
          return;
        }
        if (modo === "readwrite") {
          try {
            colecao.put(resultado, CHAVE_SACOLA);
          } catch {
            // Falhas técnicas recebem uma mensagem de recuperação, sem expor detalhes do navegador.
            transacao.abort();
          }
        }
      };
      // O sucesso de put ainda não confirma a transação inteira. Por isso aguardo oncomplete.
      transacao.oncomplete = () => {
        banco.close();
        resolver(resultado);
      };
      transacao.onabort = () => {
        banco.close();
        rejeitar(
          erroDaRegra ??
            new Error(
              "Não foi possível salvar a alteração. A sacola anterior foi mantida.",
            ),
        );
      };
      transacao.onerror = () => {}; // O abort centraliza o retorno e preserva a causa da regra.
    });
  }
  return {
    ler: () => executar("readonly", (estado) => estado),
    alterar: (transformar) => executar("readwrite", transformar),
  };
}
