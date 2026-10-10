export async function solicitarPagamento(cenario, sinal) {
  // O tempo serve apenas para mostrar o processamento. Nenhum dado sai do navegador.
  await new Promise((resolver) => setTimeout(resolver, 700));
  if (sinal?.aborted)
    throw new Error("A tentativa foi interrompida antes da confirmação.");
  return cenario === "recusado" ? "recusado" : "aprovado";
}
