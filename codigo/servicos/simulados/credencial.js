const ITERACOES = 600000;

async function derivar(senha, sal) {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "O acesso local precisa de HTTPS ou localhost neste navegador.",
    );
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new Uint8Array(sal),
      iterations: ITERACOES,
      hash: "SHA-256",
    },
    chave,
    256,
  );
  return Array.from(new Uint8Array(bits));
}

export async function criarCredencial(senha) {
  const sal = Array.from(crypto.getRandomValues(new Uint8Array(16)));
  return {
    algoritmo: "PBKDF2",
    hash: "SHA-256",
    iteracoes: ITERACOES,
    sal,
    verificador: await derivar(senha, sal),
  };
}

export async function conferirCredencial(senha, credencial) {
  if (
    credencial?.algoritmo !== "PBKDF2" ||
    credencial.hash !== "SHA-256" ||
    credencial.iteracoes !== ITERACOES ||
    !Array.isArray(credencial.sal) ||
    credencial.sal.length !== 16 ||
    !Array.isArray(credencial.verificador) ||
    credencial.verificador.length !== 32
  ) {
    throw new Error(
      "A credencial local não pôde ser lida. Use outra conta de demonstração.",
    );
  }
  const resultado = await derivar(senha, credencial.sal);
  let diferenca = 0;
  for (let indice = 0; indice < resultado.length; indice++)
    diferenca |= resultado[indice] ^ credencial.verificador[indice];
  return diferenca === 0;
}
