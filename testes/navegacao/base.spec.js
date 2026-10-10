import { test, expect } from "@playwright/test";

test("filtra o catálogo e retoma a navegação pelo histórico", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Cardápio" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Tapiocas", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Ver detalhes de Tapioca de queijo" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Tapioca de queijo" }),
  ).toBeFocused();
  await page.reload();
  await expect(page).toHaveTitle("Tapioca de queijo | Raízes do Nordeste");
  await page.goBack();
  await expect(
    page.getByRole("heading", { level: 1, name: "Cardápio" }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("heading", { level: 1, name: "Tapioca de queijo" }),
  ).toBeVisible();
});

test("recupera endereço inválido sem inserir seu conteúdo no HTML", async ({
  page,
}) => {
  await page.goto("/#/produto/%3Cscript%3E");
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao cardápio" }).click();
  await expect(page.locator("article")).toHaveCount(3);
});

test("abre privacidade por teclado e não produz rolagem horizontal", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cardápio", exact: true })).toBeVisible();
  const link = page.getByRole("link", { name: "Privacidade e dados" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "Privacidade e dados" }),
  ).toBeFocused();
  for (const largura of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto("/#/cardapio");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
