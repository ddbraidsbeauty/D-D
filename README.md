# D&D Braids Beauty — versão 3.0.0 (prévia para homologação)

Site estático responsivo em HTML/CSS/JavaScript com Supabase como backend e GitHub Pages como hospedagem.

**Antes de publicar, leia `LEIA_PRIMEIRO_DD_3.0.0.md`.** A migração de backend pendente precisa ser aprovada e aplicada antes deste front-end.

## Arquivos de publicação

- `index.html`, `app.js`, `backend.js`, `logic.js`, `rc7-ui.js`, `styles.css`, `CNAME`
- Pasta `assets/` com imagens do catálogo e `assets/hair-patterns/` (12 classificações capilares)
- A publicação permanece com o workflow GitHub Pages existente `.github/workflows/static.yml` no repositório. Não substitua nem exclua o workflow em funcionamento.

## Fontes e manutenção

- `src/*.js` → geram `app.js`, usando `python tools/build.py`
- `styles/*.css` → geram `styles.css`, usando o mesmo build
- `tests/` → testes locais com Playwright e mocks de Supabase; não fazem alterações em produção
- `email_templates/reset_password.html` e `email_templates/password_changed.html` → modelos para Reset Password e Password changed (este requer notificação de segurança habilitada no Supabase)
- `migrations_pending_review/` → SQL pendente de revisão e autorização, **não executado**

## Situação de homologação

As alterações desta prévia passaram por testes locais automatizados. Não foram publicadas e não foram validadas em produção com links de recuperação reais. O fluxo de cadastro/redirect já estava validado em produção na RC8 anterior e deve ser retestado depois da publicação da v3.
