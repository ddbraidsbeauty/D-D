# D&D Braids Beauty — versão 3.0.0 (prévia para homologação)

Site estático responsivo em HTML/CSS/JavaScript com Supabase como backend e GitHub Pages como hospedagem.

**Antes de publicar, leia `LEIA_PRIMEIRO_DD_3.0.0.md`.** As duas correções de backend da v3.0.0 já foram aplicadas no Supabase mediante autorização e conferidas. Não reaplicar as migrações.

## Arquivos de publicação

- `index.html`, `app.js`, `backend.js`, `logic.js`, `rc7-ui.js`, `styles.css`, `CNAME`
- Pasta `assets/` com imagens do catálogo e `assets/hair-patterns/` (12 classificações capilares)
- A publicação permanece com o workflow GitHub Pages existente `.github/workflows/static.yml` no repositório. Não substitua nem exclua o workflow em funcionamento.

## Fontes e manutenção

- `src/*.js` → geram `app.js`, usando `python tools/build.py`
- `styles/*.css` → geram `styles.css`, usando o mesmo build
- `tests/` → testes locais com Playwright e mocks de Supabase; não fazem alterações em produção
- `email_templates/reset_password.html` e `email_templates/password_changed.html` → modelos para Reset Password e Password changed (este requer notificação de segurança habilitada no Supabase)
- `migrations_applied_for_reference/` → histórico de SQL já aplicado e conferido no Supabase; não executar novamente
- `migrations_pending_review/` → possível arquivo histórico ainda não reclassificado; o ajuste de material próprio de 13/10 já foi aplicado e não precisa ser executado

## Situação de homologação

As alterações desta prévia passaram por testes locais automatizados em 375, 768 e 1440 px, com Supabase simulado. O front-end v3 não foi publicado na `main` e ainda não foi validado com links reais de recuperação. O fluxo de cadastro/redirect já estava validado em produção na RC8 anterior e deve ser retestado depois da publicação da v3.
