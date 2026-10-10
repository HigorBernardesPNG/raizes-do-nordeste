# Raízes do Nordeste

Aplicação web desenvolvida para o Projeto Multidisciplinar, na trilha Front-end. O estudo de caso apresenta uma rede de lanchonetes que precisa integrar cardápio por unidade, compra, acompanhamento e fidelização.

Meu foco foi construir o caminho do cliente, incluindo as situações em que algo dá errado. A compra aceita visitante, mantém a sacola no navegador e permite acompanhar o pedido. Pagamento e operação da loja usam dados simulados, sem cobrança real.

## Executar o projeto

O projeto usa Node.js 24.x e npm. No terminal, abrir a pasta que contém este README, `package.json` e `package-lock.json`.

```sh
npm ci
npm run dev
```

Abrir o endereço informado no terminal, normalmente `http://localhost:5173/`. O terminal precisa permanecer aberto; `Ctrl+C` encerra o servidor. Não abrir `index.html` diretamente.

No PowerShell, caso a execução de `npm.ps1` esteja bloqueada, usar `npm.cmd ci` e `npm.cmd run dev`.

## O que a aplicação permite

- Consultar produtos e disponibilidade por unidade.
- Montar a sacola e revisar diferenças antes de trocar de loja.
- Comprar como visitante ou usar uma conta opcional.
- Escolher retirada ou entrega na cidade da unidade.
- Simular aprovação e recusa de cartão, com orientação para corrigir erros.
- Acompanhar o preparo e concluir a retirada ou entrega.
- Acumular pontos, aplicar descontos e escolher a preferência de campanhas.
- Usar o modo totem com unidade fixa e encerrar o atendimento.

Conta de teste: `ana@example.test`, senha `TesteRaizes123!`. Esses dados são públicos e servem apenas à demonstração. Também é possível cadastrar outra conta com dados fictícios.

No pagamento, o botão **Preencher cartão fictício** fornece os dados aceitos. Em **Demonstração**, ficam a escolha de aprovação ou recusa, o avanço das etapas e o modo totem. O [roteiro de demonstração](documentacao/roteiro-de-demonstracao.md) apresenta os percursos completos.

## Tecnologias e organização

Usei HTML, JavaScript modular, SCSS e Vite. A navegação utiliza hash, como `#/cardapio`, e o IndexedDB mantém os dados no navegador. Vitest verifica regras; Playwright verifica os percursos da interface.

| Pasta | Responsabilidade |
| --- | --- |
| `codigo/interface` | Telas, campos e mensagens |
| `codigo/aplicacao` | Navegação e coordenação das ações |
| `codigo/dominio` | Validações e cálculos |
| `codigo/persistencia` | Leitura e gravação no IndexedDB |
| `codigo/servicos/simulados` | Catálogo, credencial e pagamento fictício |
| `codigo/dados/iniciais` | Produtos, unidades e conta de teste |
| `codigo/estilos` | Estilos e variáveis SCSS |
| `publico/fontes` | Fontes locais e respectivas licenças |
| `testes` | Testes unitários e de navegação |
| `documentacao` | Arquitetura, regras, testes, demonstração e publicação |

## Testar e compilar

```sh
npm test
npm run build
npx playwright install chromium
npm run test:navegacao
```

O teste de navegação depende da compilação. Para visualizar o resultado compilado, executar `npm run preview`. A saída do build fica em `distribuicao`.

## Dados e limites

Os dados ficam no navegador e não são sincronizados entre dispositivos. Cartão completo e código de segurança não são salvos. Campanhas dependem de uma escolha opcional, que pode ser revogada. A sessão encerra após 20 minutos sem interação.

O projeto não possui backend nem integração financeira real. A conta local não oferece autorização de servidor. Para testar, usar somente dados fictícios. A tela **Privacidade e dados** explica o armazenamento e a remoção dos registros.

As decisões de implementação estão em [Arquitetura](documentacao/arquitetura.md); as regras, em [Funcionalidades](documentacao/funcionalidades.md).
