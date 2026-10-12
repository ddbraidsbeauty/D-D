# D&D Braids Beauty — RC8 | Limpeza conservadora do código

**Status:** pacote de **homologação**, derivado da RC7. **Não publicar em produção** antes de validar os contratos do Supabase e o checklist RC7. Nenhum SQL foi aplicado no banco real.

## Mudanças concluídas

1. **Imagens fora do JavaScript:** extraídas imagens de demonstração Base64 para `assets/demo/*.jpg` (13 arquivos atualmente utilizados). O arquivo `app.js` de distribuição diminuiu de **515.434 bytes na RC7 para 171.745 bytes**. A economia no JS não representa a mesma economia no download total: as imagens agora são recursos separados, cacheáveis.
2. **Código-fonte dividido por responsabilidade:** `src/` tem 9 arquivos ordenados (`00-media` a `80-startup`); `styles/` tem 6 folhas temáticas. `tools/build.py` monta `app.js` e `styles.css` de modo reproduzível. Um bundle clássico preserva o escopo compartilhado original, sem exigir ferramentas de build no GitHub Pages.
3. **Remoção de código morto:** excluídas três implementações locais de `submitRequest`, `renderAccount` e `renderSpecificConsent`, substituídas anteriormente pelas versões com autenticação/Supabase em `70-integration.js`. Elimina comportamento concorrente e operações sobre dados fictícios no navegador.
4. **Retirada de interfaces falsas:** botões para restaurar/limpar demo, antes visíveis porém inativos, foram retirados do painel de configurações.
5. **Exclusão de dados fictícios desatualizados:** removida pessoa fictícia não pertencente ao escopo, seu PIN de demonstração e imagem não utilizada. Retirados campos locais obsoletos `adminEmail` e `adminPassword`.
6. **Defesas de renderização:** endereços de imagens passam por filtro de protocolos e escape para atributos HTML nas telas públicas, formulários de upload e cartões do painel; nomes/cores de materiais são escapados no painel. URLs como `javascript:` não entram no `src` das imagens.
7. **Rascunho do cadastro mais restrito:** somente um conjunto explícito de seleções não sensíveis é guardado durante a confirmação do e-mail; anamnese, dados pessoais, imagem de referência e texto livre não são persistidos no armazenamento local. A recuperação ignora campos inesperados e limita o passo restaurado.
8. **Testes de regressão:** verificação do contrato de fontes e build, imagens reais por HTTP simulado, injeção de HTML malicioso, responsividade em 375/768/1440 px, cálculo do fluxo de material próprio e portal, mantendo os testes lógicos RC7.

## Resultados dos testes locais

| Comando | Resultado |
|---|---|
| `python tools/build.py --check` | Build atualizado |
| `node --check app.js && node --check backend.js && node --check logic.js && node --check rc7-ui.js` | Sintaxe válida |
| `node tests_logic.js` | 13/13 aprovados |
| `node tests_extended.js` | 1.692 verificações aprovadas |
| `python tests/test_source_contract.py` | Aprovado |
| `python tests/test_http_browser.py` | 3 larguras aprovadas + verificação de injeção maliciosa |
| `python tests_browser.py` | Navegação, preços, portal e filtro da fila aprovados com backend simulado |

**Limites:** os testes de navegador usam mocks de Supabase. Não houve confirmação real de e-mail, criação/alteração de registros de cliente no banco, transferência Pix, aplicação de crédito, integração WhatsApp nem concorrência real na agenda. Segurança efetiva depende também de RLS, permissões e validações das RPCs **não auditadas** nesta etapa. Esta versão não alega concluir esses fluxos.

## Como editar e distribuir

- **Editar somente** `src/*.js` e `styles/*.css` para mudanças em interface e lógica legada; usar `backend.js` e `rc7-ui.js` conforme necessário.
- Rodar `python tools/build.py` para gerar `app.js` e `styles.css` após qualquer mudança de fontes.
- Rodar todos os testes listados acima.
- Para GitHub Pages, publicar todos os arquivos necessários, incluindo `assets/demo/`, `app.js`, `styles.css`, `index.html`, `backend.js`, `logic.js` e `rc7-ui.js`. Os fontes e testes podem ficar no repositório, mas não são executados pelo browser.
- **Não executar `backend_rc7.sql` automaticamente.** Requer inspeção do banco e aplicação primeiro em homologação.

## Pendências conscientes

- Validar/ajustar `backend_rc7.sql` com esquema real, políticas RLS e RPCs existentes.
- Testar RC6/RC7 de confirmação de e-mail e restauração do fluxo com usuário real em duas abas.
- Testar fim a fim agendamento, anamnese, materiais e horários sob concorrência.
- Reconciliar pagamentos, créditos e reembolsos antes de liberar uso real.
- Os dados de texto livre e referência não persistem em `localStorage` durante a confirmação do e-mail; podem precisar ser informados novamente após o retorno por segurança. Avaliar estratégia de retomada autenticada no servidor em outra etapa.
- Eventuais refatorações profundas do painel administrativo, finanças e regras de agenda devem ser feitas **com o esquema e testes reais**, não por remoção automática de trechos aparentemente redundantes.

### Segurança financeira Supabase — 12/10/2026
Instaladas duas migrações isoladas no projeto real para impedir devolução dupla do sinal, conter a RPC legada `record_refund`, validar pagamento registrado, preservar a escolha Pix/crédito e criar notificação de conclusão. Foi adicionada proteção contra atualização ou exclusão de pagamentos já destinados. Ambos os SQLs foram incorporados ao `backend_rc7.sql` para futuras instalações; **restante da expansão não aplicado**.
