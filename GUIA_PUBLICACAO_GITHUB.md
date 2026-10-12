# Publicação da D&D Braids Beauty — RC8 (homologação)

Este ZIP é o pacote completo mais recente, incluindo correções de imagens, preços, portal da cliente, logout e cadastro.

## Para publicar no GitHub

1. **Não precisa excluir o repositório antigo**. Pode substituir os arquivos da raiz por estes, preservando nome, histórico e configurações. Se optar por recriar, precisará habilitar o GitHub Pages novamente.
2. Extraia o ZIP no computador. **Não envie o ZIP diretamente**: envie os arquivos e as pastas do conteúdo extraído para a **raiz** do repositório.
3. Confira que `index.html`, `app.js`, `backend.js`, `logic.js`, `rc7-ui.js`, `styles.css` e `assets/` estão na raiz. Não coloque uma pasta extra envolvendo tudo.
4. Se estiver criando um repositório novo, use `D-D-Braids-Beauty` no perfil `ddbraidsbeauty` para preservar o endereço; em Settings → Pages selecione GitHub Actions → Static HTML, configure e confirme.
5. Aguarde a publicação em Actions e recarregue usando Ctrl + Shift + R.

## O que está incluso

- Site para GitHub Pages: os arquivos citados acima, incluindo 13 imagens `assets/demo/`.
- Fontes de manutenção: `src/`, `styles/`, `tools/`, `tests/` e relatórios.
- Scripts SQL **somente para referência**: `backend_rc7.sql` e `migrations_applied_for_reference/`. **NÃO execute o SQL completo em produção**: há estruturas já aplicadas e partes que ainda não foram homologadas.

## Atenção

Esta versão continua em **homologação**. A proteção de reembolso duplicado já foi aplicada no Supabase real, mas os demais recursos novos, a carteira de créditos em novos pagamentos e os fluxos completos de remarcação/espera ainda necessitam integração e testes reais. Não use para pagamentos reais ainda.

A tela de cadastro inclui aviso condicional de e-mail já existente, a tela Minha conta permite sair da sessão e mostra as seções disponíveis individualmente. O formulário de telefone brasileiro ainda será refinado em etapa posterior (não foi incluído como correção concluída neste pacote).
