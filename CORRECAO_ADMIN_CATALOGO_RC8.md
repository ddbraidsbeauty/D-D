# D&D Braids RC8 — Correção do painel administrativo

## Problema identificado
A interface do Catálogo era desenhada, mas `bindModule('catalog')` chamava `bindCatalog()` que não existia. Como consequência, os cliques dos botões do Catálogo não eram registrados. A seção Clientes chamava `bindClients()` ausente e a agenda tinha um botão de edição que chamava `editBooking()` ausente.

## Solução
- Restaurado `bindCatalog()` com os sete grupos de ações: novo/editar procedimento, métodos, novo/editar material e novo/editar acessório.
- Restaurado `bindClients()` com busca e perfil somente leitura baseado no histórico de agendamentos.
- O botão antigo de edição de agendamento agora se chama **Detalhes** e abre informações somente leitura. Para datas e horários, usar a ação **Remarcar** existente.
- O fluxo de cadastro/login, a política de preço obrigatório e o backend Supabase permanecem inalterados.

## Testes
- Chromium simulado 375/768/1440px: clique real em todas as ações do Catálogo, métodos e novo método, Clientes e Agendamentos.
- Testes preexistentes: fonte, imagens de catálogo, preço pendente, cadastro e recuperação, portal/logout, HTTP/browser, 13 testes unitários e 1692 verificações determinísticas — passaram.
- **Não houve teste end-to-end com sessão real de administrador, gravações ou permissões do Supabase.** Na homologação publicada, verifique abertura da janela e persistência de uma alteração de preço autorizada.

## Publicação
Extrair o ZIP completo e enviar os arquivos para a raiz do repositório, mantendo `index.html`, `app.js`, `backend.js`, `logic.js`, `rc7-ui.js`, `styles.css` e a pasta `assets/` na mesma hierarquia. Aguardar GitHub Actions e atualizar a página com Ctrl+Shift+R. **Não executar `backend_rc7.sql`** indiscriminadamente.
