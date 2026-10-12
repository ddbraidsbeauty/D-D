# D&D Braids — Auditoria e testes RC7

## Visão executiva
**Situação: candidata a homologação, NÃO aprovada para publicação.** Foi feita uma revisão funcional e diversas correções locais sobre a RC6, mas não há conexão ao Supabase ativo, credenciais de contas de teste, nem acesso para alterar o GitHub Pages. Portanto, não foi possível comprovar RLS, transações, entrega real de mensagens ou aceite por Dany e Débora. O SQL proposto precisa primeiro ser confrontado com o schema real.

## Alterações realizadas
| Área | Implementação nesta RC7 | Status |
|---|---|---|
| Catálogo/preços | preço da variação prevalece sobre método/procedimento | Código local/testado |
| Materiais | variação cor/tamanho para cada item, quantidade por escopo, regra todos/nenhum | Front implementado/testado com mocks; migração pendente |
| Desconto | preço profissional por pacote × quantidade, soma e sinal final | Testes locais aprovados; cálculo servidor depende do SQL |
| Painel material | editor de quantidade em cada procedimento/método/variação; preço unitário por profissional em Pendências | Interface implementada; escrita real não testada |
| Agendamentos | nova RPC transacional proposta, idempotência por chave de solicitação | Não verificado em banco real |
| Anamnese | envia química detalhada, problemas e observações; prepara gravação na mesma transação | Mapeamento frontend corrigido; RPC de produção não conferida |
| Conta da cliente | lista de espera, propostas, solicitações Pix ou crédito, notificações, saldo | Simulado localmente; backend pendente |
| Fila | entrada a partir do agendamento, antiguidade, duração original, proposta, resposta | Lógica/UI testadas; operações servidor não testadas |
| Imprevisto | bloqueio manual legado + adicionar atendimento afetado à fila | Parcial; associação automática de vários afetados pendente |
| Reembolso | Pix informado pela cliente, conclusão manual em Pendências, aviso configurável | SQL/RPC preparados; operação real não testada |
| Créditos | razão contábil para origem em sinal reembolsável | Visualização preparada; **uso parcial e repasses entre profissionais pendentes** |
| Financeiro | corrigido subtotal débito/crédito e mapeamento de datas de pagamentos/reembolsos | Correção estática; pendente com dados reais |
| Segurança | não grava estado de admin/anamnese no localStorage; rascunho de signup exclui dados capilares e imagens | Revisão estática / browser simulado |
| Comunicação | mensagem de reembolso concluído configurável, aviso no portal; oferta gera texto para cópia e envio manual no WhatsApp, sem alegar envio automático | WhatsApp automático externo NÃO implantado |
| SILBD | operação segura opcional de expiração de propostas, sem deletes | SQL não aplicado/não agendado |
| Design | preservadas fontes, tons e componentes D&D; cartões e resumos refinados | Chromium simulado em 375px; não dispositivo real |

## Execuções verificadas
- `node --check` para `app.js`, `backend.js`, `logic.js`, `rc7-ui.js`: sem erros de sintaxe.
- `tests_logic.js`: 13 cenários unitários concluídos.
- `tests_extended.js`: 1692 verificações determinísticas concluídas, com valores monetários, herança de escopos e tempos da fila.
- `tests_browser.py`: em Chromium headless, carregamento da home, seleção de método/variação/profissional, materiais em 375px, cálculo de preço (R$280 → R$196, sinal R$19,60), portal e filtro da fila; sem erros JS de página nos cenários executados. **Supabase mockado**.
- Revisão final: corrigido desaparecimento do atalho WhatsApp após atualização da tela; agora o texto é exibido para cópia/envio manual. Validado novamente: 13 testes unitários, 1692 verificações determinísticas e fluxo de navegador sem erros JS.

## Casos críticos que não podem ser declarados aprovados
1. **Schema, RPCs e RLS reais:** a migração não foi compilada nem executada contra PostgreSQL; conferir nomes, tipos, políticas, assinatura de funções e ownership do usuário.
2. **Idempotência e transações:** confirmar com concorrência real e erro intencional de anamnese que a V7 não cria pedidos duplicados/parciais.
3. **Preço do catálogo vs total gerado por V3:** assegurar que o servidor não desconta o material duas vezes e usa o preço correto de método/variação, sinal fixo/% e acessórios.
4. **Compatibilidade das variantes existentes:** confirmar se `admin_save_material` preserva IDs ao editar cor/tamanho; eventual substituição pode invalidar preços ligados à variante.
5. **Conflitos de agenda:** testar disponibilidade, Débora uma cliente por dia, propostas aceitas por duas clientes, bloqueios, domingo e manutenção de dia inteiro.
6. **Créditos em novas compras:** falta finalizar o fluxo contábil de aplicação parcial e repasse entre profissionais sem dupla contagem. A RC7 deixa essa ação desabilitada.
7. **Reembolsos:** validar `record_refund` com a solicitação Pix e seu status; a origem de crédito precisa reconciliar a pendência no financeiro legado.
8. **Consentimento e anamnese:** conferir gravação JSON de todos os campos e leitura autorizada de arquivos privados.
9. **Auth RC6:** testar confirmação por e-mail em outra aba, retorno à etapa, segundo dispositivo, reset de senha e novo cadastro.
10. **WhatsApp:** link é manual; não há confirmação automática de envio/entrega; não marcar como enviado por simplesmente abrir um link.
11. **Operadoras:** confirmar no banco Dany e Débora, desativando qualquer operador que não faça mais parte da D&D.
12. **Teste humano em Android/iPhone:** teclado, scroll de modal, legibilidade, acessibilidade, fotos e valores reais.

## O que precisa de você (somente quando for executar a homologação)
- Dar acesso ao Supabase correto (ou exportar **somente o schema**, sem senhas/dados pessoais) para confrontar as migrations e as políticas.
- Disponibilizar um ambiente de teste separado ou autorizar o roteiro controlado com backup.
- Confirmar com Dany e Débora a regra prática de repasse/compensação ao consumir crédito de outra profissional, antes de habilitar essa função.
- Fazer o teste de confirmação de e-mail RC6 e o aceite dos fluxos em celulares reais.

## Declaração de limite
**A RC7 é uma entrega de engenharia e homologação local, não um release certificado como 100% funcional.** Não foi alterado o projeto ativo, não foram realizadas transferências e nenhuma migração foi aplicada.
