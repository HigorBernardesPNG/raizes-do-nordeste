import { test, expect } from "@playwright/test";

async function entrar(
  page,
  email = "ana@example.test",
  senha = "TesteRaizes123!",
) {
  await page.goto("/#/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar na conta" }).click();
  await expect(
    page.getByRole("button", { name: "Sair", exact: true }),
  ).toBeVisible();
}
async function preencherCadastro(page, email = "nova@example.test") {
  await page.getByLabel("Nome", { exact: true }).fill("Cliente de Teste");
  await page.getByLabel("Telefone com DDD").fill("(81) 99999-0001");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("TesteRaizes123!");
  await page
    .getByLabel("Confirmar senha", { exact: true })
    .fill("TesteRaizes123!");
}
async function consultarBanco(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const abertura = indexedDB.open("raizes-do-nordeste");
        abertura.onerror = reject;
        abertura.onsuccess = () => {
          const banco = abertura.result;
          const transacao = banco.transaction(
            ["usuarios", "estado"],
            "readonly",
          );
          const usuarios = transacao.objectStore("usuarios").getAll();
          const sessao = transacao.objectStore("estado").get("sessao-pessoal");
          transacao.oncomplete = () => {
            resolve({ usuarios: usuarios.result, sessao: sessao.result });
            banco.close();
          };
        };
      }),
  );
}

test("cadastra, recupera sessão e grava somente o verificador da senha", async ({
  page,
}) => {
  await page.goto("/#/cadastro");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await preencherCadastro(page, "NOVA@EXAMPLE.TEST");
  await page.getByRole("button", { name: "Criar conta e entrar" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Minha conta" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("E-mail: nova@example.test", { exact: true }),
  ).toBeVisible();
  const banco = await consultarBanco(page);
  const usuario = banco.usuarios.find(
    (usuario) => usuario.email === "nova@example.test",
  );
  expect(usuario.campanhas.permitidas).toBe(false);
  expect(usuario.credencial.iteracoes).toBe(600000);
  expect(JSON.stringify(banco)).not.toContain("TesteRaizes123!");
});

test("recusa e-mail duplicado e confirmação divergente", async ({ page }) => {
  await page.goto("/#/cadastro");
  await preencherCadastro(page, "ANA@EXAMPLE.TEST");
  await page
    .getByLabel("Confirmar senha", { exact: true })
    .fill("OutraSenha123!");
  await page.getByRole("button", { name: "Criar conta e entrar" }).click();
  await expect(
    page.getByText("As senhas não coincidem.", { exact: true }),
  ).toBeVisible();
  await preencherCadastro(page, "ANA@EXAMPLE.TEST");
  await page.getByRole("button", { name: "Criar conta e entrar" }).click();
  await expect(
    page.getByText("Este e-mail já está cadastrado.", { exact: true }),
  ).toBeVisible();
  expect((await consultarBanco(page)).usuarios).toHaveLength(1);
});

test("recusa senha incorreta e permite mostrar e ocultar o campo", async ({
  page,
}) => {
  await page.goto("/#/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("SenhaErrada123!");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await page.getByRole("button", { name: "Entrar na conta" }).click();
  await expect(
    page.getByText("E-mail ou senha inválidos.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
  expect((await consultarBanco(page)).sessao).toBeUndefined();
});

test("entrada retorna à sacola e saída mantém seus itens", async ({ page }) => {
  await page.goto("/#/produto/cuscuz-recheado");
  await page.getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(
    page.getByText("Sacola atualizada.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver sacola", exact: true }).click();
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("TesteRaizes123!");
  await page.getByRole("button", { name: "Entrar na conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Minha sacola" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Entrar", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Sacola (1)" })).toBeVisible();
  expect((await consultarBanco(page)).sessao).toBeUndefined();
});

test("salva e revoga campanhas sem exigir nova conta", async ({ page }) => {
  await entrar(page);
  await page.goto("/#/conta");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Salvar preferência" }).click();
  await expect(
    page.getByText("Preferência salva.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "Salvar preferência" }).click();
  await expect(
    page.getByText("Preferência salva.", { exact: true }),
  ).toBeVisible();
  const usuario = (await consultarBanco(page)).usuarios[0];
  expect(usuario.campanhas.permitidas).toBe(false);
  expect(usuario.campanhas.versaoAviso).toBe("campanhas-2026-10");
});

test("avisa aos 19 minutos e encerra aos 20 sem interação", async ({
  page,
}) => {
  await page.clock.install();
  await entrar(page);
  await page.clock.fastForward(19 * 60000 + 100);
  await expect(page.locator("#aviso-inatividade")).toBeVisible();
  await page.clock.fastForward(60000);
  await expect(
    page.getByRole("heading", { level: 1, name: "Entrar", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Ana de Teste", { exact: true })).toHaveCount(0);
  expect((await consultarBanco(page)).sessao).toBeUndefined();
});

test("continuar sessão renova o prazo e consultas automáticas não renovam", async ({
  page,
}) => {
  await page.clock.install();
  await entrar(page);
  await page.clock.fastForward(19 * 60000 + 100);
  await page.getByRole("button", { name: "Continuar sessão" }).click();
  await expect(page.locator("#aviso-inatividade")).toBeHidden();
  await page.clock.fastForward(61000);
  await expect(
    page.getByRole("button", { name: "Sair", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(20 * 60000);
  await expect(
    page.getByRole("heading", { level: 1, name: "Entrar", exact: true }),
  ).toBeVisible();
});

test("retorno à aba confere expiração antes de exibir o perfil", async ({
  page,
}) => {
  await page.clock.install();
  await entrar(page);
  await page.clock.setSystemTime(new Date(Date.now() + 25 * 60000));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", { name: "Entrar", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Ana de Teste", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sair", exact: true }),
  ).toBeHidden();
});

test("saída em outra aba remove o perfil da aba anterior", async ({
  page,
  context,
}) => {
  await entrar(page);
  const outra = await context.newPage();
  await outra.goto("/#/conta");
  await expect(outra.getByText("Ana de Teste", { exact: true })).toBeVisible();
  await outra.getByRole("button", { name: "Sair", exact: true }).click();
  await page.bringToFront();
  await expect(page.getByText("Ana de Teste", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Entrar", exact: true }),
  ).toBeVisible();
});

test("falha no cadastro não deixa usuário ou sessão parciais", async ({
  page,
}) => {
  await page.goto("/#/cadastro");
  await preencherCadastro(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (valor, chave) {
      if (chave === "sessao-pessoal")
        throw new DOMException("Falha controlada", "QuotaExceededError");
      return original.call(this, valor, chave);
    };
  });
  await page.getByRole("button", { name: "Criar conta e entrar" }).click();
  await expect(
    page.getByText("Não foi possível concluir a operação", { exact: false }),
  ).toBeVisible();
  const banco = await consultarBanco(page);
  expect(banco.usuarios).toHaveLength(1);
  expect(banco.sessao).toBeUndefined();
});

test("migra banco antigo preservando a sacola", async ({ page }) => {
  await page.route("**/", (rota) =>
    rota.fulfill({
      contentType: "text/html",
      body: "<html><body>Preparação da base anterior</body></html>",
    }),
  );
  await page.goto("/");
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const pedido = indexedDB.open("raizes-do-nordeste", 1);
        pedido.onupgradeneeded = () =>
          pedido.result.createObjectStore("estado");
        pedido.onsuccess = () => {
          const banco = pedido.result;
          const transacao = banco.transaction("estado", "readwrite");
          transacao.objectStore("estado").put(
            {
              versao: 1,
              revisao: 1,
              unidadeId: "recife-boa-vista",
              itens: [
                {
                  id: "item-anterior",
                  produtoId: "cuscuz-recheado",
                  quantidade: 2,
                  observacao: "",
                },
              ],
            },
            "sacola-pessoal",
          );
          transacao.oncomplete = () => {
            banco.close();
            resolve();
          };
          transacao.onabort = reject;
        };
      }),
  );
  await page.unroute("**/");
  await page.goto("/?migracao=1#/sacola");
  await expect(page.getByText("Subtotal dos produtos: R$ 40,00")).toBeVisible();
  expect((await consultarBanco(page)).usuarios).toHaveLength(1);
});

test("cadastro e conta cabem em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/#/cadastro");
  await expect(
    page.getByRole("heading", { name: "Criar conta", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await entrar(page);
  await page.goto("/#/conta");
  await expect(
    page.getByRole("heading", { name: "Minha conta", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
