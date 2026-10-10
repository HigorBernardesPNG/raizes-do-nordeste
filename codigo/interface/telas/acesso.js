import {
  criarElemento,
  criarTitulo,
  criarLink,
} from "../componentes/elementos";

function criarCampo(
  formulario,
  { nome, rotulo, tipo = "text", preenchimento, minimo, maximo },
) {
  const label = criarElemento("label", rotulo);
  const campo = criarElemento("input");
  campo.id = `acesso-${nome}`;
  campo.name = nome;
  campo.type = tipo;
  campo.required = true;
  campo.autocomplete = preenchimento ?? "off";
  if (minimo) campo.minLength = minimo;
  if (maximo) campo.maxLength = maximo;
  label.htmlFor = campo.id;
  formulario.append(label, campo);
  return campo;
}

export function montarAcesso({ cadastro, bloqueado, entrar, cadastrar }) {
  const elemento = criarElemento("section", "", "painel");
  const ouvintes = new AbortController();
  elemento.append(
    criarTitulo(cadastro ? "Criar conta" : "Entrar"),
    criarElemento(
      "p",
      "A conta é opcional. A sacola continua disponível sem cadastro.",
    ),
    criarElemento(
      "p",
      "Use dados fictícios neste ambiente de demonstração. A conta fica salva apenas neste navegador.",
      "aviso",
    ),
  );
  if (cadastro)
    elemento.append(
      criarElemento(
        "p",
        "Nome e telefone identificam o perfil de atendimento; o e-mail identifica o acesso. Os dados ficam neste navegador. A preferência de campanhas é separada e pode ser alterada na conta.",
      ),
    );
  const formulario = criarElemento("form", "", "formulario-acesso");
  const campos = {};
  if (cadastro) {
    campos.nome = criarCampo(formulario, {
      nome: "nome",
      rotulo: "Nome",
      preenchimento: "name",
      minimo: 2,
      maximo: 80,
    });
    campos.telefone = criarCampo(formulario, {
      nome: "telefone",
      rotulo: "Telefone com DDD",
      tipo: "tel",
      preenchimento: "tel",
      maximo: 20,
    });
  }
  campos.email = criarCampo(formulario, {
    nome: "email",
    rotulo: "E-mail",
    tipo: "email",
    preenchimento: "username",
    maximo: 254,
  });
  campos.senha = criarCampo(formulario, {
    nome: "senha",
    rotulo: "Senha",
    tipo: "password",
    preenchimento: cadastro ? "new-password" : "current-password",
    minimo: cadastro ? 8 : null,
    maximo: 128,
  });
  if (cadastro)
    campos.confirmacao = criarCampo(formulario, {
      nome: "confirmacao",
      rotulo: "Confirmar senha",
      tipo: "password",
      preenchimento: "new-password",
      minimo: 8,
      maximo: 128,
    });
  const mostrar = criarElemento(
    "button",
    "Mostrar senha",
    "botao botao--secundario",
  );
  mostrar.type = "button";
  mostrar.setAttribute("aria-pressed", "false");
  mostrar.addEventListener(
    "click",
    () => {
      const exibir = campos.senha.type === "password";
      campos.senha.type = exibir ? "text" : "password";
      if (campos.confirmacao) campos.confirmacao.type = campos.senha.type;
      mostrar.textContent = exibir ? "Ocultar senha" : "Mostrar senha";
      mostrar.setAttribute("aria-pressed", String(exibir));
    },
    { signal: ouvintes.signal },
  );
  formulario.append(mostrar);
  const campanhas = criarElemento("input");
  campanhas.type = "checkbox";
  campanhas.id = "aceite-campanhas";
  if (cadastro) {
    formulario.append(
      criarElemento(
        "p",
        "Senha de demonstração com 8 a 128 caracteres. Não reutilize uma senha real.",
        "texto-apoio",
      ),
    );
    const escolha = criarElemento("label", "", "escolha-campanhas");
    escolha.htmlFor = campanhas.id;
    escolha.append(
      campanhas,
      criarElemento(
        "span",
        "Quero receber campanhas segmentadas conforme minhas preferências e meu consumo (opcional).",
      ),
    );
    formulario.append(
      escolha,
      criarElemento(
        "p",
        "Nenhuma campanha é enviada nesta demonstração. Recusar não impede o cadastro nem a participação na fidelização.",
        "texto-apoio",
      ),
    );
  }
  const salvar = criarElemento(
    "button",
    cadastro ? "Criar conta e entrar" : "Entrar na conta",
    "botao",
  );
  salvar.type = "submit";
  salvar.disabled = bloqueado;
  const retorno = criarElemento("p");
  retorno.setAttribute("role", "status");
  formulario.addEventListener(
    "submit",
    async (evento) => {
      evento.preventDefault();
      if (salvar.disabled) return;
      salvar.disabled = true;
      retorno.textContent = "Conferindo acesso…";
      const dados = Object.fromEntries(
        Object.entries(campos).map(([nome, campo]) => [nome, campo.value]),
      );
      dados.campanhas = campanhas.checked;
      try {
        if (cadastro) await cadastrar(dados, ouvintes.signal);
        else await entrar(dados.email, dados.senha, ouvintes.signal);
      } catch (erro) {
        retorno.textContent = erro.message;
      } finally {
        // A senha sai dos campos após a tentativa. Nome e e-mail permanecem para corrigir o preenchimento.
        campos.senha.value = "";
        if (campos.confirmacao) campos.confirmacao.value = "";
        dados.senha = "";
        dados.confirmacao = "";
        salvar.disabled = bloqueado;
      }
    },
    { signal: ouvintes.signal },
  );
  formulario.append(salvar, retorno);
  elemento.append(
    formulario,
    criarLink("Privacidade e dados", "#/privacidade"),
  );
  if (!cadastro) {
    elemento.append(
      criarElemento("h2", "Acesso de demonstração"),
      criarElemento(
        "p",
        "E-mail: ana@example.test · Senha: TesteRaizes123!",
        "credenciais-teste",
      ),
      criarElemento(
        "p",
        "Esses dados são públicos e servem somente para testar a aplicação. Não há recuperação de senha por e-mail.",
      ),
      criarLink("Criar uma conta", "#/cadastro"),
    );
  } else elemento.append(criarLink("Já tenho uma conta", "#/entrar"));
  elemento.append(criarLink("Continuar sem entrar", "#/sacola"));
  return {
    elemento,
    titulo: cadastro ? "Criar conta" : "Entrar",
    desmontar() {
      ouvintes.abort();
      formulario.reset();
    },
  };
}
