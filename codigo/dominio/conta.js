export const AVISO_CAMPANHAS = "campanhas-2026-10";
export const AVISO_INATIVIDADE_MS = 19 * 60 * 1000;
export const LIMITE_INATIVIDADE_MS = 20 * 60 * 1000;

export function normalizarEmail(valor) {
  const email = String(valor ?? "")
    .trim()
    .toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }
  return email;
}

export function validarCadastro(dados) {
  const nome = String(dados.nome ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (nome.length < 2 || nome.length > 80)
    throw new Error("Informe um nome entre 2 e 80 caracteres.");
  let telefone = String(dados.telefone ?? "").replace(/\D/g, "");
  if (
    (telefone.length === 12 || telefone.length === 13) &&
    telefone.startsWith("55")
  )
    telefone = telefone.slice(2);
  if (!/^\d{10,11}$/.test(telefone))
    throw new Error("Informe um telefone com DDD e 10 ou 11 dígitos.");
  const email = normalizarEmail(dados.email);
  if (
    typeof dados.senha !== "string" ||
    dados.senha.length < 8 ||
    dados.senha.length > 128
  ) {
    throw new Error("A senha de demonstração deve ter de 8 a 128 caracteres.");
  }
  if (dados.senha !== dados.confirmacao)
    throw new Error("As senhas não coincidem.");
  // A senha não entra no objeto de perfil. Ela segue apenas para a derivação da credencial.
  return { nome, telefone, email, campanhas: dados.campanhas === true };
}

export function avaliarSessao(sessao, agora) {
  if (!sessao) return "visitante";
  if (
    !Number.isFinite(sessao.ultimaAtividade) ||
    !Number.isFinite(sessao.criadaEm) ||
    typeof sessao.id !== "string" ||
    typeof sessao.usuarioId !== "string" ||
    agora < sessao.ultimaAtividade ||
    agora - sessao.ultimaAtividade >= LIMITE_INATIVIDADE_MS
  )
    return "expirada";
  if (agora - sessao.ultimaAtividade >= AVISO_INATIVIDADE_MS) return "aviso";
  return "ativa";
}

export function criarSessao(usuarioId, agora) {
  return {
    id: crypto.randomUUID(),
    usuarioId,
    criadaEm: agora,
    ultimaAtividade: agora,
  };
}

export function registrarPreferencia(permitidas, agora) {
  return {
    permitidas: permitidas === true,
    registradoEm: new Date(agora).toISOString(),
    versaoAviso: AVISO_CAMPANHAS,
  };
}

export function obterPerfil(usuario) {
  if (!usuario) return null;
  // A interface recebe somente o perfil. Sal e verificador não precisam circular pelas telas.
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
    campanhas: structuredClone(usuario.campanhas),
  };
}
