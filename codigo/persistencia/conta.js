import { CHAVE_FINALIZACAO, vincularRascunho } from "./finalizacao";
import { abrirBanco } from "./banco";
import {
  avaliarSessao,
  obterPerfil,
  registrarPreferencia,
} from "../dominio/conta";
const CHAVE_SESSAO = "sessao-pessoal";

// O callback agenda as operações do IndexedDB, sem aguardar cálculo de senha dentro da transação.
async function executar(modo, operar) {
  const banco = await abrirBanco();
  return new Promise((resolver, rejeitar) => {
    const transacao = banco.transaction(["usuarios", "estado"], modo);
    let resultado;
    let erroDaRegra;
    const contexto = {
      usuarios: transacao.objectStore("usuarios"),
      estado: transacao.objectStore("estado"),
      concluir: (valor) => {
        resultado = valor;
      },
      falhar: (mensagem) => {
        erroDaRegra = new Error(mensagem);
        transacao.abort();
      },
    };
    transacao.oncomplete = () => {
      banco.close();
      resolver(resultado);
    };
    transacao.onabort = () => {
      banco.close();
      rejeitar(
        erroDaRegra ??
          new Error(
            transacao.error?.name === "ConstraintError"
              ? "Este e-mail já está cadastrado."
              : "Não foi possível concluir a operação no armazenamento local. Tente novamente.",
          ),
      );
    };
    transacao.onerror = () => {};
    try {
      operar(contexto);
    } catch {
      transacao.abort();
    }
  });
}

export function criarRepositorioConta() {
  return {
    inicializar(usuario) {
      return executar("readwrite", ({ usuarios, estado }) => {
        const marcador = estado.get("conta-inicial-v1");
        marcador.onsuccess = () => {
          if (marcador.result) return;
          const existente = usuarios.index("email").get(usuario.email);
          existente.onsuccess = () => {
            if (!existente.result) usuarios.add(usuario);
            estado.put(true, "conta-inicial-v1");
          };
        };
      });
    },
    buscarPorEmail(email) {
      return executar("readonly", ({ usuarios, concluir }) => {
        const leitura = usuarios.index("email").get(email);
        leitura.onsuccess = () => concluir(leitura.result);
      });
    },
    cadastrar(usuario, sessao) {
      return executar("readwrite", ({ usuarios, estado }) => {
        // O índice único resolve inclusive dois cadastros simultâneos com o mesmo e-mail.
        usuarios.add(usuario);
        estado.put(sessao, CHAVE_SESSAO);
        vincularRascunho(estado, sessao);
      });
    },
    entrar(usuario, sessao) {
      return executar("readwrite", ({ usuarios, estado, falhar }) => {
        const leitura = usuarios.get(usuario.id);
        leitura.onsuccess = () => {
          if (
            !leitura.result ||
            JSON.stringify(leitura.result.credencial) !==
              JSON.stringify(usuario.credencial)
          ) {
            falhar("A conta mudou durante o acesso. Tente entrar novamente.");
            return;
          }
          estado.put(sessao, CHAVE_SESSAO);
          vincularRascunho(estado, sessao);
        };
      });
    },
    consultar(agora, renovarId = null) {
      return executar("readwrite", ({ usuarios, estado, concluir }) => {
        const leitura = estado.get(CHAVE_SESSAO);
        leitura.onsuccess = () => {
          const sessao = leitura.result;
          const situacao = avaliarSessao(sessao, agora);
          if (situacao === "visitante" || situacao === "expirada") {
            if (sessao) {
              estado.delete(CHAVE_SESSAO);
              estado.delete(CHAVE_FINALIZACAO);
              estado.delete("acompanhamento-pessoal");
            }
            concluir({ sessao: null, perfil: null, situacao });
            return;
          }
          const usuario = usuarios.get(sessao.usuarioId);
          usuario.onsuccess = () => {
            if (!usuario.result) {
              estado.delete(CHAVE_SESSAO);
              estado.delete(CHAVE_FINALIZACAO);
              estado.delete("acompanhamento-pessoal");
              concluir({ sessao: null, perfil: null, situacao: "visitante" });
              return;
            }
            if (renovarId === sessao.id) {
              sessao.ultimaAtividade = agora;
              estado.put(sessao, CHAVE_SESSAO);
            }
            concluir({
              sessao,
              perfil: obterPerfil(usuario.result),
              situacao: avaliarSessao(sessao, agora),
            });
          };
        };
      });
    },
    sair(sessaoId) {
      return executar("readwrite", ({ estado }) => {
        const leitura = estado.get(CHAVE_SESSAO);
        leitura.onsuccess = () => {
          // Uma saída antiga não pode encerrar a sessão de outra conta que entrou depois.
          if (leitura.result?.id === sessaoId) {
            estado.delete(CHAVE_SESSAO);
            estado.delete(CHAVE_FINALIZACAO);
            estado.delete("acompanhamento-pessoal");
          }
        };
      });
    },
    alterarCampanhas(sessaoId, permitidas, agora) {
      return executar("readwrite", ({ usuarios, estado, falhar }) => {
        const leitura = estado.get(CHAVE_SESSAO);
        leitura.onsuccess = () => {
          const sessao = leitura.result;
          if (
            sessao?.id !== sessaoId ||
            avaliarSessao(sessao, agora) === "expirada"
          ) {
            falhar(
              "A sessão terminou. Entre novamente para alterar a preferência.",
            );
            return;
          }
          const usuario = usuarios.get(sessao.usuarioId);
          usuario.onsuccess = () => {
            if (!usuario.result) {
              falhar("A conta não está mais disponível.");
              return;
            }
            usuario.result.campanhas = registrarPreferencia(permitidas, agora);
            usuarios.put(usuario.result);
          };
        };
      });
    },
  };
}
