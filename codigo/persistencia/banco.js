const NOME_BANCO = "raizes-do-nordeste";

export function abrirBanco() {
  return new Promise((resolver, rejeitar) => {
    if (!globalThis.indexedDB) {
      rejeitar(
        new Error("O armazenamento local não está disponível neste navegador."),
      );
      return;
    }
    let encerrado = false;
    const pedido = indexedDB.open(NOME_BANCO, 2);
    const prazo = setTimeout(() => {
      encerrado = true;
      rejeitar(
        new Error(
          "O armazenamento não respondeu. Feche outras abas e tente novamente.",
        ),
      );
    }, 5000);
    pedido.onupgradeneeded = () => {
      const banco = pedido.result;
      if (!banco.objectStoreNames.contains("estado"))
        banco.createObjectStore("estado");
      // A migração acrescenta contas e mantém a coleção da sacola já existente.
      if (!banco.objectStoreNames.contains("usuarios")) {
        const usuarios = banco.createObjectStore("usuarios", { keyPath: "id" });
        usuarios.createIndex("email", "email", { unique: true });
      }
    };
    pedido.onerror = () => {
      clearTimeout(prazo);
      rejeitar(new Error("Não foi possível abrir o armazenamento local."));
    };
    pedido.onblocked = () => {
      clearTimeout(prazo);
      encerrado = true;
      rejeitar(new Error("Feche as outras abas do projeto e tente novamente."));
    };
    pedido.onsuccess = () => {
      clearTimeout(prazo);
      const banco = pedido.result;
      if (encerrado) {
        banco.close();
        return;
      }
      banco.onversionchange = () => banco.close();
      resolver(banco);
    };
  });
}
