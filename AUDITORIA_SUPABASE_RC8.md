# D&D Braids Beauty — auditoria do Supabase real e compatibilidade RC8

Data: 12 de outubro de 2026. Projeto confirmado: `ddbraids` (`bbhpzorzjtryjxnugtme`).

## Escopo e limites

Consulta direta ao projeto Supabase real, inventário de tabelas, migrações, políticas RLS, funções RPC, avisos de segurança e compatibilidade do pacote RC8. A conexão `list_projects` trouxe zero projetos porque `list_organizations` mostrou outra organização; `get_project` por referência explícita e os demais comandos funcionaram. Não foi examinada nenhuma senha, PIN ou chave privada; o banco não foi povoado com registros fictícios.

O banco possui **38 tabelas no schema public**, todas com RLS habilitado. As tabelas de agendamentos, materiais e pagamentos estavam sem registros na ocasião desta consulta; isso não prova que nenhum registro exista em outros esquemas, Auth ou Storage. Não há Edge Functions listadas. Há dezenas de migrações históricas, que não devem ser apagadas nem reexecutadas.

## Mudanças realmente aplicadas no Supabase

1. `internal_operators.slug='karol'`: `is_active=false`. Cadastro preservado para eventual auditoria/histórico, sem apagar usuário de autenticação, profissional ou registro financeiro. Dany e Débora foram confirmadas ativas após o ajuste.
2. Migração `20261012165741_preserve_material_variant_ids_on_edit`: a RPC `admin_save_material` foi refatorada para reutilizar variantes existentes de mesmo material/cor/tamanho, em vez de desativar e recriar IDs a cada edição. Evita perder vínculo com preços por variante; assinatura da RPC mantida. Supabase confirmou sucesso e a existência da nova implementação.

**Não** foram aplicadas as tabelas/RPCs da expansão RC7/RC8, nem alteradas políticas RLS ou índices existentes.

## Incompatibilidades comprovadas no SQL da RC8 anterior

- Usava `public.services` ao calcular sinal após desconto; a tabela correta é `public.catalog_services`.
- A função nova para verificar a titularidade do agendamento buscava colunas `client_user_id`/`user_id` inexistentes no agendamento; a coluna real é `public.appointments.client_id`.
- Inclusão administrativa na lista de espera buscava os mesmos nomes incorretos de proprietário.
- A integração RC8 enviava `p_consent_accepted=true` fixo ao servidor, mesmo tendo estado real da checkbox. A cópia revisada passa `booking.consentAccepted` e exige aceitação no adaptador e na futura RPC.
- Quando desconto por material próprio reduzisse o sinal a zero, o status do agendamento e a tarefa de cobrança poderiam ficar inconsistentes. O SQL revisado sincroniza esses estados.
- Conversão de sinal em crédito na proposta ainda não concilia de forma segura com o estado legado `deposit_status='refund_pending'` e a RPC `record_refund` já existente; há risco de dupla destinação financeira se aplicada como estava. **Bloqueador: não aplicar a migração antes da revisão financeira completa.**

Estas correções de contrato estão no `backend_rc7.sql` **revisado para análise, ainda NÃO executado**. Não representam aprovação de uso do SQL em produção.

## Auditoria de segurança e manutenção

- Todos os objetos públicos listados possuem RLS. Isso é positivo, mas não é teste de autorização adversarial e não substitui verificação funcional com contas distintas.
- Supabase Security Advisors: avisos de funções `SECURITY DEFINER` acessíveis a `anon` ou `authenticated`. Muitas são RPCs intencionalmente públicas e fazem checks internos; não revogar em massa sem análise individual. A função `is_admin()` consulta a tabela de contas administrativas.
- Aviso de proteção contra senhas vazadas: configurar no painel Auth do Supabase, mediante avaliação da operação e disponibilidade do recurso.
- Performance Advisors: **37 índices ainda sem uso observado**; inclusive existe índice de exclusão que protege contra sobreposição de agendamentos confirmados. Não remover em massa. **20 combinações de políticas permissivas** podem ser otimizadas no futuro, mas não devem ser consolidadas sem testes de RLS.
- A RPC antiga `admin_save_material` recriava todas as variantes e já foi corrigida no banco real.
- Revisar workflows de crédito, saldo, estorno e liberação de sinal antes de dar permissão de escrita à carteira.
- Não foi configurado agendamento automático do SILBD; nenhuma limpeza destrutiva foi executada.

## Testes da cópia revisada

- 13 testes unitários passaram.
- 1692 verificações de regras passaram.
- Compilação e inspeção dos assets reais passaram.
- Chromium HTTP: 375 px (claro), 768 px (claro) e 1440 px (escuro) passaram.
- Sintaxe JS verificada nos arquivos principais.
- Verificações estáticas confirmaram tabela, ownership, consentimento e coerência de status no SQL revisado.

Esses testes **não são testes ponta a ponta no Supabase** e não validam o SQL de expansão no banco ativo.

## Pendências de homologação

1. Decidir e validar a conciliação de crédito em carteira versus reembolso existente; impedir formalmente devolução dupla.
2. Executar em staging a migração RC7/RC8 revisada, com testes usando cliente A, cliente B e admin, inclusive tentativa de acesso indevido.
3. Testar idempotência dos agendamentos, política de consentimento, duração e disponibilidade no lado do banco.
4. Confirmar no dashboard se a conta conectada tem papel Owner na organização do projeto; a conexão está enumerando outra organização.
5. Testar os fluxos completos de recuperação de e-mail, remarcação, Pix, perfil capilar e notificações com contas de teste.
6. Só depois de homologado, aplicar a migração e publicar o front-end correspondente.

## Instrução importante de implantação

O pacote revisado da RC8 é **para homologação**, não substitui automaticamente a versão hospedada. A mudança na RPC `admin_save_material` já foi feita no banco real; não execute o `backend_rc7.sql` sem resolver as pendências financeiras e conferir todo o SQL em staging.

## Atualização posterior: proteção de reembolso aplicada no Supabase (12/10/2026)
A pendência específica de destinação dupla Pix/crédito foi corrigida **no banco real**, após a redação inicial deste relatório. Migrações: `20261012171539_lock_deposit_destination_and_prevent_duplicate_refunds` e `20261012171922_lock_allocated_deposit_and_refund_payments`. O relatório `FINANCEIRO_SEGURO_RC8.md` descreve provas e limitações. A expansão completa segue pendente.
