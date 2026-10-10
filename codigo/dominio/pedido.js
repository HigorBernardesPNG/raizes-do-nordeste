// Valores em centavos evitam diferenças de arredondamento entre a revisão e o pagamento.
export const BENEFICIOS = [
  { id: "pontos100", pontos: 100, desconto: 500, minimo: 2000 },
  { id: "pontos200", pontos: 200, desconto: 1200, minimo: 4000 },
];

export function calcularBeneficio(escolha, subtotal, saldo, temConta) {
  if (!escolha) return { desconto: 0, pontos: 0 };
  if (escolha === "RAIZES5") {
    if (subtotal < 2000)
      throw new Error("RAIZES5 exige pelo menos R$ 20,00 em produtos.");
    return { desconto: 500, pontos: 0 };
  }
  const beneficio = BENEFICIOS.find((item) => item.id === escolha);
  if (!beneficio) throw new Error("Escolha um benefício disponível.");
  if (!temConta) throw new Error("Entre na conta para usar seus pontos.");
  if (subtotal < beneficio.minimo)
    throw new Error(
      `O benefício exige pelo menos R$ ${beneficio.minimo / 100},00 em produtos.`,
    );
  if (saldo < beneficio.pontos)
    throw new Error("Saldo insuficiente para este benefício.");
  return { desconto: beneficio.desconto, pontos: beneficio.pontos };
}

export function validarCartao(cartao) {
  const erros = {};
  // Aceito somente a massa de teste, sem estimular o preenchimento de um cartão real.
  if (String(cartao.numero ?? "").replace(/\s/g, "") !== "4111111111111111")
    erros.numero = "Use o cartão fictício 4111 1111 1111 1111.";
  if (String(cartao.nome ?? "").trim().length < 2)
    erros.nome = "Informe um nome fictício no cartão.";
  if (cartao.validade !== "12/30")
    erros.validade = "Use a validade demonstrativa 12/30.";
  if (cartao.codigo !== "123") erros.codigo = "Use o código demonstrativo 123.";
  if (Object.keys(erros).length) {
    const erro = new Error("Confira os dados do cartão de teste.");
    erro.campos = erros;
    throw erro;
  }
}

export function proximaEtapa(pedido) {
  if (pedido.pagamento !== "aprovado")
    throw new Error("O pagamento ainda não foi aprovado.");
  const etapas =
    pedido.compra.dados.recebimento === "entrega"
      ? ["confirmado", "em preparo", "pronto", "saiu para entrega", "entregue"]
      : ["confirmado", "em preparo", "pronto", "retirado"];
  const atual = etapas.indexOf(pedido.etapa);
  if (atual < 0) throw new Error("Etapa do pedido inválida.");
  return etapas[Math.min(atual + 1, etapas.length - 1)];
}

export function calcularPontos(pedido) {
  return Math.floor(
    (pedido.compra.subtotalCentavos - pedido.compra.descontoCentavos) / 100,
  );
}
