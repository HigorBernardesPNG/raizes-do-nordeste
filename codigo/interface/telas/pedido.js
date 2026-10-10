import {
  criarElemento,
  criarTitulo,
  criarLink,
  formatarPreco,
} from "../componentes/elementos";
import { BENEFICIOS } from "../../dominio/pedido";

export function montarAcompanhamento(estado, recarregar) {
  const ouvintes = new AbortController();
  const elemento = criarElemento("section", "", "painel");
  elemento.append(criarTitulo("Acompanhar pedido"));
  const pedido = estado.pedido;
  if (estado.erro || !pedido)
    elemento.append(
      criarElemento(
        "p",
        estado.erro ||
          "Nenhum pedido disponível neste acesso. Entre na conta ou conclua uma compra.",
      ),
      criarLink("Ver cardápio", "#/cardapio"),
    );
  else {
    const compra = pedido.compra;
    elemento.append(
      criarElemento(
        "p",
        `Pedido ${pedido.id.slice(0, 8)} · ${compra.unidade.nome}`,
      ),
      criarElemento("h2", `Status: ${pedido.etapa}`),
      criarElemento(
        "p",
        `Pagamento ${pedido.pagamento} · Total ${formatarPreco(compra.totalCentavos)}`,
      ),
    );
    for (const item of compra.itens)
      elemento.append(
        criarElemento(
          "p",
          `${item.quantidade} × ${item.produto.nome}${item.observacao ? ` · ${item.observacao}` : ""}`,
        ),
      );
    elemento.append(
      criarElemento(
        "p",
        compra.dados.recebimento === "retirada"
          ? `Retirada: ${compra.unidade.endereco}. ${pedido.etapa === "retirado" ? "Retirada concluída." : pedido.etapa === "pronto" ? "Seu pedido está pronto para retirar." : "Aguarde o status Pronto."}`
          : "Entrega demonstrativa: previsão de 45 minutos após aprovação. As etapas são simuladas.",
      ),
    );
    if (pedido.pontosCreditados)
      elemento.append(
        criarElemento(
          "p",
          pedido.usuarioId
            ? "Pedido concluído. Os pontos desta compra foram adicionados ao saldo."
            : "Pedido concluído como visitante, sem acúmulo de pontos.",
        ),
      );
    elemento.append(
      criarElemento(
        "p",
        "As etapas deste pedido são simuladas. Para avançar, abra os controles da demonstração.",
        "texto-apoio",
      ),

      criarLink("Controles da demonstração", "#/demonstracao"),
    );
    if (pedido.pagamento === "recusado")
      elemento.append(
        criarLink("Corrigir e tentar pagamento", "#/finalizacao"),
      );
  }
  const atualizar = criarElemento(
    "button",
    "Atualizar acompanhamento",
    "botao botao--secundario",
  );
  atualizar.type = "button";
  atualizar.addEventListener("click", recarregar, { signal: ouvintes.signal });
  elemento.append(atualizar);
  return {
    elemento,
    titulo: "Acompanhar pedido",
    desmontar: () => ouvintes.abort(),
  };
}

export function montarFidelidade(estado, perfil) {
  const elemento = criarElemento("section", "", "painel");
  elemento.append(criarTitulo("Fidelidade"));
  if (estado.erro) elemento.append(criarElemento("p", estado.erro, "aviso"));
  else if (!perfil)
    elemento.append(
      criarElemento(
        "p",
        "Entre na conta para consultar pontos. Comprar como visitante continua disponível.",
      ),
      criarLink("Entrar na conta", "#/entrar"),
    );
  else {
    elemento.append(
      criarElemento("h2", `Seu saldo: ${estado.saldo} pontos`),
      criarElemento(
        "p",
        "A cada real inteiro pago em produtos, após descontos, você recebe um ponto quando o pedido é retirado ou entregue. A taxa não gera pontos.",
      ),
    );
    for (const b of BENEFICIOS)
      elemento.append(
        criarElemento(
          "p",
          `${b.pontos} pontos → ${formatarPreco(b.desconto)} de desconto. Mínimo ${formatarPreco(b.minimo)} em produtos. ${estado.saldo >= b.pontos ? "Saldo suficiente." : "Saldo insuficiente."}`,
        ),
      );
    elemento.append(
      criarElemento(
        "p",
        "Escolha o benefício antes do pagamento. Os pontos são descontados somente após aprovação. Não acumula com RAIZES5.",
      ),
    );
    if (perfil.campanhas?.permitidas)
      elemento.append(
        criarElemento(
          "aside",
          estado.saldo >= 100
            ? "Campanha para participantes com saldo a partir de 100 pontos: consulte os descontos que já pode resgatar. Exibição autorizada pela sua preferência de campanhas."
            : "Campanha para participantes com saldo abaixo de 100 pontos: acumule pontos nas compras concluídas para usar os descontos. Exibição autorizada pela sua preferência de campanhas.",
          "aviso",
        ),
      );
  }
  elemento.append(
    criarLink("Continuar compra", "#/cardapio"),
    criarLink("Preferência de campanhas", "#/conta"),
  );
  return { elemento, titulo: "Fidelidade" };
}

export function montarDemonstracao(estado, acoes) {
  const elemento = criarElemento("section", "", "painel");
  const ouvintes = new AbortController();
  elemento.append(
    criarTitulo("Controles da demonstração"),
    criarElemento(
      "p",
      "Escolha se o pagamento será aprovado ou recusado. Depois da aprovação, avance as etapas do pedido para simular o preparo e a conclusão.",
    ),
  );
  const retorno = criarElemento("p");
  retorno.setAttribute("role", "status");
  if (estado.erro) retorno.textContent = estado.erro;
  const label = criarElemento("label", "Resultado do próximo pagamento");
  const cenario = criarElemento("select");
  cenario.id = "cenario-pagamento";
  label.htmlFor = cenario.id;
  for (const valor of ["aprovado", "recusado"]) {
    const op = criarElemento("option", valor);
    op.value = valor;
    cenario.append(op);
  }
  cenario.value = estado.cenario ?? "aprovado";
  const modo = criarElemento("label", "", "escolha-campanhas");
  const totem = criarElemento("input");
  totem.type = "checkbox";
  totem.checked = estado.totem;
  modo.append(
    totem,
    criarElemento("span", "Modo totem: unidade Boa Vista e retirada"),
  );
  elemento.append(
    label,
    cenario,
    modo,
    criarElemento(
      "p",
      "Ao trocar o modo, o acesso, a sacola e o preenchimento são limpos para iniciar outro atendimento. Contas e pedidos salvos permanecem no navegador.",
      "aviso",
    ),
  );
  function botao(texto, acao) {
    const b = criarElemento("button", texto, "botao");
    b.type = "button";
    b.addEventListener(
      "click",
      async () => {
        if (b.disabled) return;
        b.disabled = true;
        try {
          await acao();
        } catch (erro) {
          retorno.textContent = erro.message;
        } finally {
          b.disabled = false;
        }
      },
      { signal: ouvintes.signal },
    );
    elemento.append(b);
  }
  botao("Salvar configuração", () =>
    acoes.configurar({ cenario: cenario.value, totem: totem.checked }),
  );
  if (estado.pedido) {
    elemento.append(
      criarElemento("h2", `Pedido atual: ${estado.pedido.etapa}`),
    );
    if (!["retirado", "entregue"].includes(estado.pedido.etapa))
      botao("Avançar etapa do pedido", () => acoes.avancar(estado.pedido));
  }
  if (estado.totem) botao("Encerrar atendimento do totem", acoes.encerrar);
  elemento.append(
    retorno,
    criarLink("Voltar à compra", "#/finalizacao"),
    criarLink("Acompanhar pedido", "#/acompanhamento"),
  );
  return {
    elemento,
    titulo: "Demonstração",
    desmontar: () => ouvintes.abort(),
  };
}
