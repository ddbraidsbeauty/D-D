# D&D Braids — Auditoria transversal dos módulos RC8

**Data:** 12/10/2026  
**Escopo:** todos os 11 módulos administrativos + regressão da área pública, com foco em botões, campos, formulários, janelas de edição e integrações que parecem funcionar mas não estão ativadas.

## Resultado

A auditoria reproduziu o comportamento do código distribuído em Chromium, em resoluções **375, 768 e 1440 px**, usando um servidor Supabase simulado. Testes locais não equivalem à validação de gravações reais. **Nenhum registro do Supabase de produção foi inserido ou modificado** durante esta auditoria.

| Módulo | Verificação realizada | Resultado local |
|---|---|---|
| Visão geral | Atalhos e eventos de botões | Aprovado |
| Solicitações | Pesquisa, apresentação de solicitações e ações disponíveis | Aprovado localmente; transações não executadas em produção |
| Agendamentos | Navegação da agenda, novo agendamento, bloqueio, horários, detalhes e remarcação | Janelas respondem; gravações dependem da validação com Auth/PIN |
| Pendências | Renderização com recursos RC7 ausentes e proteção contra função inexistente no tratamento de erro | **Corrigido** — módulos indisponíveis identificados; sem botões falsamente ativos |
| Clientes | Pesquisa e perfil de atendimento | Aprovado |
| Catálogo | Novo/editar procedimento, método/variação, novo material e acessório | Aprovado localmente; materiais com quantidades RC7 ainda dependem da migração |
| Financeiro | Busca, filtros, escolha de tipo de sinal, digitação, validação e submissão simulada | **Aprimorado**; simulação confirmou chamada de `setServiceDeposit('id','fixed',38.50)` |
| Profissionais | Novo/editar, acesso ao detalhamento protegido | Janelas respondem; permissões e PIN requerem teste real |
| Criador de Posts | Alteração de modelo/título, edição de controles | Aprovado |
| Histórico | Campo de busca e navegação | Aprovado |
| Configurações | Regras gerais e templates do WhatsApp com chamadas simuladas | Aprovado localmente; persistência real não homologada |

## Problemas corrigidos nesta rodada

1. **Financeiro — valor do sinal parecia travado.** Antes, o campo `data-fee-value` ficava com `disabled` enquanto a opção "Sem sinal" estava marcada. Agora, clicar para digitar seleciona automaticamente **Valor fixo**; selecionar **Porcentagem** muda o indicador para `%`. A ação de salvar valida valor positivo e rejeita percentual superior a 100%. Também há proteção contra duplo clique enquanto salva e indicação de falha real do servidor.
2. **Pendências — erro encadeado em caso de falha de carregamento.** O tratamento de exceção chamava uma função `missing()` inexistente, gerando `ReferenceError` e ocultando a causa original. Substituído por mensagem não destrutiva.
3. **Pendências — ações para módulos RC7 não instalados.** Se a lista de espera/propostas ou a tabela de preços de materiais não estiverem disponíveis, os controles correspondentes deixam de aparecer como se estivessem funcionando; a tela explica a pendência. Área de reembolsos fica independente quando disponível.
4. **Regressão permanente:** criada bateria de cliques reais no navegador, inclusive nos editores internos, e checagem de valores ao acionar o Financeiro.

## Limitações confirmadas pelo Supabase real (somente leitura)

As operações abaixo **não existem no banco de produção atual** (sem migrá-las):

- `ddb_admin_offer_slot`
- `ddb_admin_queue_affected`
- `ddb_admin_finish_offer`
- `ddb_replace_material_quantities`
- `ddb_reply_offer`
- `ddb_save_material_price`

Também faltam as tabelas `ddb_waitlist`, `ddb_offers`, `ddb_material_prices`; as tabelas `ddb_refund_requests`, `ddb_wallet_ledger` e `ddb_notifications` existem. Portanto, a migração RC7 de remarcações e configuração avançada de materiais precisa de revisão específica de schema/permissões antes de ativar esse fluxo. **Não execute `backend_rc7.sql` diretamente** — ele não foi aplicado nem aprovado nesta auditoria.

As funções RPC de sinal `admin_set_service_deposit` e `admin_set_maintenance_deposit_policy` **existem**. A interface envia os campos corretos no teste com mock; a gravação efetiva sob uma sessão administrativa real ainda deve ser testada por uma operadora, em um procedimento de homologação.

## Regressões executadas

- 13 testes unitários de lógica.
- 1.692 verificações determinísticas da lógica de preços/materiais/lista de espera.
- Navegação e ação simulada nos 11 módulos em Chromium: 375, 768 e 1440 px.
- Clique em Novo/Editar procedimento, métodos/variações, materiais, acessórios, profissionais, clientes, agendamentos, filtros e controles de posts.
- Sinal financeiro: clicar diretamente em valor com "Sem sinal", digitar R$ 38,50, salvar chamada simulada; percentual de 120% rejeitado.
- Regressão de catálogo público, imagens, preços não cadastrados, portal, logout e formulários de cadastro.
- `python tools/build.py --check`, validação de sintaxe dos bundles com `node --check`.

## Testes ainda indispensáveis antes do uso comercial

1. Com conta admin real, configurar e salvar um sinal em um procedimento de teste e conferir que persiste após recarregar a página.
2. Testar permissões/PIN reais, agenda, pagamentos e encerramentos sem usar transações de clientes existentes como experimento.
3. Aplicar **somente depois de revisar** a migração de remarcação e quantidades/valores dos materiais, preservando as proteções financeiras já existentes.
4. Retomar a confirmação de e-mail + redirect + recuperação do rascunho do agendamento em conta de teste.

O relatório não declara homologação completa de todas as gravações nem da RC7. Ele valida a ligação dos controles e registra dependências ausentes de maneira explícita.
