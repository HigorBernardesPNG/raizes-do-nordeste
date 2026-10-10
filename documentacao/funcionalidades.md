# Funcionalidades e regras

O percurso principal é consultar o cardápio, montar a sacola, informar o recebimento, revisar, pagar e acompanhar o pedido. A conta acrescenta fidelidade e consulta do último pedido, mas não impede a compra como visitante.

## Unidade e sacola

Cada pedido pertence a uma unidade. A sacola permanece única na interface. Antes de confirmar uma troca de loja, a aplicação apresenta diferenças de preço, receita e disponibilidade. Reduções ou remoções de itens aparecem nessa revisão.

Quantidade deve ser inteira, positiva e limitada pela disponibilidade do produto. Observações aceitam até 200 caracteres. Itens do mesmo produto com observações diferentes ocupam linhas próprias, mas compartilham o limite de quantidade disponível.

## Recebimento e pagamento

Retirada pede nome e telefone. Entrega acrescenta endereço na cidade e UF da unidade, com taxa fixa de R$ 5,00. O prazo de 45 minutos é uma estimativa fictícia. O avanço até entregue depende do controle de demonstração, não da passagem do tempo.

Somente o cartão fictício `4111 1111 1111 1111`, validade `12/30`, código `123` e nome fictício é aceito. O resultado é escolhido em Demonstração antes do pagamento. Nenhum valor é cobrado.

Durante o processamento, novo envio fica bloqueado. A aprovação salva a compra e limpa a sacola. A recusa mantém os dados para correção. Se a gravação falhar, a interface não anuncia sucesso.

## Acompanhamento

- Retirada segue confirmado, em preparo, pronto e retirado.
- Entrega segue confirmado, em preparo, pronto, saiu para entrega e entregue.

Pedido recusado não entra em preparo. Repetir uma confirmação ou a conclusão do pedido não repete a compra nem o crédito de pontos.

## Fidelidade e promoção

A conta precisa estar vinculada antes do pagamento. Cada real inteiro pago em produtos, após desconto e sem frete, gera um ponto após a retirada ou entrega. O saldo inicial é zero.

| Benefício | Pontos necessários | Mínimo em produtos |
| --- | --- | --- |
| R$ 5,00 de desconto | 100 | R$ 20,00 |
| R$ 12,00 de desconto | 200 | R$ 40,00 |
| Promoção RAIZES5 com R$ 5,00 de desconto | Não exige pontos | R$ 20,00 |

Uma compra aceita somente um benefício. O desconto não incide sobre o frete. Os pontos usados são debitados após aprovação do pagamento. RAIZES5 permanece válida durante a demonstração, sem data de vencimento.

Campanhas começam desmarcadas e podem ser revogadas em Minha conta. Quando autorizadas, a tela Fidelidade apresenta uma mensagem conforme o saldo seja inferior a 100 pontos ou igual ou superior a esse valor. Não há envio de mensagens.

## Totem

O modo totem utiliza a mesma aplicação, com unidade Boa Vista fixa, retirada e controles maiores. A mudança de modo reinicia o atendimento. Encerrar remove sessão, sacola, rascunho e acesso ao pedido anterior, mantendo os registros já salvos.

## Limites do projeto

A implementação contempla a jornada do cliente. Cozinha e pagamento são simulados. A modelagem acadêmica considera também atendente, cozinha, gerente e provedor de pagamento, sem exigir painéis desses atores nesta aplicação.

Não fazem parte da implementação backend, cobrança real, cancelamento, estorno, reserva de estoque, reserva de pontos, brindes, histórico separado ou exportação completa de perfil.
