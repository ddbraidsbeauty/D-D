# D&D Braids Beauty RC8 — correções de anamnese, materiais e cartões

**Data:** 12/10/2026  
**Base:** RC8 completa (incluindo hitbox, editor de opções individuais, portal e auditoria de módulos).

## 1. Solicitações → Revisar anamnese

**Problema comprovado no Supabase:** os agendamentos reais apontam para `appointments.hair_profile_id` em `client_hair_profiles`, mas o frontend só lia e editava `anamneses` (legado), que hoje possui 0 registros. Há 2 perfis capilares existentes e ambos os agendamentos reais apontam para perfis válidos.

**Correção:** `adminSnapshot` agora carrega `client_hair_profiles`, a transformação associa a ficha pelo `hair_profile_id` do agendamento e o botão usa `ddb_admin_review_hair_profile` para perfis atuais. A tabela legada continua suportada. O editor mapeia `problems`, `frequent_heat`, `chemistry_details`, `other_problems` e `professional_notes` sem descartar esses campos. A seleção fictícia de responsável (que não era registrada) foi substituída pela informação transparente de revisão administrativa.

**Migração aplicada com sucesso:** `secure_versioned_admin_hair_profile_review`. A RPC exige `is_admin()`, tem `SECURITY DEFINER` com `search_path` restrito, é executável apenas por `authenticated` e mantém o histórico ao gerar nova versão quando a avaliação é salva. Nenhum perfil ou agendamento real foi alterado na instalação. **Ainda é necessário homologar uma gravação autenticada de revisão pelo admin no site publicado.**

## 2. Etapa de materiais, cores e fornecimento

O banco real está com **0 materiais, 0 variantes e 0 regras de quantidade**. O frontend omitia a etapa quando não havia materiais compatíveis. Agora o cliente recebe mensagem explícita na etapa de personalização, e o resumo não sugere que haja materiais configurados.

**Pendente, não inventado:** a configuração de materiais com preços por profissional/variante e quantidades, prevista na RC7, ainda depende de migrações adicionais revisadas. A tabela `ddb_material_prices` e a RPC `ddb_replace_material_quantities` não estão instaladas. O código de edição de materiais bloqueia corretamente salvar dados dependentes desse módulo enquanto ele está incompleto. **Não executar cegamente `backend_rc7.sql`; não criar cores/preços fictícios.** Depois que as regras forem configuradas pelas profissionais, a etapa de materiais será mostrada automaticamente.

## 3. Cartão da variação muito grande

Corrigida a distribuição `auto-fit` que esticava um cartão solitário por toda a linha. Agora o layout usa colunas limitadas e fotos de até 210 px de altura no desktop/tablet e 180 px no celular, preservando borda de seleção e enquadramento `object-fit:cover`.

## Testes

- Teste específico em Chromium (375, 768 e 1440 px): cartão de variação limitado, aviso de materiais ausentes e abertura/salvamento **simulado** da revisão em perfil moderno sem registro legado.
- 13 testes unitários e 1.692 verificações de lógica aprovados.
- Auditoria de interações dos 11 módulos em três larguras, testagem de cadastro, logout, portal, catálogo, hitbox e carregamento de CSS/JS/imagens aprovados.
- Consulta SQL confirmou integridade da relação entre agendamento e perfil capilar, além de grants da nova RPC.

## Publicação

1. Extraia o ZIP completo, envie **seu conteúdo** à raiz do repositório e aguarde o GitHub Actions concluir.
2. Faça atualização forçada com Ctrl+Shift+R.
3. Acesse **Admin → Solicitações → Revisar anamnese**. Confirme que os dados atuais aparecem e, se quiser homologar o salvamento, altere um campo de teste controlado, salve e reabra a ficha.
4. Abra o agendamento **Gypsy Braids → Knotless** e observe o cartão de variação. A seção de materiais avisará que ainda está pendente de configuração.

**Não foi feita nenhuma transferência financeira, exclusão de dados, alteração de preço nem criação de materiais.**
