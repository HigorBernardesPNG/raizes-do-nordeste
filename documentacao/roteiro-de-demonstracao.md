# Roteiro de demonstração

Este roteiro permite percorrer a compra e conferir os erros previstos. Uso apenas dados fictícios. Para começar com uma base vazia, a limpeza dos dados do site deve ocorrer antes do teste; ela apaga os registros anteriores.

## Compra aprovada

1. Selecionar Boa Vista e incluir um cuscuz de R$ 20,00.
2. Abrir a sacola, continuar e informar nome e telefone fictícios.
3. Manter retirada e revisar a compra.
4. Selecionar RAIZES5. O total deve passar para R$ 15,00.
5. Usar Preencher cartão fictício e Confirmar e pagar.
6. Conferir o acompanhamento e recarregar a página. O pedido deve permanecer salvo.
7. Abrir Demonstração e avançar até retirado.

## Pagamento recusado

Em Demonstração, selecionar recusado e salvar antes de pagar. Repetir o preenchimento da compra. A tela deve informar a recusa, manter os dados e permitir nova tentativa. Escolher aprovado nos controles e tentar novamente. A referência da compra permanece a mesma.

## Conta e pontos

Entrar com `ana@example.test` e senha `TesteRaizes123!`, ou criar uma conta fictícia. Concluir uma compra de três cuscuzes, sem desconto, para acumular 60 pontos. Concluir outra de dois cuscuzes, também sem desconto, para chegar a 100.

Na compra seguinte, incluir pelo menos R$ 20,00 em produtos e escolher o desconto de 100 pontos. O total deve reduzir R$ 5,00. O débito ocorre na aprovação, e os pontos da nova compra entram somente após sua conclusão.

## Entrega e validações

Escolher entrega e preencher endereço fictício na cidade e UF da unidade. Conferir a taxa de R$ 5,00. Informar uma cidade diferente para verificar a orientação de correção. Após aprovação, avançar o pedido até entregue.

Também conferir quantidade inválida, produto indisponível, e-mail já cadastrado, senha incorreta e benefício sem saldo suficiente. As mensagens devem orientar a correção sem descartar os demais dados válidos.

## Privacidade e totem

Na conta, permitir campanhas, consultar Fidelidade e depois revogar a preferência. A mensagem de campanha deve deixar de aparecer.

Em Demonstração, ativar o modo totem. Conferir Boa Vista fixa e retirada como única opção. Após uma compra, encerrar o atendimento e conferir que o próximo cliente não recebe os dados do atendimento anterior.

## Navegação e acesso público

Percorrer os controles com Tab e Shift+Tab, acionando links com Enter e botões com Enter ou Espaço. Conferir foco visível, mensagens de erro e acesso ao conteúdo com zoom de 200%. Repetir o percurso no celular.

Após publicar, abrir o repositório e o endereço de produção sem autenticação, concluir uma compra e recarregar o acompanhamento. O banco do ambiente local não é transferido para o endereço publicado.
