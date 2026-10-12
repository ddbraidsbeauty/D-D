# D&D Braids Beauty — RC8 (REFATORAÇÃO / HOMOLOGAÇÃO, NÃO PUBLICAR AINDA)

Esta RC8 preserva os recursos da RC7, construída sobre a RC6 recebida. **A expansão integral ainda NÃO foi aplicada ao Supabase real.** A proteção isolada de reembolso Pix versus crédito foi aplicada e testada com transações revertidas; pagamentos reais e a interface completa ainda não foram homologados. O pacote é para revisão e homologação. Preserva o layout/tema e a estrutura principal do site.

## Organização da RC8
- **Código-fonte editável:** `src/*.js` (9 módulos ordenados por responsabilidade) e `styles/*.css` (6 seções de CSS).
- **Arquivos compilados para GitHub Pages:** `app.js` e `styles.css`. Não editá-los manualmente; recriar com `python tools/build.py`.
- **Imagens locais:** `assets/demo/*.jpg` (13 arquivos). São necessários na publicação.
- **Relatório desta limpeza:** `CHANGELOG_RC8.md`.
- **Testes adicionais:** `tests/test_source_contract.py` e `tests/test_http_browser.py`.

## Arquivos
- `index.html`, `styles.css`, `app.js`: interface pública e administrativa.
- `backend.js`: adaptador Supabase já existente com RPCs RC7.
- `logic.js`: cálculos de preço/materiais, filtro da lista e validação de chave Pix, sem dependências.
- `rc7-ui.js`: seções adicionais no portal da cliente e na aba Pendências.
- `backend_rc7.sql`: proposta da expansão restante, com as proteções financeiras já aplicadas ao banco; **NÃO executar integralmente sem homologação**.
- `tests_logic.js`, `tests_extended.js`, `tests_browser.py`: testes locais / simulação em Chromium.
- `TEST_REPORT_RC7.md`: resultados, pendências e lista de aceite.
- `PRODUCTION-CHECKLIST.md`: validações finais de implantação.

## Execução local
Abrir `index.html` através de um servidor HTTP local. O site integrado precisa da conexão Supabase já configurada no `backend.js`. Em caso de erro de conexão o app não substitui dados reais por clientes falsos.

Testes offline de regras: `node tests_logic.js && node tests_extended.js`. Testar a limpeza: `python tests/test_source_contract.py && python tests/test_http_browser.py`.

Teste visual automatizado: `python tests_browser.py` (precisa do Playwright Python e Chromium); injeta um Supabase **simulado**, não escreve no banco real.

## Banco de dados
O Supabase `ddbraids` foi acessado diretamente e seu esquema real verificado. As migrações de proteção de Pix versus crédito e de imutabilidade de pagamentos destinados foram aplicadas isoladamente; o restante da expansão (`backend_rc7.sql`) permanece **pendente de homologação e NÃO deve ser executado integralmente em produção agora**. Evite reaplicar os patches já registrados no histórico de migrações.

## Avisos importantes
- Regra de material próprio: todos os materiais ou nenhum, seleção de variante e desconto por pacote configurado para a profissional, com quantidade da variação.
- Reembolsos Pix: a cliente informa a chave no portal; transferência manual; status e aviso no portal. WhatsApp totalmente automático exige API adequada; sem ela há apenas texto/link para envio manual.
- Créditos: há tabela de histórico e visualização do saldo, mas **a aplicação do crédito em um pagamento não foi habilitada**, por depender da reconciliação financeira com a conta única e os mecanismos de pagamento existentes. Não tratar como implementado.
- Remarcação: aceite de proposta por cliente fica pendente de confirmação administrativa; o sistema não move outro agendamento automaticamente.
- A RC6 tinha recuperação de confirmação de e-mail; a correção foi preservada, mas não foi validada de ponta a ponta no site publicado.
- SILBD: apenas housekeeping conservador opcional para propostas expiradas. Sem cron ativado, sem apagar histórico financeiro.

## Auditoria Supabase de 12/10/2026
Acesso direto ao projeto real confirmou 38 tabelas públicas com RLS. Corrigidos no banco: desativação conservadora da operadora Karol e preservação de IDs de variantes ao editar material. Leia `AUDITORIA_SUPABASE_RC8.md` antes de implantar. O arquivo `backend_rc7.sql` foi alinhado a campos reais e à passagem do consentimento, mas **ainda não deve ser aplicado integralmente**: a proteção Pix/crédito foi corrigida e aplicada separadamente, enquanto as demais funcionalidades seguem aguardando homologação.

## Proteção financeira aplicada em 12/10/2026
Migrações confirmadas no Supabase: `lock_deposit_destination_and_prevent_duplicate_refunds` e `lock_allocated_deposit_and_refund_payments`. Os testes de crédito, Pix, duplicação, acesso por outra conta, saldo efetivamente pago, notificação e tentativa de alteração/exclusão dos depósitos passaram **numa transação com ROLLBACK**. Não foram efetuados Pix nem criados agendamentos ou pagamentos reais. Consulte `FINANCEIRO_SEGURO_RC8.md`. O consumo parcial de créditos **ainda não foi implementado**.
