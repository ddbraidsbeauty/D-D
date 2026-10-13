# RC8 — Retorno da confirmação de e-mail sem perder o agendamento

## Diagnóstico da versão anterior

- O retorno do Supabase podia chegar antes de a busca do catálogo terminar. A recuperação tentava inferir a etapa com a lista ainda incompleta e rebaixava o índice salvo.
- O único rascunho anterior ficava em `localStorage`, que não é compartilhado entre domínios nem entre navegadores. Isso era particularmente relevante na troca do `*.github.io` para `ddbraids.com.br` e em links abertos pelo aplicativo de e-mail.
- O rascunho era removido cedo demais, antes de a solicitação ser enviada.

## Correção

- A recuperação agora aguarda o catálogo real estar carregado antes de calcular as etapas.
- A etapa é salva por identificador semântico (`date`, `client`, etc.), com compatibilidade para rascunhos antigos que só contêm o índice.
- As escolhas não sensíveis (procedimento, método, variação, opções, profissional, data e hora, materiais) são copiadas para os metadados de cadastro do Supabase; podem ser retomadas em outra aba/navegador após a confirmação por e-mail.
- O armazenamento local no navegador oficial mantém uma cópia até a solicitação ser enviada, para suportar recarregamentos.
- Depois da recuperação, o rascunho remoto é limpo dos metadados da conta em uma operação de melhor esforço.
- O estado da anamnese, notas livres, imagens, aceite do consentimento, dados financeiros e telefone **não** são incluídos no rascunho. São coletados após a autenticação, ou solicitados novamente quando necessário.
- O link `emailRedirectTo` usa a raiz do domínio atual, sem adicionar `#booking` ao fragmento que o Supabase controla.

## Configuração necessária no painel Supabase

Em **Authentication → URL Configuration**:

- **Site URL**: `https://ddbraids.com.br/`
- **Redirect URLs**: permitir explicitamente `https://ddbraids.com.br/`.
- Não use `http` no site definitivo. Mantenha endereços antigos apenas se necessários para testes legados e com acesso controlado.

**Importante**: as mudanças de URL são feitas no painel do Supabase pelo administrador; o código não as altera.

## Teste de homologação real

1. Publicar este ZIP completo no GitHub; conferir que o navegador recebeu `app.js` e `backend.js` atualizados.
2. Iniciar um novo agendamento diretamente em `https://ddbraids.com.br/`, ainda sem sessão autenticada, com uma conta/e-mail novo.
3. Escolher procedimento, variação, profissional e horário; ao solicitar login no avanço da etapa de Data, cadastrar conta nova.
4. Abrir o link de confirmação no mesmo navegador e, em segundo teste, em outro navegador/aparelho.
5. A página deve voltar para `https://ddbraids.com.br/#booking`, com as escolhas restauradas e sem retornar à Etapa 1. Se a confirmação ocorreu antes de preencher informações sensíveis, a próxima etapa seguirá normalmente. Se não, as informações sensíveis terão de ser preenchidas novamente.
6. Validar que envio final cria somente **uma** solicitação, não duplica registros e não ignora as verificações de preço/horário.

O código anterior não colocava o rascunho nos metadados da conta. Portanto, links enviados com versões antigas não poderão recuperar rascunhos criados em outro navegador; use um novo cadastro para testar esta correção.

## Validação local

- `tests/test_email_redirect_restore.py`: 12 cenários de recuperação (375, 768 e 1440 px; mesmo navegador ou outro navegador; retomada na etapa Data ou no preenchimento do cliente) + casos sem sessão e assinatura de cadastro.
- Testes anteriores de cadastro, portal, catálogo, módulos admin, lógica e build devem continuar passando.
- Testes realizados com Supabase simulado; **a confirmação real com Resend não foi executada daqui**.

## Sem alteração no banco

Esta revisão não cria tabelas, não executa migrações, não altera agendamentos nem pagamentos existentes. Não execute `backend_rc7.sql` para corrigir o redirect.
