import { it, expect } from "vitest";
import {
  calcularBeneficio,
  validarCartao,
  proximaEtapa,
  calcularPontos,
} from "../../codigo/dominio/pedido";
it("promoção respeita mínimo em produtos sem depender de conta", () => {
  expect(calcularBeneficio("RAIZES5", 2000, 0, false).desconto).toBe(500);
  expect(() => calcularBeneficio("RAIZES5", 1999, 0, false)).toThrow("20,00");
});
it("pontos exigem conta saldo e mínimo", () => {
  expect(calcularBeneficio("pontos100", 2000, 100, true)).toEqual({
    desconto: 500,
    pontos: 100,
  });
  expect(calcularBeneficio("pontos200", 4000, 200, true)).toEqual({
    desconto: 1200,
    pontos: 200,
  });
  expect(() => calcularBeneficio("pontos100", 2000, 99, true)).toThrow(
    "Saldo insuficiente",
  );
  expect(() => calcularBeneficio("pontos100", 2000, 100, false)).toThrow(
    "Entre",
  );
  expect(() => calcularBeneficio("pontos200", 3999, 200, true)).toThrow(
    "40,00",
  );
});
it("cartão aceita apenas os dados fictícios e identifica campos inválidos", () => {
  expect(() =>
    validarCartao({
      numero: "4111 1111 1111 1111",
      nome: "Teste",
      validade: "12/30",
      codigo: "123",
    }),
  ).not.toThrow();
  try {
    validarCartao({
      numero: "123",
      nome: "",
      validade: "13/30",
      codigo: "999",
    });
  } catch (erro) {
    expect(Object.keys(erro.campos)).toEqual([
      "numero",
      "nome",
      "validade",
      "codigo",
    ]);
  }
});
it("pedido não pago não avança e conclusão é estável", () => {
  const p = {
    pagamento: "aprovado",
    etapa: "retirado",
    compra: { dados: { recebimento: "retirada" } },
  };
  expect(proximaEtapa(p)).toBe("retirado");
  expect(() => proximaEtapa({ ...p, pagamento: "recusado" })).toThrow(
    "não foi aprovado",
  );
  expect(
    proximaEtapa({
      ...p,
      etapa: "pronto",
      compra: { dados: { recebimento: "entrega" } },
    }),
  ).toBe("saiu para entrega");
});
it("crédito considera produtos após desconto sem frete nem arredondamento para cima", () => {
  expect(
    calcularPontos({
      compra: {
        subtotalCentavos: 2099,
        descontoCentavos: 500,
        taxaCentavos: 500,
      },
    }),
  ).toBe(15);
});
