# Testes da aplicação

Organizei os testes em regras e navegação. Vitest verifica cálculos e validações; Playwright percorre as telas com um banco isolado para cada contexto. Os testes não utilizam os dados da sessão aberta no navegador pessoal.

## Executar

```sh
npm test
npm run build
npx playwright install chromium
npm run test:navegacao
```

A compilação precisa ocorrer antes dos testes de navegação. Playwright abre o servidor de prévia na porta 4173 e o encerra ao terminar. O relatório HTML fica em `relatorios/html/index.html`; essa pasta não faz parte do repositório.

## Cobertura

| Área | Comportamentos verificados |
| --- | --- |
| Base e rotas | Cardápio, produtos, unidade fechada, rota desconhecida e foco |
| Sacola | Quantidade, observações, disponibilidade, troca de unidade, recarga e conflito entre abas |
| Conta | Cadastro, duplicidade de e-mail, login, credencial, consentimento e inatividade |
| Finalização | Identificação, endereço, taxa, revisão, preservação e limpeza do rascunho |
| Pedido | Cartão fictício, aprovação, recusa, repetição de envio e falha de gravação |
| Benefícios | Mínimos, saldo, desconto, crédito único e campanha consentida |
| Canais | Entrega, retirada, totem e encerramento do atendimento |

O teste que provoca falha de armazenamento injeta o erro apenas no navegador isolado. A aplicação não gera erros aleatórios no caminho do cliente. Testes de resgate preparam um saldo conhecido; a conta normal começa com zero.

## Resultado e limites

A conferência desta versão, em 10/10/2026, aprovou 45 testes unitários e 88 execuções de navegador, além da compilação. As 88 execuções correspondem a 44 percursos nos perfis computador e celular, sem falhas ou testes ignorados. O ambiente de verificação utilizou Chromium 153.0.8010.0; a configuração do repositório utiliza a instalação padrão do Playwright.

Larguras de tela e alguns percursos de foco possuem verificações automatizadas. A conferência manual completa de teclado e zoom de 200% continua necessária, assim como o teste do endereço público após o deploy. Testes locais não comprovam disponibilidade do provedor de hospedagem, segurança de produção ou funcionamento em todos os navegadores.

O fluxo do GitHub Actions executa testes e build. A Vercel realiza a publicação pela integração com o repositório; são processos independentes. Antes de considerar uma entrega validada, conferir o resultado de ambos.
