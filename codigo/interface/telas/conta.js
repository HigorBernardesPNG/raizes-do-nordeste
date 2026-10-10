import {
  criarElemento,
  criarTitulo,
  criarLink,
} from "../componentes/elementos";

export function montarConta(perfil, alterarCampanhas) {
  const elemento = criarElemento("section", "", "painel");
  const ouvintes = new AbortController();
  elemento.append(
    criarTitulo("Minha conta"),
    criarElemento("p", perfil.nome),
    criarElemento("p", `E-mail: ${perfil.email}`),
    criarElemento("p", `Telefone: ${perfil.telefone}`),
    criarElemento("h2", "Preferência de campanhas"),
  );
  const formulario = criarElemento("form", "", "formulario-acesso");
  const rotulo = criarElemento("label", "", "escolha-campanhas");
  const campo = criarElemento("input");
  campo.id = "preferencia-campanhas";
  campo.type = "checkbox";
  campo.checked = perfil.campanhas.permitidas;
  rotulo.htmlFor = campo.id;
  rotulo.append(
    campo,
    criarElemento(
      "span",
      "Permitir campanhas segmentadas conforme minhas preferências e meu consumo.",
    ),
  );
  const salvar = criarElemento("button", "Salvar preferência", "botao");
  salvar.type = "submit";
  const retorno = criarElemento("p");
  retorno.setAttribute("role", "status");
  formulario.append(
    rotulo,
    criarElemento(
      "p",
      "Esta escolha é opcional. Nenhuma campanha é enviada nesta demonstração.",
    ),
    salvar,
    retorno,
  );
  formulario.addEventListener(
    "submit",
    async (evento) => {
      evento.preventDefault();
      if (salvar.disabled) return;
      salvar.disabled = true;
      try {
        await alterarCampanhas(campo.checked);
        retorno.textContent = "Preferência salva.";
      } catch (erro) {
        retorno.textContent = erro.message;
      } finally {
        salvar.disabled = false;
      }
    },
    { signal: ouvintes.signal },
  );
  elemento.append(
    formulario,
    criarElemento(
      "p",
      "A conta fica disponível neste navegador. Sair encerra o acesso, mas mantém a sacola e o cadastro para a próxima entrada.",
      "texto-apoio",
    ),
    criarElemento(
      "p",
      "Consulte seu último pedido e o saldo de pontos pelos links abaixo.",
    ),
    criarLink("Consultar fidelidade", "#/fidelidade"),
    criarLink("Acompanhar último pedido", "#/acompanhamento"),
    criarLink("Voltar à sacola", "#/sacola"),
    criarLink("Privacidade e dados", "#/privacidade"),
  );
  return { elemento, titulo: "Minha conta", desmontar: () => ouvintes.abort() };
}
