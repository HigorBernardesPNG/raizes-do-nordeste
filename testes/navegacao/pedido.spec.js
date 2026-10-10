import { test, expect } from "@playwright/test";
async function ler(page, chave) {
  return page.evaluate(
    (chave) =>
      new Promise((resolve) => {
        const abertura = indexedDB.open("raizes-do-nordeste");
        abertura.onsuccess = () => {
          const banco = abertura.result;
          const r = banco
            .transaction("estado")
            .objectStore("estado")
            .get(chave);
          r.onsuccess = () => {
            resolve(r.result);
            banco.close();
          };
        };
      }),
    chave,
  );
}
async function alterar(page, chave, valor) {
  await page.evaluate(
    ({ chave, valor }) =>
      new Promise((resolve) => {
        const abertura = indexedDB.open("raizes-do-nordeste");
        abertura.onsuccess = () => {
          const banco = abertura.result;
          const t = banco.transaction("estado", "readwrite");
          t.objectStore("estado").put(valor, chave);
          t.oncomplete = () => {
            banco.close();
            resolve();
          };
        };
      }),
    { chave, valor },
  );
}
async function entrar(page) {
  await page.goto("/#/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("TesteRaizes123!");
  await page
    .getByRole("button", { name: "Entrar na conta", exact: true })
    .click();
  await expect(page.locator("#sair-conta")).toBeVisible();
}
async function revisar(page) {
  await page.goto("/#/produto/cuscuz-recheado");
  await page.getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(
    page.getByText("Sacola atualizada.", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/finalizacao");
  await page.getByLabel("Nome de quem recebe").fill("Cliente Fictício");
  await page.getByLabel("Telefone com DDD").fill("81999990001");
  await page
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisão da compra" }),
  ).toBeVisible();
}
async function pagar(page) {
  await page.getByRole("button", { name: "Preencher cartão fictício" }).click();
  await page.getByRole("button", { name: "Confirmar e pagar" }).click();
}
async function avancar(page, etapa) {
  await page.goto("/#/demonstracao");
  await page.getByRole("button", { name: "Avançar etapa do pedido" }).click();
  await expect(
    page.getByRole("heading", { name: `Pedido atual: ${etapa}`, exact: true }),
  ).toBeVisible();
}
test("compra aprovada permanece após recarga sem armazenar cartão e limpa a sacola", async ({
  page,
}) => {
  await revisar(page);
  await page.getByRole("button", { name: "Confirmar e pagar" }).click();
  await expect(
    page.getByText("Use o cartão fictício 4111 1111 1111 1111.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(await ler(page, "pedidos-e-fidelidade")).toBeUndefined();
  await pagar(page);
  await expect(
    page.getByRole("heading", { name: "Status: confirmado" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Status: confirmado" }),
  ).toBeVisible();
  const dados = await ler(page, "pedidos-e-fidelidade");
  expect(dados.pedidos).toHaveLength(1);
  expect(JSON.stringify(dados)).not.toContain("411111");
  expect(JSON.stringify(dados)).not.toContain('"codigo"');
  expect((await ler(page, "sacola-pessoal")).itens).toHaveLength(0);
  await avancar(page, "em preparo");
  await avancar(page, "pronto");
  await avancar(page, "retirado");
});
test("recusa não libera preparo e aprovação posterior reutiliza o pedido", async ({
  page,
}) => {
  await page.goto("/#/demonstracao");
  await page
    .getByLabel("Resultado do próximo pagamento")
    .selectOption("recusado");
  await page.getByRole("button", { name: "Salvar configuração" }).click();
  await expect(
    page.getByText("Configuração salva.", { exact: true }),
  ).toBeVisible();
  await revisar(page);
  await pagar(page);
  await expect(
    page.getByText(/Pagamento recusado. Revise o cartão/),
  ).toBeVisible();
  const id = (await ler(page, "pedidos-e-fidelidade")).pedidos[0].id;
  await page.goto("/#/demonstracao");
  await page.getByRole("button", { name: "Avançar etapa do pedido" }).click();
  await expect(
    page.getByText("O pagamento ainda não foi aprovado.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Resultado do próximo pagamento")
    .selectOption("aprovado");
  await page.getByRole("button", { name: "Salvar configuração" }).click();
  await expect(
    page.getByText("Configuração salva.", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/finalizacao");
  await page
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await pagar(page);
  await expect(
    page.getByRole("heading", { name: "Status: confirmado" }),
  ).toBeVisible();
  const dados = await ler(page, "pedidos-e-fidelidade");
  expect(dados.pedidos).toHaveLength(1);
  expect(dados.pedidos[0].id).toBe(id);
  expect(dados.pedidos[0].tentativas).toBe(2);
});
test("pontos são debitados na aprovação e creditados somente na conclusão uma vez", async ({
  page,
}) => {
  await entrar(page);
  await alterar(page, "pedidos-e-fidelidade", {
    versao: 1,
    pedidos: [],
    saldos: { "usuario-ana-demonstracao": 100 },
  });
  await revisar(page);
  await page.getByLabel("Desconto da compra").selectOption("pontos100");
  await expect(page.getByText(/Total a pagar: R\$\s15,00/)).toBeVisible();
  await pagar(page);
  await expect(
    page.getByRole("heading", { name: "Status: confirmado" }),
  ).toBeVisible();
  expect(
    (await ler(page, "pedidos-e-fidelidade")).saldos[
      "usuario-ana-demonstracao"
    ],
  ).toBe(0);
  await avancar(page, "em preparo");
  await avancar(page, "pronto");
  expect(
    (await ler(page, "pedidos-e-fidelidade")).saldos[
      "usuario-ana-demonstracao"
    ],
  ).toBe(0);
  await avancar(page, "retirado");
  await page.reload();
  expect(
    (await ler(page, "pedidos-e-fidelidade")).saldos[
      "usuario-ana-demonstracao"
    ],
  ).toBe(15);
  await expect(
    page.getByRole("button", { name: "Avançar etapa do pedido" }),
  ).toHaveCount(0);
  await page.goto("/#/fidelidade");
  await expect(
    page.getByRole("heading", { name: "Seu saldo: 15 pontos" }),
  ).toBeVisible();
});
test("promoção funciona para visitante e pontos sem conta são recusados", async ({
  page,
}) => {
  await revisar(page);
  await page.getByLabel("Desconto da compra").selectOption("pontos100");
  await expect(
    page.getByText("Entre na conta para usar seus pontos.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Desconto da compra").selectOption("RAIZES5");
  await pagar(page);
  await expect(
    page.getByRole("heading", { name: "Status: confirmado" }),
  ).toBeVisible();
  expect(
    (await ler(page, "pedidos-e-fidelidade")).pedidos[0].compra.totalCentavos,
  ).toBe(1500);
});
test("confirma uma única compra e invalida revisão de outra aba", async ({
  page,
  context,
}) => {
  await revisar(page);
  const outra = await context.newPage();
  await outra.goto("/#/finalizacao");
  await outra
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await outra
    .getByRole("button", { name: "Preencher cartão fictício" })
    .click();
  // Dois envios imediatos exercitam o bloqueio antes de o provedor responder.
  await outra.locator("form.pagamento").evaluate((form) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(
    outra.getByRole("heading", { name: "Status: confirmado" }),
  ).toBeVisible();
  await page.bringToFront();
  await expect(
    page.getByRole("button", { name: "Confirmar e pagar" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/A sacola está vazia/)).toBeVisible();
  const dados = await ler(page, "pedidos-e-fidelidade");
  expect(dados.pedidos).toHaveLength(1);
  expect(dados.pedidos[0].tentativas).toBe(1);
});
test("falha ao salvar pagamento preserva a sacola e não anuncia aprovação", async ({
  page,
}) => {
  await revisar(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (valor, chave) {
      if (chave === "pedidos-e-fidelidade")
        throw new DOMException("Falha simulada", "QuotaExceededError");
      return original.call(this, valor, chave);
    };
  });
  await pagar(page);
  await expect(
    page.getByText(/Não foi possível salvar o pedido/),
  ).toBeVisible();
  expect(await ler(page, "pedidos-e-fidelidade")).toBeUndefined();
  expect((await ler(page, "sacola-pessoal")).itens).toHaveLength(1);
  await expect(
    page.getByRole("heading", { name: "Status: confirmado" }),
  ).toHaveCount(0);
});
test("totem fixa retirada e encerra os dados do atendimento anterior", async ({
  page,
}) => {
  await page.goto("/#/demonstracao");
  await page.getByLabel("Modo totem:", { exact: false }).check();
  await page.getByRole("button", { name: "Salvar configuração" }).click();
  await expect(page.locator("#encerrar-totem")).toBeVisible();
  await revisar(page);
  await expect(
    page.getByRole("radio", { name: "Entrega · R$ 5,00", exact: true }),
  ).toHaveCount(0);
  await pagar(page);
  await expect(
    page.getByRole("heading", { name: "Status: confirmado" }),
  ).toBeVisible();
  await page.locator("#encerrar-totem").click();
  await expect(
    page.getByRole("heading", { name: "Cardápio", exact: true }),
  ).toBeVisible();
  await page.goto("/#/acompanhamento");
  await expect(page.getByText(/Nenhum pedido disponível/)).toBeVisible();
  expect(await ler(page, "finalizacao-pessoal")).toBeUndefined();
  expect(await ler(page, "sessao-pessoal")).toBeUndefined();
});
test("pagamento cabe em 320, 390, 768 e 1440 px e mantém foco visível", async ({
  page,
}) => {
  await revisar(page);
  for (const largura of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width: largura, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByLabel("Número do cartão de teste").focus();
    await expect(page.getByLabel("Número do cartão de teste")).toBeFocused();
  }
});
test("entrega conclui etapas e exclui a taxa do crédito de pontos", async ({
  page,
}) => {
  await entrar(page);
  await revisar(page);
  await page.getByRole("button", { name: "Editar preenchimento" }).click();
  await page
    .getByRole("radio", { name: "Entrega · R$ 5,00", exact: true })
    .check();
  await page.getByLabel("Rua ou avenida").fill("Rua de Teste");
  await page.getByLabel("Número", { exact: true }).fill("123");
  await page.getByLabel("Bairro", { exact: true }).fill("Centro");
  await page
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await page.getByLabel("Desconto da compra").selectOption("RAIZES5");
  await pagar(page);
  await expect(
    page.getByRole("heading", { name: "Status: confirmado" }),
  ).toBeVisible();
  await expect(page.getByText(/45 minutos/)).toBeVisible();
  await avancar(page, "em preparo");
  await avancar(page, "pronto");
  await avancar(page, "saiu para entrega");
  await avancar(page, "entregue");
  const dados = await ler(page, "pedidos-e-fidelidade");
  expect(dados.pedidos[0].compra.totalCentavos).toBe(2000);
  expect(dados.saldos["usuario-ana-demonstracao"]).toBe(15);
});
test("campanha aparece apenas após consentimento e desaparece após revogação", async ({
  page,
}) => {
  await entrar(page);
  await page.goto("/#/fidelidade");
  await expect(page.getByText(/Campanha para participantes/)).toHaveCount(0);
  await page.goto("/#/conta");
  await page.locator("#preferencia-campanhas").check();
  await page.getByRole("button", { name: "Salvar preferência" }).click();
  await expect(
    page.getByText("Preferência salva.", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/fidelidade");
  await expect(page.getByText(/Campanha para participantes/)).toBeVisible();
  await page.goto("/#/conta");
  await page.locator("#preferencia-campanhas").uncheck();
  await page.getByRole("button", { name: "Salvar preferência" }).click();
  await expect(
    page.getByText("Preferência salva.", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/fidelidade");
  await expect(page.getByText(/Campanha para participantes/)).toHaveCount(0);
});
