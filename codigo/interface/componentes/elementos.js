export function criarElemento(tipo, texto = "", classe = "") {
  const elemento = document.createElement(tipo);
  elemento.textContent = texto;
  if (classe) elemento.className = classe;
  return elemento;
}

export function criarTitulo(texto) {
  const titulo = criarElemento("h1", texto);
  titulo.tabIndex = -1;
  return titulo;
}

export function criarLink(texto, destino, classe = "botao botao--secundario") {
  const link = criarElemento("a", texto, classe);
  link.href = destino;
  return link;
}

export function formatarPreco(centavos) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}
