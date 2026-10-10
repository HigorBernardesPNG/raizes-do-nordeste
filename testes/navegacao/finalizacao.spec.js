import { test, expect } from "@playwright/test";
async function abrir(page) {
  await page.goto("/#/produto/cuscuz-recheado");
  await page.getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(
    page.getByText("Sacola atualizada.", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/finalizacao");
  await expect(
    page.getByRole("heading", { name: "Finalizar compra" }),
  ).toBeVisible();
}
async function identificar(page) {
  await page.getByLabel("Nome de quem recebe").fill("Cliente Fictício");
  await page.getByLabel("Telefone com DDD").fill("81999990001");
  await expect(page.locator("#retorno-finalizacao")).toHaveText(
    "Preenchimento salvo neste navegador.",
  );
}
async function entregar(page) {
  await page
    .getByRole("radio", { name: "Entrega · R$ 5,00", exact: true })
    .check();
  await page.getByLabel("Rua ou avenida").fill("Rua Fictícia");
  await page.getByLabel("Número", { exact: true }).fill("100");
  await page.getByLabel("Bairro", { exact: true }).fill("Centro");
  await expect(page.locator("#retorno-finalizacao")).toHaveText(
    "Preenchimento salvo neste navegador.",
  );
}
async function lerRascunho(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const pedido = indexedDB.open("raizes-do-nordeste");
        pedido.onsuccess = () => {
          const banco = pedido.result;
          const consulta = banco
            .transaction("estado")
            .objectStore("estado")
            .get("finalizacao-pessoal");
          consulta.onsuccess = () => {
            resolve(consulta.result);
            banco.close();
          };
        };
      }),
  );
}
const revisar = (page) =>
  page.getByRole("button", { name: "Revisar compra", exact: true }).click();
test("visitante revisa retirada sem conta e recupera preenchimento", async ({
  page,
}) => {
  await abrir(page);
  await identificar(page);
  await page.reload();
  await expect(page.getByLabel("Nome de quem recebe")).toHaveValue(
    "Cliente Fictício",
  );
  await expect(page.getByLabel("Rua ou avenida")).toBeHidden();
  await revisar(page);
  await expect(
    page.getByRole("heading", { name: "Revisão da compra" }),
  ).toBeVisible();
  await expect(
    page.getByText("Total: R$ 20,00", { exact: true }),
  ).toBeVisible();
  expect((await lerRascunho(page)).sessaoId).toBeNull();
});
test("entrega mostra taxa recusa cidade e permite sem número", async ({
  page,
}) => {
  await abrir(page);
  await identificar(page);
  await entregar(page);
  await page.getByLabel("Cidade", { exact: true }).fill("João Pessoa");
  await revisar(page);
  await expect(page.locator("#erro-cidade")).toContainText("somente Recife");
  await expect(page.getByLabel("Nome de quem recebe")).toHaveValue(
    "Cliente Fictício",
  );
  await page.getByLabel("Cidade", { exact: true }).fill("Recife");
  await page.getByLabel("Sem número", { exact: true }).check();
  await revisar(page);
  await expect(
    page.getByText("Total: R$ 25,00", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Entrega: Rua Fictícia, sem número, Centro, Recife/PE", {
      exact: true,
    }),
  ).toBeVisible();
});
test("retirada descarta o endereço anteriormente preenchido", async ({
  page,
}) => {
  await abrir(page);
  await identificar(page);
  await entregar(page);
  await page
    .getByRole("radio", { name: "Retirada na unidade · sem taxa" })
    .check();
  await expect(page.locator("#retorno-finalizacao")).toHaveText(
    "Preenchimento salvo neste navegador.",
  );
  const r = await lerRascunho(page);
  expect(r.dados.logradouro).toBe("");
  expect(r.dados.cidade).toBe("");
  await revisar(page);
  await expect(
    page.getByText("Entrega: R$ 0,00", { exact: true }),
  ).toBeVisible();
});
test("login preserva preenchimento e saída limpa dados da finalização", async ({
  page,
}) => {
  await abrir(page);
  await identificar(page);
  await entregar(page);
  await page.getByRole("link", { name: "Entrar e continuar compra" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("TesteRaizes123!");
  await page.getByRole("button", { name: "Entrar na conta" }).click();
  await expect(page.getByLabel("Rua ou avenida")).toHaveValue("Rua Fictícia");
  expect((await lerRascunho(page)).sessaoId).toBeTruthy();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByLabel("Nome de quem recebe")).toHaveValue("");
  expect(await lerRascunho(page)).toBeUndefined();
  await page.reload();
  await expect(page.getByLabel("Nome de quem recebe")).toHaveValue("");
  await expect(page.getByRole("link", { name: "Sacola (1)" })).toBeVisible();
});
test("visitante perde preenchimento após vinte minutos sem interação", async ({
  page,
}) => {
  await page.clock.install();
  await abrir(page);
  await identificar(page);
  await page.clock.fastForward(19 * 60000 + 100);
  await expect(page.locator("#aviso-inatividade")).toBeVisible();
  await page.clock.fastForward(60000 + 1000);
  await expect(page.getByLabel("Nome de quem recebe")).toHaveValue("");
  expect(await lerRascunho(page)).toBeUndefined();
  await expect(page.getByRole("link", { name: "Sacola (1)" })).toBeVisible();
});
test("troca de cidade exige corrigir endereço sem mudança silenciosa", async ({
  page,
}) => {
  await abrir(page);
  await identificar(page);
  await entregar(page);
  await page.getByRole("link", { name: "Trocar unidade", exact: true }).click();
  await page.getByRole("button", { name: "Escolher Centro" }).click();
  await page.getByRole("button", { name: "Confirmar troca" }).click();
  await page.getByRole("link", { name: "Ir para finalização" }).click();
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue(
    "Recife",
  );
  await revisar(page);
  await expect(page.locator("#erro-cidade")).toContainText("João Pessoa");
});
test("sacola vazia e unidade fechada bloqueiam o avanço", async ({ page }) => {
  await page.goto("/#/finalizacao");
  await expect(page.getByRole("alert")).toContainText("sacola está vazia");
  await abrir(page);
  await page.getByRole("link", { name: "Trocar unidade", exact: true }).click();
  await page.getByRole("button", { name: "Escolher Casa Amarela" }).click();
  await page.getByRole("button", { name: "Confirmar troca" }).click();
  await page.getByRole("link", { name: "Ir para finalização" }).click();
  await expect(page.getByRole("alert")).toContainText("fechada");
  await expect(
    page.getByRole("button", { name: "Revisar compra", exact: true }),
  ).toHaveCount(0);
});
test("revisão consulta alteração da sacola feita em outra aba", async ({
  page,
  context,
}) => {
  await abrir(page);
  await identificar(page);
  const outra = await context.newPage();
  await outra.goto("/#/produto/tapioca-queijo");
  await outra.getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(
    outra.getByText("Sacola atualizada.", { exact: true }),
  ).toBeVisible();
  await page.bringToFront();
  await revisar(page);
  await expect(
    page.getByText("Total: R$ 35,00", { exact: true }),
  ).toBeVisible();
});
test("falha de gravação não apresenta revisão concluída", async ({ page }) => {
  await abrir(page);
  await identificar(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (valor, chave) {
      if (chave === "finalizacao-pessoal")
        throw new DOMException("Falha controlada", "QuotaExceededError");
      return original.call(this, valor, chave);
    };
  });
  await revisar(page);
  await expect(page.locator("#retorno-finalizacao")).toContainText(
    "Não foi possível salvar",
  );
  await expect(
    page.getByRole("heading", { name: "Revisão da compra" }),
  ).toHaveCount(0);
});
test("limpeza exige confirmação e formulário cabe em 320 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await abrir(page);
  await identificar(page);
  await entregar(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Limpar preenchimento", exact: true })
    .click();
  expect((await lerRascunho(page)).dados.nome).toBe("Cliente Fictício");
  await page
    .getByRole("button", { name: "Confirmar limpeza do preenchimento" })
    .click();
  await expect(page.getByLabel("Nome de quem recebe")).toHaveValue("");
  expect(await lerRascunho(page)).toBeUndefined();
});
