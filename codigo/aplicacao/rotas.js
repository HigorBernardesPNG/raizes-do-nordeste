export function identificarRota(hash) {
  if (!hash || hash === "#" || hash === "#/") return { nome: "cardapio" };
  if (hash === "#/acompanhamento") return { nome: "acompanhamento" };
  if (hash === "#/fidelidade") return { nome: "fidelidade" };
  if (hash === "#/demonstracao") return { nome: "demonstracao" };
  if (hash === "#/cardapio") return { nome: "cardapio" };
  if (hash === "#/privacidade") return { nome: "privacidade" };
  if (hash === "#/finalizacao") return { nome: "finalizacao" };
  if (hash === "#/sacola") return { nome: "sacola" };
  if (hash === "#/unidades") return { nome: "unidades" };
  if (hash === "#/entrar") return { nome: "entrar" };
  if (hash === "#/cadastro") return { nome: "cadastro" };
  if (hash === "#/conta") return { nome: "conta" };

  const produto = hash.match(/^#\/produto\/([a-z0-9-]+)$/);
  if (produto) return { nome: "produto", identificador: produto[1] };

  return { nome: "nao-encontrada" };
}

export function iniciarNavegacao({
  recipiente,
  montarTela,
  antesDeMontar = async () => {},
  janela = window,
}) {
  let desmontarTela = () => {};
  let revisaoNavegacao = 0;

  async function atualizarTela() {
    // A âncora de acessibilidade não é uma rota da aplicação.
    if (janela.location.hash === "#conteudo-principal") {
      recipiente.focus();
      return;
    }

    desmontarTela();
    desmontarTela = () => {};
    const revisao = ++revisaoNavegacao;
    recipiente.replaceChildren();
    await antesDeMontar();
    // Uma consulta antiga não pode montar a tela depois de uma navegação mais recente.
    if (revisao !== revisaoNavegacao) return;
    const rota = identificarRota(janela.location.hash);
    const tela = montarTela(rota);
    recipiente.replaceChildren(tela.elemento);
    desmontarTela = tela.desmontar ?? (() => {});
    document.title = `${tela.titulo} | Raízes do Nordeste`;
    // A consulta da sessão já terminou; o título precisa estar visível para receber foco.
    if (!document.hidden) recipiente.style.visibility = "";
    recipiente.querySelector("h1")?.focus();
    janela.scrollTo(0, 0);
  }

  if (!janela.location.hash || janela.location.hash === "#conteudo-principal") {
    janela.history.replaceState(null, "", "#/cardapio");
  }
  janela.addEventListener("hashchange", atualizarTela);
  atualizarTela();

  const encerrar = () => {
    revisaoNavegacao++;
    janela.removeEventListener("hashchange", atualizarTela);
    desmontarTela();
  };
  encerrar.atualizar = atualizarTela;
  return encerrar;
}
