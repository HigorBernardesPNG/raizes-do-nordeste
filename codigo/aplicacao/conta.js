import {
  validarCadastro,
  normalizarEmail,
  criarSessao,
  registrarPreferencia,
  obterPerfil,
} from "../dominio/conta";
import {
  criarCredencial,
  conferirCredencial,
} from "../servicos/simulados/credencial";
import usuarioInicial from "../dados/iniciais/usuario-demonstrativo.json";

export function criarControleConta(repositorio, relogio = () => Date.now()) {
  let estado = {
    sessao: null,
    perfil: null,
    situacao: "visitante",
    disponivel: false,
    erro: "",
  };
  let fila = Promise.resolve();
  let saidaPendente = null;
  let inicializado = false;

  // Uma fila curta mantém a ordem entre renovar, consultar e sair. Um retorno antigo não restaura a sessão.
  function ordenar(operacao) {
    const resultado = fila.then(operacao);
    fila = resultado.catch(() => {});
    return resultado;
  }
  function falhar(erro) {
    estado = {
      sessao: null,
      perfil: null,
      situacao: "visitante",
      disponivel: false,
      erro: erro.message,
    };
  }
  async function carregar(renovarId = null) {
    if (!inicializado) return structuredClone(estado);
    try {
      if (saidaPendente) {
        await repositorio.sair(saidaPendente);
        saidaPendente = null;
      }
      const resultado = await repositorio.consultar(relogio(), renovarId);
      estado = { ...resultado, disponivel: true, erro: "" };
    } catch (erro) {
      falhar(erro);
    }
    return structuredClone(estado);
  }
  function conferirDisponibilidade() {
    if (!estado.disponivel)
      throw new Error(
        estado.erro || "O acesso local está indisponível. Tente novamente.",
      );
  }
  function conferirCancelamento(sinal) {
    if (sinal?.aborted)
      throw new Error(
        "A tela de acesso foi encerrada. Nenhuma nova sessão foi iniciada por esta ação.",
      );
  }

  return {
    consultar: () => structuredClone(estado),
    inicializar: () =>
      ordenar(async () => {
        try {
          await repositorio.inicializar(structuredClone(usuarioInicial));
          inicializado = true;
          await carregar();
        } catch (erro) {
          falhar(erro);
        }
      }),
    atualizar: () => ordenar(() => carregar()),
    registrarAtividade: () => {
      const sessaoId = estado.sessao?.id;
      if (!sessaoId) return Promise.resolve();
      return ordenar(() => carregar(sessaoId));
    },
    cadastrar: (dados, sinal) =>
      ordenar(async () => {
        conferirDisponibilidade();
        const perfil = validarCadastro(dados);
        const credencial = await criarCredencial(dados.senha);
        conferirCancelamento(sinal);
        const agora = relogio();
        const usuario = {
          ...perfil,
          id: crypto.randomUUID(),
          credencial,
          campanhas: registrarPreferencia(perfil.campanhas, agora),
        };
        const sessao = criarSessao(usuario.id, agora);
        await repositorio.cadastrar(usuario, sessao);
        estado = {
          sessao,
          perfil: obterPerfil(usuario),
          situacao: "ativa",
          disponivel: true,
          erro: "",
        };
      }),
    entrar: (email, senha, sinal) =>
      ordenar(async () => {
        conferirDisponibilidade();
        const usuario = await repositorio.buscarPorEmail(
          normalizarEmail(email),
        );
        if (
          !usuario ||
          typeof senha !== "string" ||
          senha.length > 128 ||
          !(await conferirCredencial(senha, usuario.credencial))
        ) {
          throw new Error("E-mail ou senha inválidos.");
        }
        conferirCancelamento(sinal);
        const sessao = criarSessao(usuario.id, relogio());
        await repositorio.entrar(usuario, sessao);
        estado = {
          sessao,
          perfil: obterPerfil(usuario),
          situacao: "ativa",
          disponivel: true,
          erro: "",
        };
      }),
    sair: () =>
      ordenar(async () => {
        const sessaoId = estado.sessao?.id;
        try {
          await repositorio.sair(sessaoId);
          estado = {
            sessao: null,
            perfil: null,
            situacao: "visitante",
            disponivel: true,
            erro: "",
          };
        } catch {
          // Oculto os dados mesmo se o banco falhar, sem afirmar que a saída foi gravada.
          const erro = new Error(
            "Não foi possível gravar a saída. Os dados foram ocultados, mas recarregar pode recuperar a sessão. Tente novamente o acesso local.",
          );
          saidaPendente = sessaoId;
          falhar(erro);
          throw erro;
        }
      }),
    alterarCampanhas: (permitidas, sessaoEsperada) =>
      ordenar(async () => {
        const sessaoId = sessaoEsperada ?? estado.sessao?.id;
        await carregar();
        conferirDisponibilidade();
        if (!sessaoId || estado.sessao?.id !== sessaoId)
          throw new Error(
            "A sessão terminou ou mudou. Entre novamente para continuar.",
          );
        await repositorio.alterarCampanhas(sessaoId, permitidas, relogio());
        await carregar();
      }),
  };
}
