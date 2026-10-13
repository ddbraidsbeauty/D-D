# Status de integração — RC7
Código da RC6 preservado como base, com correções e extensão.

- Cálculos de preço, variação, escolha de materiais e exibição foram exercitados em mock.
- Fluxos do portal e painel possuem RPCs preparadas no `backend_rc7.sql` (sem execução real).
- Login e confirmações RC6 permanecem, porém o teste real de recuperação permanece pendente.
- Reembolso Pix tem formulário e proposta de integração; crédito no checkout **não** está habilitado.
- SILBD executa apenas housekeeping se a RPC for instalada e acionada.
- O status desta versão é **HOMOLOGAÇÃO**. Publicação em produção bloqueada até completar `PRODUCTION-CHECKLIST.md`.

### Atualização Supabase real (12/10/2026)
- Estruturas `ddb_refund_requests`, `ddb_wallet_ledger`, `ddb_notifications` e proteção por gatilho foram instaladas.
- Cliente pode selecionar destino único Pix/crédito pela RPC; no Pix a transferência é manual e a confirmação administrativa registra pagamento e notificação de forma atômica.
- Testes com fixtures e ROLLBACK passaram. Não equivale a teste ponta a ponta da interface publicada.
- Restante da RC8, remarcações, lista de espera, checkout com créditos e integração financeira geral continuam pendentes.

## Materiais (12/10/2026)

A migração isolada `enable_atomic_material_catalog_without_rc7_activation` foi aplicada ao Supabase. O admin agora pode salvar material/variações/quantidades atomicamente após publicar a atualização do front-end, e definir preços por profissional. **Isso não habilita a RC7 de agendamento completo nem lista de espera**. Consulte `CORRECAO_MATERIAIS_RC8_2026-10-12.md`.
