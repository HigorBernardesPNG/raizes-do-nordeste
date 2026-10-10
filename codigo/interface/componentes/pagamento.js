import { criarElemento, formatarPreco } from "./elementos";
import { calcularBeneficio, BENEFICIOS } from "../../dominio/pedido";

export function montarPagamento({ revisao, saldo, temConta, pagar, sinal }) {
  const formulario = criarElemento(
    "form",
    "",
    "formulario-finalizacao pagamento",
  );
  formulario.noValidate = true;
  formulario.append(
    criarElemento("h3", "Pagamento por cartão de teste"),
    criarElemento(
      "p",
      "Simulação sem cobrança. Use apenas 4111 1111 1111 1111, validade 12/30 e código 123. Não informe um cartão real.",
      "aviso",
    ),
  );
  const rotulo = criarElemento("label", "Desconto da compra");
  const beneficio = criarElemento("select");
  beneficio.id = "beneficio-compra";
  rotulo.htmlFor = beneficio.id;
  for (const [valor, texto] of [
    ["", "Sem desconto"],
    ["RAIZES5", "RAIZES5: R$ 5,00 · mínimo R$ 20,00"],
    ...BENEFICIOS.map((b) => [
      b.id,
      `${b.pontos} pontos: ${formatarPreco(b.desconto)} · mínimo ${formatarPreco(b.minimo)}`,
    ]),
  ]) {
    const opcao = criarElemento("option", texto);
    opcao.value = valor;
    beneficio.append(opcao);
  }
  formulario.append(
    rotulo,
    beneficio,
    criarElemento(
      "p",
      `Saldo: ${saldo} pontos. Escolha apenas um desconto. A taxa de entrega não recebe desconto.`,
      "texto-apoio",
    ),
  );
  const total = criarElemento("p", "", "subtotal");
  const erroBeneficio = criarElemento("p", "", "erro-campo");
  erroBeneficio.id = "erro-beneficio";
  beneficio.setAttribute("aria-describedby", erroBeneficio.id);
  const campos = {};
  const erros = {};
  for (const [nome, titulo, limite] of [
    ["numero", "Número do cartão de teste", 19],
    ["nome", "Nome fictício no cartão", 80],
    ["validade", "Validade de teste", 5],
    ["codigo", "Código de teste", 3],
  ]) {
    const grupo = criarElemento("div", "", "campo-finalizacao");
    const label = criarElemento("label", titulo);
    const campo = criarElemento("input");
    campo.id = `cartao-${nome}`;
    campo.maxLength = limite;
    campo.autocomplete = "off";
    if (["numero", "codigo"].includes(nome)) campo.inputMode = "numeric";
    label.htmlFor = campo.id;
    const erro = criarElemento("p", "", "erro-campo");
    erro.id = `erro-cartao-${nome}`;
    campo.setAttribute("aria-describedby", erro.id);
    campos[nome] = campo;
    erros[nome] = erro;
    grupo.append(label, campo, erro);
    formulario.append(grupo);
  }
  const preencher = criarElemento(
    "button",
    "Preencher cartão fictício",
    "botao botao--secundario",
  );
  preencher.type = "button";
  preencher.addEventListener(
    "click",
    () => {
      const dados = {
        numero: "4111 1111 1111 1111",
        nome: "Cliente Teste",
        validade: "12/30",
        codigo: "123",
      };
      for (const nome of Object.keys(campos)) campos[nome].value = dados[nome];
    },
    { signal: sinal },
  );
  const retorno = criarElemento("p", "", "retorno-formulario");
  retorno.setAttribute("role", "status");
  const confirmar = criarElemento("button", "Confirmar e pagar", "botao");
  confirmar.type = "submit";
  function atualizarTotal() {
    try {
      const b = calcularBeneficio(
        beneficio.value,
        revisao.subtotalCentavos,
        saldo,
        temConta,
      );
      total.textContent = `Desconto: ${formatarPreco(b.desconto)} · Total a pagar: ${formatarPreco(revisao.totalCentavos - b.desconto)}`;
      erroBeneficio.textContent = "";
      beneficio.removeAttribute("aria-invalid");
      return true;
    } catch (erro) {
      total.textContent = `Total sem benefício: ${formatarPreco(revisao.totalCentavos)}`;
      erroBeneficio.textContent = erro.message;
      beneficio.setAttribute("aria-invalid", "true");
      return false;
    }
  }
  beneficio.addEventListener("change", atualizarTotal, { signal: sinal });
  formulario.addEventListener(
    "submit",
    async (evento) => {
      evento.preventDefault();
      if (confirmar.disabled) return;
      if (!atualizarTotal()) {
        beneficio.focus();
        return;
      }
      for (const nome of Object.keys(campos)) {
        erros[nome].textContent = "";
        campos[nome].removeAttribute("aria-invalid");
      }
      confirmar.disabled = true;
      beneficio.disabled = true;
      retorno.textContent = "Processando pagamento de teste…";
      try {
        const cartao = Object.fromEntries(
          Object.entries(campos).map(([nome, campo]) => [nome, campo.value]),
        );
        const resultado = await pagar(beneficio.value, cartao, sinal);
        if (sinal.aborted) return;
        if (resultado.pagamento === "recusado")
          retorno.textContent =
            "Pagamento recusado. Revise o cartão e tente novamente. O pedido não entrou em preparo. Para demonstrar aprovação, altere o cenário em Demonstração.";
        else {
          for (const campo of Object.values(campos)) campo.value = "";
          window.location.hash = "#/acompanhamento";
        }
      } catch (erro) {
        if (sinal.aborted) return;
        retorno.textContent = erro.message;
        for (const [nome, texto] of Object.entries(erro.campos ?? {})) {
          erros[nome].textContent = texto;
          campos[nome].setAttribute("aria-invalid", "true");
        }
        campos[Object.keys(erro.campos ?? {})[0]]?.focus();
      } finally {
        confirmar.disabled = false;
        beneficio.disabled = false;
      }
    },
    { signal: sinal },
  );
  atualizarTotal();
  formulario.append(preencher, total, erroBeneficio, confirmar, retorno);
  return formulario;
}
