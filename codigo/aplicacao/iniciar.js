import { criarControlePedido } from "./pedido";
import { criarRepositorioPedido } from "../persistencia/pedido";
import {
  montarAcompanhamento,
  montarFidelidade,
  montarDemonstracao,
} from "../interface/telas/pedido";
import { criarControleFinalizacao } from "./finalizacao";
import { criarRepositorioFinalizacao } from "../persistencia/finalizacao";
import { montarFinalizacao } from "../interface/telas/finalizacao";
import "../estilos/principal.scss";
import { iniciarNavegacao } from "./rotas";
import { criarControleSacola } from "./sacola";
import { criarRepositorioSacola } from "../persistencia/sacola";
import { consultarCatalogoInicial } from "../servicos/simulados/catalogo";
import { montarCardapio } from "../interface/telas/cardapio";
import { montarProduto } from "../interface/telas/produto";
import { montarSacola } from "../interface/telas/sacola";
import { montarUnidades } from "../interface/telas/unidades";
import { montarPrivacidade } from "../interface/telas/privacidade";
import { montarNaoEncontrada } from "../interface/telas/nao-encontrada";
import { criarElemento } from "../interface/componentes/elementos";
import { criarControleConta } from "./conta";
import { criarRepositorioConta } from "../persistencia/conta";
import { acompanharInatividade } from "./inatividade";
import { montarAcesso } from "../interface/telas/acesso";
import { montarConta } from "../interface/telas/conta";

const catalogo = consultarCatalogoInicial();
const pedidos = criarControlePedido(criarRepositorioPedido(catalogo));
const sacola = criarControleSacola(catalogo, criarRepositorioSacola());
const conta = criarControleConta(criarRepositorioConta());
const finalizacao = criarControleFinalizacao(
  criarRepositorioFinalizacao(catalogo),
);
const recipiente = document.querySelector("#conteudo-principal");
let mensagem = "";
let navegacao;
let operacaoEmAndamento = false;
let sessaoExibida = null;
let perfilExibido = "";
let ultimaRotaPublica = "#/conta";
let retornoAcesso = "#/conta";
const ouvintesGlobais = new AbortController();

function atualizarInterfaceConta(reconstruir = true) {
  const estado = conta.consultar();
  const sessaoAtual = estado.sessao?.id ?? null;
  const perfilAtual = JSON.stringify(estado.perfil);
  const mudou = sessaoAtual !== sessaoExibida || perfilAtual !== perfilExibido;
  if (sessaoExibida && !sessaoAtual)
    mensagem =
      estado.situacao === "expirada"
        ? "Sua sessão terminou por inatividade. A sacola foi mantida."
        : "O acesso foi encerrado. A sacola foi mantida.";
  sessaoExibida = sessaoAtual;
  perfilExibido = perfilAtual;
  const acesso = document.querySelector("#acesso-conta");
  acesso.textContent = sessaoAtual ? "Minha conta" : "Entrar";
  acesso.href = sessaoAtual ? "#/conta" : "#/entrar";
  document.querySelector("#sair-conta").hidden = !sessaoAtual;
  const rascunho = finalizacao.consultar().registro;
  const avisoVisitante =
    !sessaoAtual &&
    rascunho &&
    Date.now() - rascunho.ultimaAtividade >= 19 * 60000;
  document.querySelector("#aviso-inatividade").hidden =
    estado.situacao !== "aviso" && !avisoVisitante;
  document.querySelector("#aviso-inatividade p").textContent = avisoVisitante
    ? "O preenchimento chegou a 19 minutos sem atividade e será apagado aos 20 minutos."
    : "A sessão chegou a 19 minutos sem atividade e será encerrada aos 20 minutos.";
  const aviso = document.querySelector("#aviso-conta");
  aviso.hidden = !estado.erro;
  if (aviso.dataset.erro !== estado.erro) {
    aviso.dataset.erro = estado.erro;
    aviso.replaceChildren();
    if (estado.erro) {
      aviso.append(
        criarElemento("p", `Acesso local indisponível. ${estado.erro}`),
      );
      const tentar = criarElemento(
        "button",
        "Tentar acesso novamente",
        "botao botao--secundario",
      );
      tentar.type = "button";
      tentar.addEventListener("click", async () => {
        tentar.disabled = true;
        await conta.inicializar();
        atualizarInterfaceConta(false);
        await navegacao.atualizar();
        tentar.disabled = false;
      });
      aviso.append(tentar);
    }
  }
  if (reconstruir && mudou && navegacao) return navegacao.atualizar();
}

async function concluirAcesso(acao, sinal) {
  await acao();
  atualizarInterfaceConta(false);
  if (sinal.aborted) return;
  mensagem = "Acesso realizado. A sacola foi mantida.";
  if (window.location.hash === retornoAcesso) await navegacao.atualizar();
  else window.location.hash = retornoAcesso;
}

function atualizarCabecalho() {
  const resumo = sacola.consultar();
  document.querySelector("#acesso-sacola").textContent =
    `Sacola (${resumo.quantidade})`;
  const aviso = document.querySelector("#aviso-armazenamento");
  aviso.hidden = !resumo.aviso;
  aviso.replaceChildren();
  if (resumo.aviso) {
    aviso.append(criarElemento("p", resumo.aviso));
    const tentar = criarElemento(
      "button",
      "Tentar novamente",
      "botao botao--secundario",
    );
    tentar.type = "button";
    tentar.addEventListener(
      "click",
      async () => {
        tentar.disabled = true;
        await sacola.carregar();
        atualizarCabecalho();
        navegacao.atualizar();
      },
      { once: true },
    );
    aviso.append(tentar);
  }
}

async function executar(acao, atualizarTela = false) {
  if (operacaoEmAndamento)
    throw new Error("Aguarde a alteração anterior terminar.");
  operacaoEmAndamento = true;
  try {
    await acao();
    atualizarCabecalho();
    if (atualizarTela) {
      mensagem = "Alteração salva no navegador.";
      navegacao.atualizar();
    }
  } catch (erro) {
    if (erro.codigo === "CONFLITO") {
      mensagem = erro.message;
      atualizarCabecalho();
      navegacao.atualizar();
    }
    throw erro;
  } finally {
    operacaoEmAndamento = false;
  }
}

function montarTela(rota) {
  const unidade = sacola.consultarCatalogo();
  const resumo = sacola.consultar();
  let tela;
  const acesso = conta.consultar();
  const comercio = pedidos.consultar();
  const rotaDeAcesso = ["entrar", "cadastro", "conta"].includes(rota.nome);
  if (rotaDeAcesso && !acesso.perfil) retornoAcesso = ultimaRotaPublica;
  if (!rotaDeAcesso && rota.nome !== "nao-encontrada")
    ultimaRotaPublica = window.location.hash;
  if (rotaDeAcesso) {
    if (acesso.perfil)
      tela = montarConta(acesso.perfil, async (permitidas) => {
        try {
          await conta.alterarCampanhas(permitidas, acesso.sessao.id);
          atualizarInterfaceConta(false);
        } catch (erro) {
          atualizarInterfaceConta();
          throw erro;
        }
      });
    else
      tela = montarAcesso({
        cadastro: rota.nome === "cadastro",
        bloqueado: !acesso.disponivel,
        entrar: (email, senha, sinal) =>
          concluirAcesso(() => conta.entrar(email, senha, sinal), sinal),
        cadastrar: (dados, sinal) =>
          concluirAcesso(() => conta.cadastrar(dados, sinal), sinal),
      });
  }
  if (rota.nome === "finalizacao") {
    const contexto = acesso.sessao?.id ?? null;
    tela = montarFinalizacao({
      resumo,
      estado: finalizacao.consultar(),
      perfil: acesso.perfil,
      salvar: (dados) => finalizacao.salvar(dados, contexto),
      revisar: (dados) => finalizacao.revisar(dados, contexto),
      limpar: () => finalizacao.limpar(contexto),
      recarregar: () => navegacao.atualizar(),
      saldo: comercio.saldo,
      totem: comercio.totem,
      pagar: (resultado, beneficio, cartao, sinal) =>
        pedidos.pagar(
          {
            referencia: resultado.registro.id,
            revisao: resultado.revisao,
            contexto,
            beneficio,
          },
          cartao,
          sinal,
        ),
    });
  }
  if (rota.nome === "acompanhamento")
    tela = montarAcompanhamento(comercio, () => navegacao.atualizar());
  if (rota.nome === "fidelidade")
    tela = montarFidelidade(comercio, acesso.perfil);
  if (rota.nome === "demonstracao")
    tela = montarDemonstracao(comercio, {
      configurar: async (dados) => {
        await pedidos.configurar(dados);
        mensagem = "Configuração salva.";
        await navegacao.atualizar();
      },
      avancar: async (pedido) => {
        await pedidos.avancar(pedido);
        await navegacao.atualizar();
      },
      encerrar: encerrarAtendimento,
    });
  if (rota.nome === "cardapio")
    tela = montarCardapio({ unidade, produtos: unidade.produtos });
  if (rota.nome === "privacidade")
    tela = montarPrivacidade({
      bloqueado: !resumo.disponivel,
      limpar: () => executar(() => sacola.limpar(), true),
    });
  if (rota.nome === "sacola")
    tela = montarSacola(resumo, {
      editar: (id, quantidade, observacao) =>
        executar(() => sacola.editar(id, quantidade, observacao), true),
      remover: (id) => executar(() => sacola.remover(id), true),
    });
  if (rota.nome === "unidades" && comercio.totem) {
    const elemento = criarElemento(
      "section",
      "A unidade do totem é Boa Vista. Volte ao cardápio ou encerre o modo em Demonstração.",
      "painel",
    );
    tela = { elemento, titulo: "Unidade do totem" };
  }
  if (rota.nome === "unidades" && !comercio.totem)
    tela = montarUnidades(catalogo.unidades, resumo, {
      preparar: (id) => sacola.prepararTroca(id),
      confirmar: async (previa) => {
        await executar(() => sacola.confirmarTroca(previa));
        mensagem =
          "Unidade alterada. A sacola foi atualizada conforme a revisão.";
        window.location.hash = "#/sacola";
      },
    });
  if (rota.nome === "produto") {
    const produto = unidade.produtos.find(
      (produto) => produto.id === rota.identificador,
    );
    if (produto)
      tela = montarProduto(produto, {
        unidade,
        bloqueado: !resumo.disponivel,
        incluir: (entrada) => executar(() => sacola.incluir(entrada)),
      });
  }
  tela ??= montarNaoEncontrada();
  if (comercio.totem) {
    for (const link of tela.elemento.querySelectorAll('a[href="#/unidades"]'))
      link.remove();
  }
  if (mensagem) {
    const aviso = criarElemento("p", mensagem, "aviso");
    aviso.setAttribute("role", "status");
    tela.elemento.prepend(aviso);
    mensagem = "";
  }
  return tela;
}

// Carrego o registro antes de abrir as telas para não mostrar uma sacola vazia por engano.
recipiente.textContent = "Carregando cardápio e sacola…";
await sacola.carregar();
await conta.inicializar();
atualizarCabecalho();
atualizarInterfaceConta(false);
navegacao = iniciarNavegacao({
  recipiente,
  montarTela,
  antesDeMontar: async () => {
    await pedidos.sincronizar();
    await conta.atualizar();
    await finalizacao.sincronizar(conta.consultar().sessao?.id ?? null);
    await sacola.carregar();
    atualizarCabecalho();
    atualizarInterfaceConta(false);
    const comercio = pedidos.consultar();
    document.body.classList.toggle("modo-totem", comercio.totem);
    document.querySelector("#encerrar-totem").hidden = !comercio.totem;
  },
});

document.querySelector("#sair-conta").addEventListener(
  "click",
  async (evento) => {
    evento.currentTarget.disabled = true;
    try {
      await conta.sair();
      mensagem = "Você saiu da conta. A sacola foi mantida.";
    } catch (erro) {
      mensagem = erro.message;
    }
    atualizarInterfaceConta(false);
    await navegacao.atualizar();
    document.querySelector("#sair-conta").disabled = false;
  },
  { signal: ouvintesGlobais.signal },
);
document.querySelector("#continuar-sessao").addEventListener(
  "click",
  async () => {
    await conta.registrarAtividade();
    await atualizarContextos(true);
  },
  { signal: ouvintesGlobais.signal },
);

async function atualizarContextos(renovar = false) {
  if (renovar) await pedidos.renovar();
  const antes = JSON.stringify([
    pedidos.consultar().pedido,
    pedidos.consultar().saldo,
    pedidos.consultar().totem,
    pedidos.consultar().erro,
  ]);
  await pedidos.sincronizar();
  if (
    navegacao &&
    antes !==
      JSON.stringify([
        pedidos.consultar().pedido,
        pedidos.consultar().saldo,
        pedidos.consultar().totem,
        pedidos.consultar().erro,
      ]) &&
    ["#/acompanhamento", "#/fidelidade"].includes(window.location.hash)
  )
    await navegacao.atualizar();
  // Comparo dentro da fila: uma gravação desta tela não é uma alteração externa.
  const mudou = await finalizacao.sincronizar(
    conta.consultar().sessao?.id ?? null,
    renovar,
  );
  await atualizarInterfaceConta();
  if (window.location.hash === "#/finalizacao" && mudou)
    await navegacao.atualizar();
}

let focoAntesDeOcultar = null;
const encerrarInatividade = acompanharInatividade({
  conta,
  aoAtualizar: atualizarContextos,
  aoInteragir: () => atualizarContextos(true),
  aoOcultar: () => {
    if (recipiente.style.visibility !== "hidden")
      focoAntesDeOcultar = document.activeElement;
    recipiente.style.visibility = "hidden";
  },
  aoRetomar: async () => {
    // Confiro o horário antes de tornar visível qualquer conteúdo de conta da aba suspensa.
    await conta.atualizar();
    await atualizarContextos();
    if (document.querySelector("#conteudo-principal h1") === null)
      await navegacao.atualizar();
    if (document.hidden) return;
    recipiente.style.visibility = "";
    if (document.activeElement === document.body) {
      const foco =
        focoAntesDeOcultar?.isConnected && focoAntesDeOcultar !== document.body
          ? focoAntesDeOcultar
          : recipiente.querySelector("h1");
      foco?.focus();
    }
  },
});

// A conferência de revisão protege as alterações entre abas. O retorno à aba atualiza a consulta.
async function aoRetornar() {
  if (operacaoEmAndamento) return;
  const antes = JSON.stringify(sacola.consultar());
  await sacola.carregar();
  if (JSON.stringify(sacola.consultar()) !== antes) {
    mensagem =
      "Os dados locais foram atualizados. Confira a sacola antes de continuar.";
    atualizarCabecalho();
    navegacao.atualizar();
  }
}
window.addEventListener("focus", aoRetornar);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    navegacao();
    window.removeEventListener("focus", aoRetornar);
    ouvintesGlobais.abort();
    encerrarInatividade();
  });

async function encerrarAtendimento() {
  await pedidos.encerrar();
  await navegacao.atualizar();
  window.location.hash = "#/cardapio";
}
document.querySelector("#encerrar-totem").addEventListener(
  "click",
  async () => {
    try {
      await encerrarAtendimento();
    } catch (erro) {
      mensagem = erro.message;
      await navegacao.atualizar();
    }
  },
  { signal: ouvintesGlobais.signal },
);
