# Permanência dos dados

A abertura está em `banco.js`. O banco `raizes-do-nordeste` está na versão 2. A migração preserva a coleção `estado` e acrescenta `usuarios`, com índice único de e-mail. A sacola continua na chave `sacola-pessoal`, com operações em `sacola.js`.

Optei por salvar unidade e itens no mesmo registro. Assim, uma troca não consegue gravar a unidade nova e deixar os itens antigos pela metade. A transação lê, valida e grava como uma operação única.

A confirmação chega pelo evento `oncomplete`. Se houver erro, `abort` impede uma gravação parcial. O JSON inicial não recebe alterações e nunca substitui uma sacola já salva.

O campo `versao` identifica o formato do registro. O campo `revisao` aumenta em cada alteração confirmada e evita que uma aba sobrescreva mudanças feitas por outra. Esses dois campos têm funções diferentes.

A limpeza pela página de privacidade grava uma sacola vazia e preserva a sequência de revisão. Os itens e observações são apagados; o registro técnico vazio permanece. Falhas de leitura bloqueiam alterações, sem trocar silenciosamente para memória.

Não há promessa de backup. Limpar os dados do site, mudar navegador ou origem e encerrar uma janela privada pode impedir a recuperação dos dados anteriores. Pedidos e saldos também permanecem no banco local.

## Conta e sessão

O repositório `conta.js` guarda usuários e preferência de campanhas em `usuarios`. A sessão fica na chave `sessao-pessoal`, em `estado`. Cadastro e início de sessão são confirmados juntos. A credencial já chega calculada, pois a transação não deve aguardar a Web Crypto.

O usuário demonstrativo é inserido uma única vez. O marcador `conta-inicial-v1` identifica essa carga, sem relação com a versão 2 da estrutura do banco. Novos cadastros não modificam o JSON.

Cada renovação ou alteração de preferência confere a sessão vigente. Uma saída antiga não encerra outra sessão iniciada depois. A consulta periódica verifica o prazo, mas só a interação válida renova a última atividade.

## Preenchimento da finalização

Em `finalizacao.js`, a chave `finalizacao-pessoal` guarda o rascunho na coleção `estado`, sem mudar a versão do banco. O registro contém identificador, revisão, sessão, última atividade e campos permitidos. Ele aceita dados incompletos durante a digitação. A revisão exige dados válidos e consulta a sacola na mesma transação.

O login associa somente o rascunho válido de visitante. A saída remove sessão e preenchimento na mesma transação. A consulta descarta registros vencidos, inclusive sem conta, antes de exibi-los. Uma falha de gravação não deve ser apresentada como revisão concluída.

## Percurso completo

pedido.js salva pedidos e saldos na chave pedidos-e-fidelidade da coleção estado, com formato versionado. A aprovação e o débito são atômicos; não existe migração estrutural nova. O banco permanece na versão 2.
