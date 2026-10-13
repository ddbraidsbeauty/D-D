# D&D Braids Beauty — v3.0.0 (prévia para revisão/homologação)

**Status:** pacote gerado e testado localmente com Supabase simulado. **Código em revisão na branch de desenvolvimento; a migração das duas RPCs já foi aplicada ao Supabase com autorização.** O site publicado continua como estava.

## O que mudou

- Anamnese: 12 cartões visuais 1A a 4C com a arte dourada aprovada, em 3 colunas no desktop e 2 no celular; seleção única por radio; o `hair_type` é derivado do padrão escolhido. Os arquivos `.webp` estão em `assets/hair-patterns/`.
- Portal Cliente: botão **Alterar senha**; exige senha atual, nova senha e confirmação, valida erro de senha atual, e usa Supabase Auth.
- Login: **Esqueci a senha** envia mensagem pelo Resend via Supabase Auth. O link, após autenticação de recuperação, abre `#reset-password` com formulário de nova senha e confirmação; o evento `PASSWORD_RECOVERY` não deve restaurar o fluxo de agendamento. Link inválido pede novo processo.
- Anamnese incompleta: preservada a correção anterior, que só ativa o salvamento atômico depois da migração no banco. Cliente pode completar **a solicitação existente** e manter o sinal pago.
- Templates em tema claro/escuro: **Reset Password** em `email_templates/reset_password.html` e **Password changed** em `email_templates/password_changed.html`, cada um com seu assunto correspondente.

## ORDEM DE PUBLICAÇÃO (atenção!)

1. **Migração já instalada com autorização e conferida no Supabase.** Arquivo de referência: `migrations_applied_for_reference/20261013_atomic_booking_hair_repair.sql`. Ela cria uma tabela de chaves de envio e as RPCs `ddb_submit_booking_atomic_v1` e `ddb_complete_missing_hair_profile_v1`. **Não executar `backend_rc7.sql`** (script histórico amplo, incompatível com o schema real).
2. Supabase Dashboard → Authentication → Emails → Templates → **Reset Password**. Colar o assunto e o HTML dos arquivos `email_templates/` (sem alterar o template **Confirm sign up** já aprovado). Salvar. O e-mail sai pelo SMTP do Resend já configurado. Mantenha `{{ .ConfirmationURL }}` inalterado.
3. Em **Authentication → Emails → Templates / Security notifications**, configure também o template **Password changed** (`email_templates/password_changed.html`) e seu assunto; **habilite o envio dessa notificação de segurança** no projeto. Ela não é enviada se estiver desativada. O template não precisa de `{{ .ConfirmationURL }}`.
4. Verificar Authentication → URL Configuration: `Site URL: https://ddbraids.com.br/` e Redirect URLs permitindo `https://ddbraids.com.br/` (caminho usado pelo link de recuperação). Não trocar as URLs confirmadas sem necessidade.
5. **Somente depois da migração instalada**, publicar os arquivos no repositório existente via GitHub Desktop (commit + push). Manter a pasta `.git` e o workflow **`.github/workflows/static.yml`** já funcionando no GitHub, caso não exista no ZIP; manter `CNAME` como `ddbraids.com.br`.
6. Verificar GitHub Actions (verde), abrir site HTTPS com refresh sem cache e testar: recuperar senha no mesmo e em outro dispositivo; digitar senha nova; login; alterar senha com senha atual correta/incorreta; cadastro + e-mail de confirmação + retomada do agendamento; anamnese em celular, tablet e desktop; completar a ficha pendente de um atendimento já pago sem recriar agendamento ou cobrança.

## Limitações / observações

- **Testes locais não equivalem a testes reais com Supabase Auth/Resend.** O template deve ser verificado em Gmail e iPhone; aplicativos podem forçar cores próprias no dark mode.
- A mudança de senha com senha atual valida a senha a senha antiga no próprio `auth.updateUser({ password, current_password })` (método suportado no supabase-js v2.102+). Não faz segundo login nem guarda a senha em armazenamento. A versão `@supabase/supabase-js@2` é carregada via CDN e deve estar em versão compatível; é necessário confirmar o funcionamento no site publicado.
- O cadastro e recuperação do rascunho já funcionaram em produção antes desta mudança; é importante confirmar que continuam sem regressão depois do deploy.
- A opção "Não sei identificar" foi **adiada**: o banco atualmente exige um dos 12 códigos. A cliente pode escolher o padrão mais próximo e a profissional revisará a classificação. Não envia valor inválido silenciosamente.
- A foto de referência/anamnese não é armazenada no rascunho do navegador.
- A solicitação de 13/10/2026 com pagamento de sinal e ficha pendente **é exclusivamente de teste e deve permanecer até a limpeza final autorizada** por este procedimento.
- Módulos avançados de carteira, espera/remarcação e demais funcionalidades não foram homologados nesta atualização.

## Estrutura mínima de publicação

`index.html`, `app.js`, `backend.js`, `logic.js`, `rc7-ui.js`, `styles.css`, pasta `assets/`, arquivo `CNAME` na raiz. Os fontes em `src/`, `styles/` e testes são para manutenção. O workflow GitHub Actions existente continua válido.
