import dadosIniciais from "../../dados/iniciais/catalogo.json";

export function consultarCatalogoInicial() {
  // Cada leitura recebe uma cópia para preservar a massa inicial.
  return structuredClone(dadosIniciais);
}
