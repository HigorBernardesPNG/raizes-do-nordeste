import {
  criarElemento,
  criarTitulo,
  criarLink,
} from "../componentes/elementos";

export function montarPrivacidade({ bloqueado, limpar }) {
  const elemento = criarElemento("section", "", "painel");
  const ouvintes = new AbortController();
  elemento.append(
    criarTitulo("Privacidade e dados"),
    criarElemento(
      "p",
      "Esta demonstração permite consultar um cardápio fictício sem informar dados pessoais.",
    ),
    criarElemento("h2", "Dados armazenados neste navegador"),
    criarElemento(
      "p",
      "A unidade, os itens, as quantidades e as observações da sacola ficam neste navegador. O cadastro opcional mantém nome, telefone, e-mail, preferência de campanhas e um verificador derivado da senha. Use somente dados fictícios. A finalização mantém temporariamente nome, telefone e endereço de entrega. Após a confirmação, pedido, resultado do pagamento fictício e pontos ficam salvos localmente. O número completo do cartão e o código de segurança não são gravados.",
    ),
    criarElemento(
      "p",
      "A aplicação não utiliza ferramentas de publicidade ou análise de navegação. O provedor de hospedagem poderá manter registros técnicos de acesso, conforme sua própria política.",
    ),
    criarElemento(
      "p",
      "Esses dados não são sincronizados com outros dispositivos. Limpar os dados do site ou usar uma janela privada pode apagá-los. Outra pessoa que use o mesmo perfil do navegador poderá ver a sacola.",
    ),
    criarElemento(
      "p",
      "As fontes são carregadas junto com o site. Não há envio da sacola a um servidor nesta demonstração.",
    ),
    criarElemento(
      "p",
      "A preferência de campanhas começa desmarcada no cadastro e pode ser alterada em Minha conta. A escolha registra data e versão do aviso. Nenhuma campanha é enviada e não há rastreamento publicitário.",
    ),
    criarElemento(
      "p",
      "Sair encerra a sessão, apaga o preenchimento pessoal da finalização e mantém a sacola e o cadastro. O preenchimento também expira após 20 minutos sem interação, inclusive como visitante. Ele pode ser apagado pelo botão Limpar preenchimento na finalização. A limpeza abaixo remove somente sacola e unidade. Esta demonstração não oferece exportação ou edição do perfil. Para remover todos os registros locais, use a opção de limpar os dados deste site nas configurações do navegador. Essa ação também apaga contas, sacolas, pedidos e pontos salvos. No totem, encerrar o atendimento remove o acesso aos dados do cliente anterior, sem apagar o registro do pedido.",
    ),
    criarLink("Acessar minha conta", "#/conta"),
    criarLink("Voltar ao cardápio", "#/cardapio"),
  );
  const abrir = criarElemento(
    "button",
    "Limpar sacola e unidade salvas",
    "botao botao--secundario",
  );
  abrir.type = "button";
  abrir.disabled = bloqueado;
  const confirmacao = criarElemento("div", "", "aviso");
  confirmacao.hidden = true;
  const titulo = criarElemento("h2", "Apagar a sacola deste navegador?");
  titulo.tabIndex = -1;
  const confirmar = criarElemento("button", "Confirmar limpeza", "botao");
  const cancelar = criarElemento(
    "button",
    "Manter dados",
    "botao botao--secundario",
  );
  confirmar.type = cancelar.type = "button";
  const retorno = criarElemento("p");
  retorno.setAttribute("role", "status");
  confirmacao.append(
    titulo,
    criarElemento(
      "p",
      "Os itens e suas observações serão apagados. A unidade voltará para Boa Vista. Esta ação não pode ser desfeita.",
    ),
    confirmar,
    cancelar,
    retorno,
  );
  abrir.addEventListener(
    "click",
    () => {
      confirmacao.hidden = false;
      titulo.focus();
    },
    { signal: ouvintes.signal },
  );
  cancelar.addEventListener(
    "click",
    () => {
      confirmacao.hidden = true;
      abrir.focus();
    },
    { signal: ouvintes.signal },
  );
  confirmar.addEventListener(
    "click",
    async () => {
      confirmar.disabled = cancelar.disabled = true;
      try {
        await limpar();
      } catch (erro) {
        retorno.textContent = erro.message;
        confirmar.disabled = cancelar.disabled = false;
      }
    },
    { signal: ouvintes.signal },
  );
  elemento.append(abrir, confirmacao);
  return {
    elemento,
    titulo: "Privacidade e dados",
    desmontar: () => ouvintes.abort(),
  };
}
