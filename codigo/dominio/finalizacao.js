export const TAXA_ENTREGA_CENTAVOS = 500;
export const PRAZO_RASCUNHO_MS = 20 * 60 * 1000;

export function criarDadosFinalizacao(unidade) {
  return {
    nome: "",
    telefone: "",
    recebimento: "retirada",
    logradouro: "",
    numero: "",
    semNumero: false,
    bairro: "",
    complemento: "",
    cidade: unidade.cidade,
    uf: unidade.uf,
  };
}

export function limitarRascunho(entrada) {
  const limites = {
    nome: 80,
    telefone: 20,
    logradouro: 120,
    numero: 20,
    bairro: 80,
    complemento: 120,
    cidade: 80,
    uf: 2,
  };
  const dados = {
    recebimento: entrada.recebimento === "entrega" ? "entrega" : "retirada",
    semNumero: entrada.semNumero === true,
  };
  for (const [campo, limite] of Object.entries(limites))
    dados[campo] = String(entrada[campo] ?? "").slice(0, limite);
  // Retirada não precisa guardar um endereço que deixou de ser usado.
  if (dados.recebimento === "retirada") {
    for (const campo of [
      "logradouro",
      "numero",
      "bairro",
      "complemento",
      "cidade",
      "uf",
    ])
      dados[campo] = "";
    dados.semNumero = false;
  }
  if (dados.semNumero) dados.numero = "";
  return dados;
}

function normalizarCidade(valor) {
  return valor
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function validarIdentificacao(entrada, unidade) {
  const dados = limitarRascunho(entrada);
  for (const campo of Object.keys(dados))
    if (typeof dados[campo] === "string") dados[campo] = dados[campo].trim();
  const erros = {};
  if (dados.nome.length < 2)
    erros.nome = "Informe o nome de quem receberá o pedido.";
  dados.telefone = dados.telefone.replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(dados.telefone))
    dados.telefone = dados.telefone.slice(2);
  if (!/^\d{10,11}$/.test(dados.telefone))
    erros.telefone = "Informe telefone com DDD e 10 ou 11 dígitos.";
  if (!["retirada", "entrega"].includes(entrada.recebimento))
    erros.recebimento = "Escolha retirada ou entrega.";
  if (dados.recebimento === "entrega") {
    if (dados.logradouro.length < 2)
      erros.logradouro = "Informe a rua ou avenida.";
    if (!dados.semNumero && !dados.numero)
      erros.numero = "Informe o número ou marque Sem número.";
    if (dados.bairro.length < 2) erros.bairro = "Informe o bairro.";
    if (normalizarCidade(dados.cidade) !== normalizarCidade(unidade.cidade))
      erros.cidade = `A entrega desta unidade atende somente ${unidade.cidade}. Corrija a cidade ou troque de unidade.`;
    if (dados.uf.toUpperCase() !== unidade.uf)
      erros.uf = `Informe a UF ${unidade.uf} ou troque de unidade.`;
    dados.uf = dados.uf.toUpperCase();
  }
  return { dados, erros };
}

export function revisarCompra(resumo, entrada) {
  if (!resumo.itens.length)
    throw new Error(
      "A sacola está vazia. Escolha um produto antes de revisar.",
    );
  if (!resumo.unidade.aberta)
    throw new Error(
      "Esta unidade está fechada. Escolha uma unidade aberta antes de continuar.",
    );
  const acumulado = new Map();
  for (const item of resumo.itens) {
    const quantidade = (acumulado.get(item.produto.id) ?? 0) + item.quantidade;
    if (!item.produto.disponivel || quantidade > item.produto.estoque)
      throw new Error(
        `Confira ${item.produto.nome}: a quantidade não está disponível. Volte à sacola para corrigir.`,
      );
    acumulado.set(item.produto.id, quantidade);
  }
  const { dados, erros } = validarIdentificacao(entrada, resumo.unidade);
  if (Object.keys(erros).length) {
    const erro = new Error("Confira os campos indicados antes de continuar.");
    erro.campos = erros;
    throw erro;
  }
  const taxaCentavos =
    dados.recebimento === "entrega" ? TAXA_ENTREGA_CENTAVOS : 0;
  return {
    dados,
    unidade: resumo.unidade,
    itens: resumo.itens,
    subtotalCentavos: resumo.subtotalCentavos,
    descontoCentavos: 0,
    taxaCentavos,
    totalCentavos: resumo.subtotalCentavos + taxaCentavos,
  };
}

export function rascunhoVenceu(registro, agora) {
  return (
    !Number.isFinite(registro.ultimaAtividade) ||
    agora < registro.ultimaAtividade ||
    agora - registro.ultimaAtividade >= PRAZO_RASCUNHO_MS
  );
}
