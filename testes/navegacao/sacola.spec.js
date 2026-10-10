import { test, expect } from "@playwright/test";

async function adicionar(
  page,
  produto = "cuscuz-recheado",
  quantidade = "1",
  observacao = "",
) {
  await page.goto(`/#/produto/${produto}`);
  await page.getByLabel("Quantidade", { exact: true }).fill(quantidade);
  await page.getByLabel("Observação do preparo (opcional)").fill(observacao);
  await page.getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(
    page.getByText("Sacola atualizada.", { exact: true }),
  ).toBeVisible();
}

test("mantém itens e observações após recarga, edita e remove", async ({
  page,
}) => {
  await adicionar(page, "cuscuz-recheado", "2", "Sem manteiga");
  await page.getByRole("link", { name: "Ver sacola", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Quantidade", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Observação do preparo (opcional)")).toHaveValue(
    "Sem manteiga",
  );
  await expect(page.getByText("Subtotal dos produtos: R$ 40,00")).toBeVisible();
  await page.getByLabel("Quantidade", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Salvar item" }).click();
  await expect(page.getByText("Subtotal dos produtos: R$ 60,00")).toBeVisible();
  await page.getByRole("button", { name: "Remover Cuscuz recheado" }).click();
  await expect(
    page.getByText("Sua sacola está vazia.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Sacola (0)" })).toBeVisible();
});

test("cancela e confirma a troca com diferenças visíveis", async ({ page }) => {
  await adicionar(page, "cuscuz-recheado", "3");
  await adicionar(page, "tapioca-queijo");
  await page.goto("/#/unidades");
  await page.getByRole("button", { name: "Escolher Casa Amarela" }).click();
  await expect(page.getByText("Quantidade: 3 → 2")).toBeVisible();
  await expect(
    page.getByText("Este item será removido por indisponibilidade."),
  ).toBeVisible();
  await expect(
    page.getByText("Receita na nova unidade:", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manter unidade atual" }).click();
  await page.goto("/#/sacola");
  await expect(page.getByText("Subtotal dos produtos: R$ 75,00")).toBeVisible();
  await page.getByRole("link", { name: "Trocar unidade" }).click();
  await page.getByRole("button", { name: "Escolher Casa Amarela" }).click();
  await page.getByRole("button", { name: "Confirmar troca" }).click();
  await expect(page.getByText("Subtotal dos produtos: R$ 44,00")).toBeVisible();
  await page.reload();
  await expect(
    page.locator("main").getByText("Casa Amarela · Recife/PE"),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(1);
  await page.goto("/#/cardapio");
  await expect(
    page.getByText("Esta unidade está fechada.", { exact: false }),
  ).toBeVisible();
});

test("recusa estoque excedido sem inserir observações como HTML", async ({
  page,
}) => {
  await adicionar(page, "cuscuz-recheado", "3", "<img src=x onerror=alert(1)>");
  await page.getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(
    page.getByText("Quantidade indisponível.", { exact: false }),
  ).toBeVisible();
  await page.goto("/#/sacola");
  await expect(page.locator("main img")).toHaveCount(0);
  await expect(page.getByLabel("Observação do preparo (opcional)")).toHaveValue(
    "<img src=x onerror=alert(1)>",
  );
  await expect(page.getByRole("link", { name: "Sacola (3)" })).toBeVisible();
});

test("mantém o cardápio em caso de armazenamento indisponível", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", { value: undefined }),
  );
  await page.goto("/#/produto/cuscuz-recheado");
  await expect(page.locator("#aviso-armazenamento")).toContainText(
    "armazenamento local não está disponível",
  );
  await expect(
    page.getByRole("button", { name: "Adicionar à sacola" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Voltar ao cardápio" }).click();
  await expect(page.locator("article")).toHaveCount(3);
});

test("falha de gravação preserva a última sacola confirmada", async ({
  page,
}) => {
  await adicionar(page);
  // A falha é injetada pelo teste. Não há um erro aleatório escondido no fluxo do cliente.
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Falha de teste", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(
    page.getByText("Não foi possível salvar a alteração.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sacola (1)" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Sacola (1)" })).toBeVisible();
});

test("limpa dados apenas após confirmação e mantém a limpeza na recarga", async ({
  page,
}) => {
  await adicionar(page);
  await page.goto("/#/privacidade");
  await page
    .getByRole("button", { name: "Limpar sacola e unidade salvas" })
    .click();
  await page.getByRole("button", { name: "Manter dados" }).click();
  await expect(page.getByRole("link", { name: "Sacola (1)" })).toBeVisible();
  await page
    .getByRole("button", { name: "Limpar sacola e unidade salvas" })
    .click();
  await page.getByRole("button", { name: "Confirmar limpeza" }).click();
  await expect(page.getByRole("link", { name: "Sacola (0)" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Sacola (0)" })).toBeVisible();
});

test("telas de sacola e revisão cabem em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await adicionar(page, "cuscuz-recheado", "1", "a".repeat(200));
  for (const rota of ["sacola", "unidades"]) {
    await page.goto(`/#/${rota}`);
    if (rota === "unidades")
      await page.getByRole("button", { name: "Escolher Casa Amarela" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("recusa confirmação antiga quando outra aba altera a sacola", async ({
  page,
  context,
}) => {
  await adicionar(page);
  await page.goto("/#/unidades");
  await page.getByRole("button", { name: "Escolher Casa Amarela" }).click();
  const outraAba = await context.newPage();
  await adicionar(outraAba, "tapioca-queijo");
  // Confirmo a prévia antiga sem acionar o foco que atualizaria a tela antes do clique.
  await page
    .getByRole("button", { name: "Confirmar troca" })
    .evaluate((botao) => botao.click());
  await expect(
    page.getByText("A sacola mudou em outra aba.", { exact: false }),
  ).toBeVisible();
  await page.goto("/#/sacola");
  await expect(page.getByText("Boa Vista · Recife/PE")).toBeVisible();
  await expect(page.getByText("Subtotal dos produtos: R$ 35,00")).toBeVisible();
  await outraAba.close();
});

test("não substitui um registro local com formato desconhecido", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Cardápio" }),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const pedido = indexedDB.open("raizes-do-nordeste");
        pedido.onsuccess = () => {
          const banco = pedido.result;
          const transacao = banco.transaction("estado", "readwrite");
          transacao
            .objectStore("estado")
            .put({ versao: 99, marcador: "preservar" }, "sacola-pessoal");
          transacao.oncomplete = () => {
            banco.close();
            resolve();
          };
          transacao.onabort = reject;
        };
        pedido.onerror = reject;
      }),
  );
  await page.reload();
  await expect(page.locator("#aviso-armazenamento")).toContainText(
    "Os dados não foram substituídos",
  );
  const salvo = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const pedido = indexedDB.open("raizes-do-nordeste");
        pedido.onsuccess = () => {
          const banco = pedido.result;
          const transacao = banco.transaction("estado", "readonly");
          const leitura = transacao.objectStore("estado").get("sacola-pessoal");
          leitura.onsuccess = () => resolve(leitura.result);
          transacao.oncomplete = () => banco.close();
        };
      }),
  );
  expect(salvo).toEqual({ versao: 99, marcador: "preservar" });
});
