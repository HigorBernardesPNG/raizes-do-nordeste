import { abrirBanco } from "./banco";
import { avaliarSessao } from "../dominio/conta";
import {
  limitarRascunho,
  rascunhoVenceu,
  revisarCompra,
} from "../dominio/finalizacao";
import {
  validarEstado,
  resumirSacola,
  criarSacolaInicial,
} from "../dominio/sacola";
export const CHAVE_FINALIZACAO = "finalizacao-pessoal";

// Chamada na mesma transação que inicia o acesso. Só o rascunho de visitante acompanha o login.
export function vincularRascunho(colecao, sessao) {
  const leitura = colecao.get(CHAVE_FINALIZACAO);
  leitura.onsuccess = () => {
    const atual = leitura.result;
    if (!atual) return;
    if (atual.sessaoId !== null || rascunhoVenceu(atual, sessao.criadaEm))
      colecao.delete(CHAVE_FINALIZACAO);
    else
      colecao.put(
        { ...atual, sessaoId: sessao.id, ultimaAtividade: sessao.criadaEm },
        CHAVE_FINALIZACAO,
      );
  };
}

export function criarRepositorioFinalizacao(catalogo) {
  async function executar({
    contexto,
    agora,
    acao = "consultar",
    dados,
    esperado,
  }) {
    const banco = await abrirBanco();
    return new Promise((resolve, reject) => {
      const transacao = banco.transaction("estado", "readwrite");
      const estado = transacao.objectStore("estado");
      let resultado;
      let erroDaRegra;
      const sessao = estado.get("sessao-pessoal");
      const rascunho = estado.get(CHAVE_FINALIZACAO);
      const sacola = estado.get("sacola-pessoal");
      sacola.onsuccess = () => {
        try {
          const sessaoAtual = ["ativa", "aviso"].includes(
            avaliarSessao(sessao.result, agora),
          )
            ? sessao.result.id
            : null;
          if (contexto !== sessaoAtual)
            throw new Error(
              "O acesso mudou. Reabra a finalização antes de continuar.",
            );
          let atual = rascunho.result;
          if (
            atual &&
            (atual.sessaoId !== contexto || rascunhoVenceu(atual, agora))
          ) {
            estado.delete(CHAVE_FINALIZACAO);
            atual = null;
          }
          if (atual && (atual.versao !== 1 || !Number.isInteger(atual.revisao)))
            throw new Error(
              "Não foi possível ler o preenchimento salvo. Os dados não foram substituídos.",
            );
          if (acao === "salvar" || acao === "revisar") {
            if (
              (atual?.id ?? null) !== esperado.id ||
              (atual?.revisao ?? 0) !== esperado.revisao
            )
              throw new Error(
                "O preenchimento mudou ou expirou. Reabra a finalização para conferir os dados salvos.",
              );
            atual = {
              versao: 1,
              id: atual?.id ?? crypto.randomUUID(),
              revisao: (atual?.revisao ?? 0) + 1,
              sessaoId: contexto,
              ultimaAtividade: agora,
              dados: limitarRascunho(dados),
            };
            if (acao === "revisar") {
              const base = validarEstado(
                sacola.result ?? criarSacolaInicial(catalogo.unidades[0].id),
                catalogo,
              );
              // Leio sacola e preenchimento na mesma transação. A revisão não cria pedido nem reserva estoque.
              resultado = {
                revisao: revisarCompra(resumirSacola(base, catalogo), dados),
                registro: atual,
              };
            }
            estado.put(atual, CHAVE_FINALIZACAO);
          }
          if (acao === "renovar" && atual) {
            atual.ultimaAtividade = agora;
            estado.put(atual, CHAVE_FINALIZACAO);
          }
          if (acao === "limpar") {
            estado.delete(CHAVE_FINALIZACAO);
            atual = null;
          }
          resultado ??= { registro: atual ?? null };
        } catch (erro) {
          // Erros técnicos não devem aparecer como mensagens internas do navegador.
          erroDaRegra = erro instanceof DOMException ? null : erro;
          transacao.abort();
        }
      };
      transacao.oncomplete = () => {
        banco.close();
        resolve(resultado);
      };
      transacao.onabort = () => {
        banco.close();
        reject(
          erroDaRegra ??
            new Error(
              "Não foi possível salvar a finalização. Confira o armazenamento e tente novamente.",
            ),
        );
      };
      transacao.onerror = () => {};
    });
  }
  return { executar };
}
