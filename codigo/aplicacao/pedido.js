import { validarCartao } from "../dominio/pedido";
import { solicitarPagamento } from "../servicos/simulados/pagamento";

export function criarControlePedido(repositorio) {
  let estado = {
    saldo: 0,
    pedido: null,
    cenario: "aprovado",
    totem: false,
    erro: "",
  };
  let pagando = false;
  return {
    consultar: () => structuredClone(estado),
    async sincronizar() {
      try {
        estado = { ...(await repositorio.executar("consultar")), erro: "" };
      } catch (erro) {
        estado = {
          saldo: 0,
          pedido: null,
          totem: estado.totem,
          erro: erro.message,
        };
      }
    },
    renovar: () => repositorio.executar("renovar").catch(() => {}),
    configurar: (dados) => repositorio.executar("configurar", dados),
    encerrar: () => repositorio.executar("encerrar"),
    avancar: (pedido) =>
      repositorio.executar("avancar", { id: pedido.id, etapa: pedido.etapa }),
    async pagar(entrada, cartao, sinal) {
      if (pagando) throw new Error("Aguarde o resultado da tentativa atual.");
      validarCartao(cartao);
      pagando = true;
      try {
        const resultado = await solicitarPagamento(estado.cenario, sinal);
        // O cartão só participa da validação em memória; não chega ao repositório.
        return await repositorio.executar("pagar", { ...entrada, resultado });
      } finally {
        pagando = false;
      }
    },
  };
}
