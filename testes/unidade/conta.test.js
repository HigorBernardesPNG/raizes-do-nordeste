import { describe, it, expect } from "vitest";
import {
  validarCadastro,
  normalizarEmail,
  avaliarSessao,
  registrarPreferencia,
} from "../../codigo/dominio/conta";
import {
  criarCredencial,
  conferirCredencial,
} from "../../codigo/servicos/simulados/credencial";
const dados = {
  nome: " Cliente de Teste ",
  telefone: "+55 (81) 99999-0001",
  email: " NOVA@EXAMPLE.TEST ",
  senha: "TesteRaizes123!",
  confirmacao: "TesteRaizes123!",
  campanhas: false,
};

describe("conta demonstrativa", () => {
  it("normaliza o perfil e não devolve a senha", () => {
    const perfil = validarCadastro(dados);
    expect(perfil).toEqual({
      nome: "Cliente de Teste",
      telefone: "81999990001",
      email: "nova@example.test",
      campanhas: false,
    });
    expect(perfil).not.toHaveProperty("senha");
  });
  it.each(["", "cliente@", "a b@example.test", "cliente.example.test"])(
    "recusa e-mail inválido %s",
    (email) => expect(() => normalizarEmail(email)).toThrow("e-mail válido"),
  );
  it("recusa confirmação diferente, telefone incompleto e senha curta", () => {
    expect(() =>
      validarCadastro({ ...dados, confirmacao: "OutraSenha123" }),
    ).toThrow("senhas não coincidem");
    expect(() => validarCadastro({ ...dados, telefone: "123" })).toThrow(
      "telefone",
    );
    expect(() =>
      validarCadastro({ ...dados, senha: "123", confirmacao: "123" }),
    ).toThrow("8 a 128");
  });
  it("registra recusa e aceite com data e versão do aviso", () => {
    expect(registrarPreferencia(false, 0)).toEqual({
      permitidas: false,
      registradoEm: "1970-01-01T00:00:00.000Z",
      versaoAviso: "campanhas-2026-10",
    });
    expect(registrarPreferencia(true, 1000).permitidas).toBe(true);
  });
  it("confere os limites exatos de aviso e expiração", () => {
    const sessao = {
      id: "sessao-a",
      usuarioId: "usuario-a",
      criadaEm: 1000,
      ultimaAtividade: 1000,
    };
    expect(avaliarSessao(sessao, 1000 + 19 * 60000 - 1)).toBe("ativa");
    expect(avaliarSessao(sessao, 1000 + 19 * 60000)).toBe("aviso");
    expect(avaliarSessao(sessao, 1000 + 20 * 60000)).toBe("expirada");
    expect(avaliarSessao(sessao, 500)).toBe("expirada");
    expect(avaliarSessao(null, 0)).toBe("visitante");
  });
  it("usa sal individual e reconhece senha correta e incorreta", async () => {
    const primeira = await criarCredencial(dados.senha);
    const segunda = await criarCredencial(dados.senha);
    expect(primeira.sal).not.toEqual(segunda.sal);
    expect(primeira.verificador).not.toEqual(segunda.verificador);
    expect(await conferirCredencial(dados.senha, primeira)).toBe(true);
    expect(await conferirCredencial("SenhaErrada123!", primeira)).toBe(false);
    expect(JSON.stringify(primeira)).not.toContain(dados.senha);
  });
});
