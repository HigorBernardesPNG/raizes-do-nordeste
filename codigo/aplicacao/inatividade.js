export function acompanharInatividade({
  conta,
  aoAtualizar,
  aoOcultar,
  aoRetomar,
  aoInteragir = async () => {},
}) {
  const ouvintes = new AbortController();
  let verificando = false;
  let renovando = false;
  let interacaoPendente = false;

  async function verificar() {
    if (verificando || document.hidden) return;
    verificando = true;
    try {
      await conta.atualizar();
      await aoAtualizar();
    } finally {
      verificando = false;
    }
  }

  async function registrar(evento) {
    if (!evento.isTrusted || document.hidden) return;
    if (evento.type === "pointermove" && evento.buttons === 0) return;
    interacaoPendente = true;
    if (renovando) return;
    renovando = true;
    try {
      // Agrupo eventos que chegam enquanto a gravação anterior ainda está em andamento.
      while (interacaoPendente) {
        interacaoPendente = false;
        await conta.registrarAtividade();
        await aoInteragir();
      }
      await aoAtualizar();
    } finally {
      renovando = false;
    }
  }

  // Escuto a origem da rolagem. Um scrollTo da navegação não conta como atividade do cliente.
  for (const tipo of [
    "pointerdown",
    "pointermove",
    "keydown",
    "wheel",
    "touchstart",
    "touchmove",
  ]) {
    document.addEventListener(tipo, registrar, {
      signal: ouvintes.signal,
      passive: true,
    });
  }
  async function retomar() {
    aoOcultar();
    await verificar();
    await aoRetomar();
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) aoOcultar();
      else void retomar();
    },
    { signal: ouvintes.signal },
  );
  window.addEventListener("pageshow", retomar, { signal: ouvintes.signal });
  window.addEventListener("focus", retomar, { signal: ouvintes.signal });
  const intervalo = setInterval(verificar, 1000);
  return () => {
    clearInterval(intervalo);
    ouvintes.abort();
  };
}
