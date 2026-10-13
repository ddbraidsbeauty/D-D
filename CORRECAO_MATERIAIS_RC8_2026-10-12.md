# D&D Braids RC8 — desbloqueio do cadastro de materiais

Data: 12/10/2026. Esta é uma atualização incremental para homologação; não é a RC7 inteira.

## Causa do aviso "Configuração pendente"

O código antigo considerava toda a RC7 instalada quando a tabela `ddb_material_prices` existisse. Como ela não existia, o cadastro de materiais era bloqueado antes de tentar salvar. O banco também não tinha a rotina `ddb_replace_material_quantities`.

## Correções de banco já aplicadas, sem apagar cadastros

Migração Supabase: `enable_atomic_material_catalog_without_rc7_activation`.

- Criada `ddb_material_prices` com RLS habilitada, leitura autorizada e escrita somente por RPC administrativa.
- Criadas RPCs `ddb_replace_material_quantities`, `ddb_save_material_complete` e `ddb_save_material_price`, com verificação administrativa e `search_path` restrito.
- `ddb_save_material_complete` grava o material, suas variantes e quantidades na mesma transação. Quantidade inválida impede o conjunto inteiro de ser gravado.
- Escopos de serviço, método e variação passam por validação de vínculo; quantidades positivas e escopos duplicados são verificados.
- Nenhum registro antigo foi apagado. O teste transacional com material temporário foi executado com `ROLLBACK`.

**NÃO EXECUTE `backend_rc7.sql` inteiro**: ainda contém funcionalidades de espera/agendamento/pagamento não homologadas para o esquema real.

## Correções de interface

- `Cores disponíveis` e `Tamanhos/opções` permitem adicionar, editar e remover opções individualmente.
- `Variações disponíveis` permite desmarcar combinações inexistentes, sem reativá-las ao reabrir o formulário.
- `Salvar` usa uma única chamada de backend para material e quantidades.
- O valor interno já existente é consultado apenas no acesso do admin, antes de editar, para não zerá-lo involuntariamente.
- Indicadores independentes: `materialPricesReady` habilita edição/precificação de materiais; `rc7Installed` continua falso, impedindo a liberação acidental de remarcação e lista de espera ainda pendentes.

## Testes

- Playwright/Chromium: 375, 768 e 1440 px; combinações de variantes, seleção/desmarcação, salvamento simulado, reabertura sem reativar combinações, leitura administrativa do custo.
- Bateria de 11 módulos, cliques, Financeiro, anamnese e layout da variação: passou na simulação.
- 13 testes de lógica e 1.692 verificações: passaram.
- Banco: teste de escrita isolada com `BEGIN`/`ROLLBACK` passou. **Ainda não há teste de salvamento com a sessão real da interface publicada.**

## Próximo teste manual

1. Atualizar os arquivos do site no GitHub Pages e aguardar o deploy.
2. Admin → Catálogo → Novo material.
3. Cadastrar `Jumbo`, adicionar cores e tamanhos individualmente e marcar as combinações que existem.
4. Selecionar a compatibilidade com um método/variação, informar os pacotes e clicar em Salvar.
5. Recarregar o site, reabrir o material e verificar cores, tamanhos, combinações e quantidade.
6. Admin → Pendências → Valores dos materiais: configurar os preços por pacote para cada profissional.

**Ainda pendente:** a cliente selecionar materiais próprios, escolher cor/tamanho e receber desconto num agendamento real requer habilitar e homologar o `ddb_create_booking_v7` com as regras de pagamento/estoque. Esta atualização não libera esse fluxo automaticamente.
