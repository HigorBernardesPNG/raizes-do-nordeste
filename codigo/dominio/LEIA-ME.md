# Regras da sacola e da conta

Concentrei em `sacola.js` as regras de quantidade, observação, resumo e troca de unidade. Essas funções recebem dados e devolvem um novo resultado. Nenhuma delas abre o banco ou monta elementos de tela.

A observação aceita até 200 caracteres. Quantidades são inteiras e positivas. O estoque limita a soma de todas as linhas do mesmo produto, mesmo quando as observações são diferentes.

Na troca de unidade, `prepararTroca` calcula uma prévia sem alterar o estado original. O estoque da nova unidade é distribuído na ordem em que os itens aparecem na sacola. Reduções e remoções aparecem na revisão antes da confirmação.

Os valores são calculados em centavos. O catálogo é fixo durante a execução. Na confirmação do pagamento, a persistência confere novamente os itens, a disponibilidade e os totais.

Em `conta.js`, concentrei normalização de e-mail, validação do cadastro, formato do perfil e avaliação dos limites de 19 e 20 minutos. O relógio chega como argumento para permitir testar esses limites sem esperar vinte minutos. A senha não faz parte do perfil devolvido às telas.

Em `finalizacao.js`, estão os campos permitidos, a compatibilidade de cidade/UF, a taxa fixa de 500 centavos, a revisão de estoque e o prazo do rascunho. A revisão valida os dados e os itens. Benefícios e registro do pedido pertencem à confirmação do pagamento.

## Percurso completo

pedido.js acrescenta elegibilidade de benefícios, validação do cartão fictício, sequência do pedido e cálculo de pontos. Revisar a compra continua sem gerar pedido; a confirmação pertence ao módulo de pagamento.
