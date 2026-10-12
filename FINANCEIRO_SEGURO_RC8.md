# D&D Braids — Proteção de sinal Pix versus crédito (12/10/2026)

## Resultado
**Aplicado e confirmado no Supabase real `ddbraids`**. O risco de o mesmo sinal ser devolvido via Pix e simultaneamente concedido como crédito foi tratado no banco de dados, e não apenas na interface.

### Migrações efetivamente instaladas
- `20261012171539_lock_deposit_destination_and_prevent_duplicate_refunds`
- `20261012171922_lock_allocated_deposit_and_refund_payments`

### Contrato de funcionamento
1. Cancelamento com sinal efetivamente pago e com devolução elegível -> `deposit_status=refund_pending`.
2. A cliente escolhe **uma única vez** Pix (chave informada, `status=pending`) **ou** crédito D&D (`status=credited`). O agendamento é bloqueado transacionalmente durante a escolha.
3. Conversão em crédito cria **uma** movimentação positiva na carteira (`source_ref` único) e marca o sinal `credited`, impedindo a devolução antiga.
4. Pix concluído: somente após transferência manual realizada pela profissional, a RPC administrativa grava o pagamento, marca o pedido concluído e gera uma notificação no portal **na mesma transação**. Template `refund_completed` configurável.
5. A função legada `record_refund` e um gatilho `BEFORE INSERT/UPDATE` em `payments` também fiscalizam a escolha e o total pago. Um segundo gatilho proíbe alterações/exclusões financeiras de pagamentos já alocados a Pix ou crédito.
6. As três tabelas financeiras novas possuem RLS; contas anônimas não conseguem lê-las e usuários autenticados não possuem INSERT/UPDATE/DELETE diretos.

### Testes realizados
Execução de cenários no banco real dentro de transações com `ROLLBACK`:
- Identidade de cliente diferente: impedido criar pedido sobre agendamento alheio.
- Sinal de R$ 50 convertido em crédito: uma movimentação de R$ 50, sem Pix.
- Após crédito: chamada à função antiga de reembolso foi rejeitada.
- Após crédito: INSERT direto de refund em pagamentos foi rejeitado.
- Segunda solicitação mudando crédito para Pix foi rejeitada.
- Pedido Pix: status pendente, sem crédito; pedido concorrente de crédito por fluxo sequencial foi rejeitado.
- Confirmação administrativa Pix: pedido concluído, exatamente um registro de reembolso e uma notificação no portal.
- Nova tentativa de concluir o mesmo Pix foi rejeitada.
- Sinal configurado como R$ 50 mas apenas R$ 30 pagos: crédito limitado a R$ 30.
- Atualização do depósito depois de destiná-lo foi rejeitada.
- Exclusão do depósito depois de destiná-lo foi rejeitada.
- Confirmado após os testes: zero agendamentos, pagamentos, pedidos, créditos e notificações de teste persistidos.

Os ensaios cobrem fluxo sequencial e proteção transacional; **não equivalem a teste de carga concorrente em sessões independentes, envio real de Pix nem teste end-to-end de autenticação/RLS no navegador**. É preciso homologar essas etapas antes de liberar para clientes.

### Importante
- O SQL completo `backend_rc7.sql` foi atualizado para **não reintroduzir** as funções vulneráveis numa instalação posterior, mas **a expansão completa da RC8 ainda não foi aplicada nem aprovada**.
- O saldo de crédito pode ser criado/consultado, mas seu consumo parcial em novos atendimentos permanece desabilitado até a conciliação financeira.
- A notificação automática é **dentro do portal**; envio autônomo de WhatsApp requer integração apropriada.
- Nenhum Pix foi feito e nenhuma transferência bancária foi automatizada.
- Não reexecute manualmente as duas migrações já registradas no histórico do Supabase.
