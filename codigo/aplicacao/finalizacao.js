export function criarControleFinalizacao(
  repositorio,
  relogio = () => Date.now(),
) {
  let registro = null;
  let erro = "";
  let contexto = null;
  let fila = Promise.resolve();
  function ordenar(operacao) {
    const retorno = fila.then(operacao);
    fila = retorno.catch(() => {});
    return retorno;
  }
  async function executar(acao, contextoEsperado, dados) {
    if (contextoEsperado !== contexto)
      throw new Error("O acesso mudou. Reabra a finalização.");
    try {
      const retorno = await repositorio.executar({
        acao,
        contexto,
        agora: relogio(),
        dados,
        esperado: { id: registro?.id ?? null, revisao: registro?.revisao ?? 0 },
      });
      registro = retorno.registro;
      erro = "";
      return retorno;
    } catch (falha) {
      if (acao === "consultar") erro = falha.message;
      throw falha;
    }
  }
  return {
    consultar: () => ({ registro: structuredClone(registro), erro, contexto }),
    sincronizar: (novoContexto, renovar = false) =>
      ordenar(async () => {
        const antes = JSON.stringify([
          registro?.id,
          registro?.revisao,
          contexto,
          erro,
        ]);
        contexto = novoContexto;
        try {
          await executar(renovar ? "renovar" : "consultar", contexto);
        } catch {
          // Falhar ao renovar não confirma atividade. A próxima consulta confere o prazo salvo.
          if (renovar) return false;
          registro = null;
        }
        return (
          antes !==
          JSON.stringify([registro?.id, registro?.revisao, contexto, erro])
        );
      }),
    salvar: (dados, contextoEsperado) =>
      ordenar(() => executar("salvar", contextoEsperado, dados)),
    revisar: (dados, contextoEsperado) =>
      ordenar(() => executar("revisar", contextoEsperado, dados)),
    limpar: (contextoEsperado) =>
      ordenar(() => executar("limpar", contextoEsperado)),
  };
}
