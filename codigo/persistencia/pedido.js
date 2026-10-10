import { abrirBanco } from "./banco";
import { avaliarSessao } from "../dominio/conta";
import { revisarCompra, rascunhoVenceu } from "../dominio/finalizacao";
import {
  criarSacolaInicial,
  validarEstado,
  resumirSacola,
} from "../dominio/sacola";
import {
  calcularBeneficio,
  proximaEtapa,
  calcularPontos,
} from "../dominio/pedido";

// Uma chave versionada reúne pedidos e saldos no mesmo registro.
// A coleção estado já existe: não é necessário migrar nem recriar o banco.
const CHAVE = "pedidos-e-fidelidade";
const PRAZO = 20 * 60000;

export function criarRepositorioPedido(catalogo) {
  async function executar(acao, entrada = {}) {
    const banco = await abrirBanco();
    return new Promise((resolver, rejeitar) => {
      const transacao = banco.transaction("estado", "readwrite");
      const estado = transacao.objectStore("estado");
      const dados = {};
      let resultado;
      let falha;
      const chaves = [
        CHAVE,
        "sessao-pessoal",
        "finalizacao-pessoal",
        "sacola-pessoal",
        "acompanhamento-pessoal",
        "demonstracao",
      ];
      let restantes = chaves.length;
      for (const chave of chaves) {
        const leitura = estado.get(chave);
        leitura.onsuccess = () => {
          dados[chave] = leitura.result;
          restantes--;
          if (!restantes) operar();
        };
      }
      function operar() {
        try {
          const agora = Date.now();
          const registro = dados[CHAVE] ?? {
            versao: 1,
            pedidos: [],
            saldos: {},
          };
          if (
            registro.versao !== 1 ||
            !Array.isArray(registro.pedidos) ||
            !registro.saldos
          )
            throw new Error(
              "Os pedidos salvos usam um formato desconhecido. Os dados foram preservados.",
            );
          const sessao = ["ativa", "aviso"].includes(
            avaliarSessao(dados["sessao-pessoal"], agora),
          )
            ? dados["sessao-pessoal"]
            : null;
          const contexto = sessao?.id ?? null;
          const usuarioId = sessao?.usuarioId ?? null;
          const saldo = usuarioId ? (registro.saldos[usuarioId] ?? 0) : 0;
          let ponteiro = dados["acompanhamento-pessoal"];
          const demonstracao = dados.demonstracao ?? {
            cenario: "aprovado",
            totem: false,
            ultimaAtividade: agora,
          };
          if (
            ponteiro &&
            (ponteiro.contexto !== contexto ||
              agora - ponteiro.ultimaAtividade >= PRAZO)
          ) {
            estado.delete("acompanhamento-pessoal");
            ponteiro = null;
          }
          function limparAtendimento() {
            estado.delete("sessao-pessoal");
            estado.delete("finalizacao-pessoal");
            estado.delete("acompanhamento-pessoal");
            const anterior = dados["sacola-pessoal"];
            estado.put(
              {
                ...criarSacolaInicial(catalogo.unidades[0].id),
                revisao: (anterior?.revisao ?? 0) + 1,
              },
              "sacola-pessoal",
            );
          }
          if (
            demonstracao.totem &&
            agora - demonstracao.ultimaAtividade >= PRAZO
          ) {
            limparAtendimento();
            demonstracao.ultimaAtividade = agora;
            estado.put(demonstracao, "demonstracao");
            resultado = { saldo: 0, pedido: null, ...demonstracao };
            return;
          }
          const pedidoVisivel =
            registro.pedidos.find(
              (pedido) => pedido.id === ponteiro?.pedidoId,
            ) ??
            (!demonstracao.totem && usuarioId
              ? registro.pedidos.findLast(
                  (pedido) => pedido.usuarioId === usuarioId,
                )
              : null);
          if (acao === "consultar")
            resultado = {
              saldo,
              pedido: pedidoVisivel ?? null,
              ...demonstracao,
            };
          if (acao === "renovar") {
            if (ponteiro)
              estado.put(
                { ...ponteiro, ultimaAtividade: agora },
                "acompanhamento-pessoal",
              );
            if (demonstracao.totem)
              estado.put(
                { ...demonstracao, ultimaAtividade: agora },
                "demonstracao",
              );
          }
          if (acao === "configurar") {
            if (entrada.totem !== demonstracao.totem) limparAtendimento();
            estado.put(
              {
                cenario:
                  entrada.cenario === "recusado" ? "recusado" : "aprovado",
                totem: entrada.totem === true,
                ultimaAtividade: agora,
              },
              "demonstracao",
            );
          }
          if (acao === "encerrar") {
            limparAtendimento();
            estado.put(
              { ...demonstracao, ultimaAtividade: agora },
              "demonstracao",
            );
          }
          if (acao === "pagar") {
            if (entrada.contexto !== contexto)
              throw new Error("O acesso mudou. Revise a compra novamente.");
            const existente = registro.pedidos.find(
              (pedido) => pedido.id === entrada.referencia,
            );
            // A chave do rascunho identifica a compra. A mesma confirmação aprovada não gera outro pedido nem repete o débito de pontos.
            if (existente?.pagamento === "aprovado") {
              resultado = existente;
              return;
            }
            const rascunho = dados["finalizacao-pessoal"];
            if (
              !rascunho ||
              rascunho.id !== entrada.referencia ||
              rascunho.sessaoId !== contexto ||
              rascunhoVenceu(rascunho, agora)
            )
              throw new Error(
                "O preenchimento mudou ou expirou. Revise a compra novamente.",
              );
            const sacola = validarEstado(dados["sacola-pessoal"], catalogo);
            const compra = revisarCompra(
              resumirSacola(sacola, catalogo),
              rascunho.dados,
            );
            if (JSON.stringify(compra) !== JSON.stringify(entrada.revisao))
              throw new Error(
                "A sacola ou os dados mudaram. Atualize a revisão antes de pagar.",
              );
            if (
              demonstracao.totem &&
              (compra.dados.recebimento !== "retirada" ||
                sacola.unidadeId !== catalogo.unidades[0].id)
            )
              throw new Error("O totem utiliza retirada na unidade Boa Vista.");
            const beneficio = calcularBeneficio(
              entrada.beneficio,
              compra.subtotalCentavos,
              saldo,
              !!usuarioId,
            );
            compra.descontoCentavos = beneficio.desconto;
            compra.totalCentavos -= beneficio.desconto;
            const aprovado = entrada.resultado === "aprovado";
            const pedido = {
              id: entrada.referencia,
              usuarioId,
              compra,
              beneficio: entrada.beneficio,
              pagamento: aprovado ? "aprovado" : "recusado",
              etapa: aprovado ? "confirmado" : "aguardando pagamento",
              criadoEm: existente?.criadoEm ?? agora,
              atualizadoEm: agora,
              tentativas: (existente?.tentativas ?? 0) + 1,
              pontosCreditados: false,
            };
            if (existente)
              registro.pedidos[registro.pedidos.indexOf(existente)] = pedido;
            else registro.pedidos.push(pedido);
            if (aprovado) {
              if (usuarioId)
                registro.saldos[usuarioId] = saldo - beneficio.pontos;
              estado.put(
                { ...sacola, itens: [], revisao: sacola.revisao + 1 },
                "sacola-pessoal",
              );
              estado.delete("finalizacao-pessoal");
            }
            estado.put(registro, CHAVE);
            estado.put(
              { pedidoId: pedido.id, contexto, ultimaAtividade: agora },
              "acompanhamento-pessoal",
            );
            resultado = pedido;
          }
          if (acao === "avancar") {
            if (!pedidoVisivel || pedidoVisivel.id !== entrada.id)
              throw new Error(
                "Reabra o acompanhamento para conferir o pedido.",
              );
            // Uma confirmação antiga de outra aba não pode pular duas etapas.
            if (pedidoVisivel.etapa !== entrada.etapa)
              throw new Error("A etapa mudou. Atualize o acompanhamento.");
            pedidoVisivel.etapa = proximaEtapa(pedidoVisivel);
            pedidoVisivel.atualizadoEm = agora;
            if (
              ["retirado", "entregue"].includes(pedidoVisivel.etapa) &&
              !pedidoVisivel.pontosCreditados
            ) {
              if (pedidoVisivel.usuarioId)
                registro.saldos[pedidoVisivel.usuarioId] =
                  (registro.saldos[pedidoVisivel.usuarioId] ?? 0) +
                  calcularPontos(pedidoVisivel);
              pedidoVisivel.pontosCreditados = true;
            }
            estado.put(registro, CHAVE);
            resultado = pedidoVisivel;
          }
        } catch (erro) {
          falha = erro instanceof DOMException ? null : erro;
          transacao.abort();
        }
      }
      transacao.oncomplete = () => {
        banco.close();
        resolver(structuredClone(resultado));
      };
      transacao.onabort = () => {
        banco.close();
        rejeitar(
          falha ??
            new Error(
              "Não foi possível salvar o pedido. Confira o armazenamento e tente novamente.",
            ),
        );
      };
      transacao.onerror = () => {};
    });
  }
  return { executar };
}
