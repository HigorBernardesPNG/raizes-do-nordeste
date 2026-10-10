import { montarPagamento } from "../componentes/pagamento";
import {
  criarElemento,
  criarTitulo,
  criarLink,
  formatarPreco,
} from "../componentes/elementos";
import { criarDadosFinalizacao } from "../../dominio/finalizacao";

export function montarFinalizacao({
  resumo,
  estado,
  perfil,
  salvar,
  revisar,
  limpar,
  recarregar,
  pagar,
  saldo = 0,
  totem = false,
}) {
  const elemento = criarElemento("section", "", "painel");
  const ouvintes = new AbortController();
  elemento.append(
    criarTitulo("Finalizar compra"),
    criarElemento(
      "p",
      `Unidade ${resumo.unidade.nome} · ${resumo.unidade.cidade}/${resumo.unidade.uf}`,
    ),
    criarLink("Voltar à sacola", "#/sacola"),
    criarLink("Trocar unidade", "#/unidades"),
  );
  if (
    !resumo.disponivel ||
    estado.erro ||
    !resumo.itens.length ||
    !resumo.unidade.aberta
  ) {
    const texto =
      estado.erro ||
      (!resumo.disponivel
        ? resumo.aviso
        : !resumo.itens.length
          ? "A sacola está vazia. Escolha um produto antes de continuar."
          : "Esta unidade está fechada. Escolha uma unidade aberta antes de continuar.");
    const aviso = criarElemento("p", texto, "aviso");
    aviso.setAttribute("role", "alert");
    const tentar = criarElemento("button", "Conferir novamente", "botao");
    tentar.type = "button";
    tentar.addEventListener("click", recarregar, { signal: ouvintes.signal });
    elemento.append(aviso, tentar);
    return {
      elemento,
      titulo: "Finalizar compra",
      desmontar: () => ouvintes.abort(),
    };
  }
  elemento.append(
    criarElemento(
      "p",
      "Use somente dados fictícios. Nome e telefone identificam quem receberá o pedido. O endereço é solicitado apenas na entrega. O preenchimento fica neste navegador e é apagado após 20 minutos sem interação ou ao sair da conta.",
      "aviso",
    ),
  );
  if (!perfil) {
    const convite = criarElemento("aside", "", "convite-conta");
    convite.append(
      criarElemento("h2", "Quer participar da fidelização?"),
      criarElemento(
        "p",
        "Ao entrar antes do pagamento, a compra poderá contar para futuros descontos, após sua conclusão. Você também pode continuar preenchendo abaixo, sem criar conta.",
      ),
      criarLink("Entrar e continuar compra", "#/entrar"),
      criarLink("Criar conta e continuar", "#/cadastro"),
    );
    elemento.append(convite);
  }
  const dadosIniciais =
    estado.registro?.dados ?? criarDadosFinalizacao(resumo.unidade);
  const formulario = criarElemento("form", "", "formulario-finalizacao");
  formulario.noValidate = true;
  const campos = {};
  const erros = {};
  function campo(
    nome,
    rotulo,
    tipo = "text",
    maximo = 120,
    recipiente = formulario,
  ) {
    const grupo = criarElemento("div", "", "campo-finalizacao");
    const label = criarElemento("label", rotulo);
    const input = criarElemento("input");
    input.id = `finalizacao-${nome}`;
    input.name = nome;
    input.type = tipo;
    if (tipo === "checkbox") input.checked = dadosIniciais[nome] === true;
    else {
      input.value = dadosIniciais[nome] ?? "";
      input.maxLength = maximo;
    }
    input.autocomplete = "off";
    label.htmlFor = input.id;
    const erro = criarElemento("p", "", "erro-campo");
    erro.id = `erro-${nome}`;
    input.setAttribute("aria-describedby", erro.id);
    grupo.append(label, input, erro);
    recipiente.append(grupo);
    campos[nome] = input;
    erros[nome] = erro;
    return input;
  }
  formulario.append(criarElemento("h2", "Quem vai receber?"));
  campo("nome", "Nome de quem recebe", "text", 80);
  campo("telefone", "Telefone com DDD", "tel", 20);
  const recebimento = criarElemento("fieldset");
  recebimento.append(criarElemento("legend", "Como deseja receber?"));
  for (const [valor, rotulo] of [
    ["retirada", "Retirada na unidade · sem taxa"],
    ...(!totem ? [["entrega", "Entrega · R$ 5,00"]] : []),
  ]) {
    const label = criarElemento("label", "", "escolha-campanhas");
    const radio = criarElemento("input");
    radio.type = "radio";
    radio.name = "recebimento";
    radio.value = valor;
    radio.checked = dadosIniciais.recebimento === valor;
    label.append(radio, criarElemento("span", rotulo));
    recebimento.append(label);
  }
  formulario.append(recebimento);
  const endereco = criarElemento("fieldset");
  endereco.append(criarElemento("legend", "Endereço de entrega"));
  campo("logradouro", "Rua ou avenida", "text", 120, endereco);
  campo("numero", "Número", "text", 20, endereco);
  campo("semNumero", "Sem número", "checkbox", 0, endereco);
  campo("bairro", "Bairro", "text", 80, endereco);
  campo("complemento", "Complemento (opcional)", "text", 120, endereco);
  campo("cidade", "Cidade", "text", 80, endereco);
  campo("uf", "UF", "text", 2, endereco);
  endereco.append(
    criarElemento(
      "p",
      "A entrega atende somente a cidade e UF desta unidade. Prazo demonstrativo de 45 minutos após aprovação do pagamento.",
      "texto-apoio",
    ),
  );
  formulario.append(endereco);
  const retirada = criarElemento(
    "p",
    `Retirada na unidade ${resumo.unidade.nome}, ${resumo.unidade.endereco}, ${resumo.unidade.cidade}/${resumo.unidade.uf}. Endereço fictício para demonstração.`,
  );
  const total = criarElemento("p", "", "subtotal");
  const retorno = criarElemento("p", "", "retorno-formulario");
  retorno.id = "retorno-finalizacao";
  retorno.setAttribute("role", "status");
  const continuar = criarElemento("button", "Revisar compra", "botao");
  continuar.type = "submit";
  const descartar = criarElemento(
    "button",
    "Limpar preenchimento",
    "botao botao--secundario",
  );
  descartar.type = "button";
  let confirmandoLimpeza = false;
  descartar.addEventListener(
    "click",
    async () => {
      if (!confirmandoLimpeza) {
        confirmandoLimpeza = true;
        descartar.textContent = "Confirmar limpeza do preenchimento";
        retorno.textContent =
          "Esta ação apaga nome, telefone e endereço desta compra. A sacola e o cadastro permanecem. Para desistir, continue preenchendo.";
        return;
      }
      descartar.disabled = true;
      try {
        await limpar();
        await recarregar();
      } catch (erro) {
        retorno.textContent = erro.message;
        descartar.disabled = false;
      }
    },
    { signal: ouvintes.signal },
  );
  formulario.append(
    retirada,
    total,
    criarElemento(
      "p",
      "Escolha um desconto na etapa de pagamento, após revisar os dados.",
      "texto-apoio",
    ),
    continuar,
    descartar,
    retorno,
  );
  const revisao = criarElemento("section", "", "revisao-compra");
  revisao.hidden = true;
  function ler() {
    const dados = Object.fromEntries(
      Object.entries(campos).map(([nome, input]) => [
        nome,
        input.type === "checkbox" ? input.checked : input.value,
      ]),
    );
    dados.recebimento = formulario.querySelector(
      'input[name="recebimento"]:checked',
    ).value;
    return dados;
  }
  function atualizarRecebimento() {
    const entrega = ler().recebimento === "entrega";
    endereco.hidden = !entrega;
    retirada.hidden = entrega;
    for (const nome of [
      "logradouro",
      "numero",
      "semNumero",
      "bairro",
      "complemento",
      "cidade",
      "uf",
    ])
      campos[nome].disabled = !entrega;
    if (entrega) {
      if (!campos.cidade.value) campos.cidade.value = resumo.unidade.cidade;
      if (!campos.uf.value) campos.uf.value = resumo.unidade.uf;
      campos.numero.disabled = campos.semNumero.checked;
      if (campos.semNumero.checked) campos.numero.value = "";
    } else {
      for (const nome of [
        "logradouro",
        "numero",
        "bairro",
        "complemento",
        "cidade",
        "uf",
      ])
        campos[nome].value = "";
      campos.semNumero.checked = false;
    }
    total.textContent = `Total previsto: ${formatarPreco(resumo.subtotalCentavos + (entrega ? 500 : 0))}`;
  }
  let revisaoSalvamento = 0;
  formulario.addEventListener(
    "input",
    async () => {
      confirmandoLimpeza = false;
      descartar.textContent = "Limpar preenchimento";
      atualizarRecebimento();
      for (const nome of Object.keys(erros)) {
        erros[nome].textContent = "";
        campos[nome].removeAttribute("aria-invalid");
      }
      const numero = ++revisaoSalvamento;
      retorno.textContent = "Salvando preenchimento…";
      try {
        await salvar(ler());
        if (!ouvintes.signal.aborted && numero === revisaoSalvamento)
          retorno.textContent = "Preenchimento salvo neste navegador.";
      } catch (erro) {
        if (!ouvintes.signal.aborted)
          retorno.textContent = `${erro.message} Os dados desta tentativa não foram confirmados.`;
      }
    },
    { signal: ouvintes.signal },
  );
  formulario.addEventListener(
    "submit",
    async (evento) => {
      evento.preventDefault();
      if (continuar.disabled) return;
      continuar.disabled = true;
      try {
        const resultado = await revisar(ler());
        if (ouvintes.signal.aborted) return;
        revisao.replaceChildren();
        const titulo = criarElemento("h2", "Revisão da compra");
        titulo.tabIndex = -1;
        const r = resultado.revisao;
        revisao.append(
          titulo,
          criarElemento(
            "p",
            `${r.unidade.nome} · ${r.unidade.cidade}/${r.unidade.uf}`,
          ),
        );
        for (const item of r.itens)
          revisao.append(
            criarElemento(
              "p",
              `${item.quantidade} × ${item.produto.nome} · ${formatarPreco(item.totalCentavos)}${item.observacao ? ` · ${item.observacao}` : ""}`,
            ),
          );
        revisao.append(
          criarElemento(
            "p",
            `Recebedor: ${r.dados.nome} · Telefone: ${r.dados.telefone}`,
          ),
        );
        revisao.append(
          criarElemento(
            "p",
            r.dados.recebimento === "entrega"
              ? `Entrega: ${r.dados.logradouro}, ${r.dados.semNumero ? "sem número" : r.dados.numero}, ${r.dados.bairro}, ${r.dados.cidade}/${r.dados.uf}${r.dados.complemento ? ` · ${r.dados.complemento}` : ""}`
              : `Retirada na unidade · ${r.unidade.endereco}`,
          ),
        );
        for (const [rotulo, valor] of [
          ["Produtos", r.subtotalCentavos],
          ["Descontos", r.descontoCentavos],
          ["Entrega", r.taxaCentavos],
          ["Total", r.totalCentavos],
        ])
          revisao.append(
            criarElemento(
              "p",
              `${rotulo}: ${formatarPreco(valor)}`,
              rotulo === "Total" ? "subtotal" : "",
            ),
          );
        revisao.append(
          criarElemento(
            "p",
            "Revisão concluída. Nenhum pedido foi enviado. Confira os dados e utilize o cartão de teste abaixo para confirmar.",
            "aviso",
          ),
        );
        const editar = criarElemento(
          "button",
          "Editar preenchimento",
          "botao botao--secundario",
        );
        editar.type = "button";
        editar.addEventListener(
          "click",
          () => {
            revisao.hidden = true;
            formulario.hidden = false;
            campos.nome.focus();
          },
          { signal: ouvintes.signal },
        );
        const conferir = criarElemento("button", "Atualizar revisão", "botao");
        conferir.type = "button";
        conferir.addEventListener(
          "click",
          () => {
            formulario.hidden = false;
            revisao.hidden = true;
            formulario.requestSubmit();
          },
          { signal: ouvintes.signal },
        );
        revisao.append(
          montarPagamento({
            revisao: r,
            saldo,
            temConta: !!perfil,
            sinal: ouvintes.signal,
            pagar: (beneficio, cartao, sinal) =>
              pagar(resultado, beneficio, cartao, sinal),
          }),
        );
        revisao.append(
          editar,
          conferir,
          criarLink("Alterar produtos", "#/sacola"),
        );
        formulario.hidden = true;
        revisao.hidden = false;
        titulo.focus();
      } catch (erro) {
        retorno.textContent = erro.message;
        for (const [nome, texto] of Object.entries(erro.campos ?? {}))
          if (erros[nome]) {
            erros[nome].textContent = texto;
            campos[nome].setAttribute("aria-invalid", "true");
          }
        const primeiro = Object.keys(erro.campos ?? {})[0];
        campos[primeiro]?.focus();
      } finally {
        continuar.disabled = false;
      }
    },
    { signal: ouvintes.signal },
  );
  atualizarRecebimento();
  elemento.append(
    formulario,
    revisao,
    criarLink("Privacidade e dados", "#/privacidade"),
  );
  return {
    elemento,
    titulo: "Finalizar compra",
    desmontar() {
      ouvintes.abort();
      formulario.reset();
      revisao.replaceChildren();
    },
  };
}
