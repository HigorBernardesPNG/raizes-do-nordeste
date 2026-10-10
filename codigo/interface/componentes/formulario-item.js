import { criarElemento } from "./elementos";

export function criarFormularioItem({
  identificador,
  quantidade = 1,
  observacao = "",
  textoBotao,
  bloqueado,
  salvar,
}) {
  const formulario = criarElemento("form", "", "formulario-item");
  const rotuloQuantidade = criarElemento("label", "Quantidade");
  const campoQuantidade = criarElemento("input");
  campoQuantidade.id = `quantidade-${identificador}`;
  campoQuantidade.type = "number";
  campoQuantidade.min = "1";
  campoQuantidade.step = "1";
  campoQuantidade.required = true;
  campoQuantidade.value = quantidade;
  rotuloQuantidade.htmlFor = campoQuantidade.id;
  const rotuloObservacao = criarElemento(
    "label",
    "Observação do preparo (opcional)",
  );
  const campoObservacao = criarElemento("textarea");
  campoObservacao.id = `observacao-${identificador}`;
  campoObservacao.maxLength = 200;
  campoObservacao.rows = 2;
  campoObservacao.value = observacao;
  rotuloObservacao.htmlFor = campoObservacao.id;
  const ajuda = criarElemento(
    "p",
    "Até 200 caracteres. Use este campo apenas para instruções de preparo, sem dados pessoais.",
    "texto-apoio",
  );
  ajuda.id = `ajuda-${identificador}`;
  campoObservacao.setAttribute("aria-describedby", ajuda.id);
  const botao = criarElemento("button", textoBotao, "botao");
  botao.type = "submit";
  botao.disabled = bloqueado;
  const retorno = criarElemento("p", "", "retorno-formulario");
  retorno.setAttribute("role", "status");
  const ouvintes = new AbortController();
  // A validação nativa ajuda no preenchimento. As regras repetem a conferência antes de salvar.
  formulario.addEventListener(
    "submit",
    async (evento) => {
      evento.preventDefault();
      if (botao.disabled) return;
      botao.disabled = true;
      retorno.textContent = "Salvando…";
      try {
        await salvar(Number(campoQuantidade.value), campoObservacao.value);
        retorno.textContent = "Sacola atualizada.";
      } catch (erro) {
        retorno.textContent = erro.message;
      } finally {
        botao.disabled = bloqueado;
      }
    },
    { signal: ouvintes.signal },
  );
  formulario.append(
    rotuloQuantidade,
    campoQuantidade,
    rotuloObservacao,
    campoObservacao,
    ajuda,
    botao,
    retorno,
  );
  return { elemento: formulario, desmontar: () => ouvintes.abort() };
}
