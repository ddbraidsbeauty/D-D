# RC8 — Opções individuais no Catálogo

- Procedimentos, métodos e variações agora têm editores independentes para Características, Tamanhos e Espessuras.
- Cada item pode ser adicionado, renomeado ou removido separadamente, incluindo opções existentes.
- O campo de entrada ainda não adicionado também é recolhido ao salvar, para evitar perda de texto digitado.
- Duplicações são evitadas, com comparação insensível a maiúsculas/minúsculas.
- A integração continua usando a RPC admin_replace_service_options: nenhuma migração de esquema é necessária.
- Não altera o editor de materiais (Cores e Tamanhos/opções).

Nota: o erro de unaccent foi corrigido diretamente no Supabase por migração separada.

## Homologação

- Chromium: 375 px, 768 px e 1440 px; adicionar, editar, excluir, Enter e salvar nos 3 níveis (procedimento, método, variação), sem escrita no banco.
- Bateria anterior: fluxo do admin nos 11 módulos, catálogo, financeiro e regressão do portal/cadastro.
- Testes de lógica: 13 unitários + 1692 verificações.
- Banco: migração `fix_unaccent_for_admin_catalog_rpc` **já aplicada**; teste SQL confirmou `extensions.unaccent` e 5 RPCs com chamada qualificada, SECURITY DEFINER e search_path protegido. Teste real de salvamento com conta administrativa ainda precisa ser concluído na homologação.

## Publicação

Publique os arquivos extraídos diretamente na raiz do GitHub Pages. `index.html` fica na raiz. **Não execute `backend_rc7.sql`** — integração pendente, além das proteções financeiras já aplicadas. O pacote contém SQL apenas como referência de auditoria.
