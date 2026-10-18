# D&D Braids — transição para devoluções apenas via PIX

**Não publicar o frontend isoladamente.** O backend ainda aceita a rota antiga até que a migration no Supabase tenha sido aplicada.

## Ordem de implantação

1. Fazer backup do banco de produção e verificar se há saldos antigos positivos em `ddb_wallet_ledger` (por cliente).
2. Verificar solicitações de devolução já existentes, inclusive conversões antigas, e como os valores serão regularizados por Pix.
3. Em ambiente de testes, aplicar `supabase/migrations/20261018_disable_new_wallet_credit_grants.sql`.
4. Testar: pedido de Pix funciona; tentativa de `p_destination='credit'` é rejeitada; novo crédito positivo no ledger é rejeitado; reembolso duplicado é rejeitado; histórico antigo permanece íntegro.
5. Confirmar caminho seguro para devolver os saldos antigos ainda positivos (não há fluxo de saque pronto nesta alteração).
6. Após passar nos testes e verificar obrigações anteriores, aplicar a migration no banco de produção e só então publicar a nova versão do frontend.

## Escopo desta alteração
- Portal Cliente: PIX como único destino para novas devoluções; nenhuma opção de carteira ou reutilização de créditos.
- Saldos antigos positivos: exibidos apenas como valores pendentes de regularização e mantidos no banco.
- Admin: devoluções Pix e histórico preservados; alerta se houver saldo antigo positivo.
- Proteção adicional no adaptador de frontend, complementada por proteção server-side na migration.
- Nenhum pagamento é feito automaticamente; todos os Pix exigem transferência manual.

## Fora de escopo
- Fusão de módulos e notificações, ainda em definição.
- Descontos de materiais: regras distintas dos antigos créditos da carteira.
- Novas rotinas de saque de saldos históricos; exigem validação dos dados reais de produção.

## Rollback
Frontend pode voltar ao commit anterior. **Não retirar os bloqueios de concessão por engano**; qualquer reversão do banco requer decisão financeira explícita e revisão de registros.
