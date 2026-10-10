# Arquitetura da aplicação

Separei o projeto por responsabilidade para conseguir localizar uma regra, alterar uma tela ou revisar uma gravação sem concentrar tudo no mesmo arquivo. Mantive JavaScript modular porque o tamanho da aplicação permite essa organização sem um framework de interface.

## Caminho de uma ação

A tela recebe os dados e as funções que pode chamar. A camada de aplicação coordena a ação, o domínio confere as regras e a persistência grava o resultado. As telas não abrem o IndexedDB diretamente.

`codigo/aplicacao/iniciar.js` conecta essas partes. `rotas.js` interpreta o hash, atualiza o título e direciona o foco ao conteúdo. Ao sair de uma tela, os ouvintes são removidos para evitar ações duplicadas. Textos variáveis são inseridos com `textContent`.

## Regras e valores

O domínio reúne regras de sacola, conta, finalização e pedido. Essas funções recebem dados e devolvem resultados, sem depender do HTML ou do banco. Valores monetários são calculados em centavos. O relógio é recebido como argumento nas regras de sessão para permitir testar a inatividade sem esperar o prazo real.

## Dados no navegador

O banco `raizes-do-nordeste` usa a versão estrutural 2 e possui as coleções `estado` e `usuarios`.

| Coleção ou chave | Conteúdo |
| --- | --- |
| `usuarios` | Perfil, e-mail único, credencial derivada e preferência de campanhas |
| `estado / conta-inicial-v1` | Indica que a conta inicial já foi carregada |
| `estado / sacola-pessoal` | Unidade, itens, versão do formato e revisão |
| `estado / sessao-pessoal` | Identificação da sessão e última atividade |
| `estado / finalizacao-pessoal` | Rascunho da compra e dados de recebimento |
| `estado / pedidos-e-fidelidade` | Pedidos e saldo de pontos por conta |
| `estado / acompanhamento-pessoal` | Referência ao pedido acessível no atendimento |
| `estado / demonstracao` | Resultado escolhido para pagamento e modo totem |

O JSON fornece apenas os dados iniciais. Novos cadastros e compras são gravados no IndexedDB. Uma carga inicial não substitui alterações já salvas.

`versao` identifica o formato do registro; `revisao` identifica alterações. A revisão impede que uma confirmação antiga sobrescreva uma mudança feita em outra aba. Versão estrutural do banco e versão do registro não são a mesma coisa.

## Compra e consistência

A revisão consulta sacola, disponibilidade e preenchimento juntos. Ela ainda não cria um pedido. Na confirmação, a aplicação valida o cartão fictício e aguarda o serviço simulado fora da transação do banco.

Antes de salvar, a persistência confere novamente sessão, rascunho, sacola e benefício. A aprovação grava o pedido, desconta pontos usados e limpa a sacola na mesma transação. O identificador do rascunho representa a compra, evitando duplicidade quando a confirmação é repetida.

A recusa permite tentar novamente na mesma referência. O avanço operacional confere a etapa esperada. Na conclusão, o crédito de pontos e a marcação de que já foram creditados são gravados juntos.

Uma operação só é apresentada como concluída após `oncomplete`. Falhas abortam a transação e recebem uma mensagem de correção. Temporizadores, serviços e cálculos de senha não são aguardados dentro de uma transação do IndexedDB.

## Conta e privacidade

A senha é processada com PBKDF2-HMAC-SHA256, 600.000 iterações e sal individual. O banco guarda um verificador derivado; a tela recebe somente o perfil. Esse tratamento evita guardar a senha em texto, mas não substitui a autorização de um backend.

Cliques, toque, digitação e rolagem renovam a atividade. Consultas automáticas não renovam a sessão. O aviso aparece aos 19 minutos; o encerramento ocorre aos 20. Ao retornar a uma aba suspensa, a aplicação confere o prazo antes de reapresentar os dados.

Sair remove sessão e rascunho. No uso pessoal, conta e sacola permanecem. No totem, encerrar também limpa a sacola e o acesso ao pedido anterior. O registro do pedido permanece no banco local. A exclusão integral é feita pela opção de limpar os dados do site no navegador.

## Serviços simulados e evolução

O pagamento retorna aprovação ou recusa após um pequeno intervalo para exibir o processamento. Não existe comunicação com um provedor financeiro. O catálogo também é local, e sua disponibilidade não representa reserva de estoque.

Na evolução para um sistema real, autenticação, autorização, estoque, pedidos e pagamentos precisam ser controlados no servidor. A separação atual permite substituir os serviços e a persistência sem colocar essas responsabilidades dentro das telas.
