# Checklist de produção

- [ ] Configurar/confirmar PIN de Dany e Débora
- [ ] Configurar/confirmar PIX e WhatsApp das profissionais
- [ ] Conferir horários reais de cada profissional
- [ ] Conferir preços, durações internas e sinais
- [ ] Revisar texto do consentimento padrão no Admin
- [ ] Conferir fotos e imagens do catálogo
- [ ] Testar cadastro/login/recuperação de senha de cliente
- [ ] Testar agendamento normal e manutenção
- [ ] Testar não recomendação -> link -> aceite -> aviso no Admin
- [ ] Testar cancelamento/reembolso
- [ ] Testar remarcação via WhatsApp + alteração no Admin
- [ ] Testar pagamento e histórico financeiro
- [ ] Testar desktop e celular
- [ ] Ativar proteção contra senhas vazadas no Supabase Auth, se disponível
- [ ] Publicar no GitHub Pages somente após o teste final

## RC7 (não publicar sem validar)
- [ ] Confirmar esquema real do Supabase, assinaturas de RPC e colunas de propriedade da cliente
- [ ] Aplicar backend_rc7.sql primeiro em homologação, fazer backup e validar RLS
- [ ] Confirmar que a regra de sinal fixo/% no banco é compatível com desconto de material próprio
- [ ] Testar duas clientes aceitando horário concorrentemente; última confirmação sempre via RPC protegida
- [ ] Testar devolução via Pix (manual) → aviso no portal e modelo WhatsApp configurável
- [ ] Testar saldo em créditos e reconciliar com financeiro antes de liberar consumo
- [ ] Revalidar cadastro/retomada de agendamento (RC6), inclusive duas abas e e-mail
- [ ] Confirmar que Dany e Débora são as únicas operadoras elegíveis
- [ ] Realizar testes reais em dispositivos móveis com contas de homologação

## Correção financeira aplicada e limites
- [x] Impedir que sinal convertido em crédito seja também devolvido via Pix, inclusive pelo RPC legado `record_refund`.
- [x] Impedir reembolso maior que o depósito realmente pago e barrar a alteração/exclusão de depósitos já destinados.
- [x] Validar fluxo Pix, crédito, aviso e duplicidade com transação revertida no banco ativo.
- [ ] Testar o mesmo fluxo com sessões/usuários reais via front-end publicado.
- [ ] Homologar utilização parcial de créditos em novos atendimentos (não habilitada).
- [ ] Homologar restante de `backend_rc7.sql` (NÃO aplicar integralmente agora).
