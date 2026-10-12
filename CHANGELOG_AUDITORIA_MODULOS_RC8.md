# RC8 — Auditoria dos módulos (12/10/2026)

- Financeiro: entrada de valores de sinal permite iniciar a digitação mesmo quando "Sem sinal" estiver selecionado. O formulário seleciona "Valor fixo" automaticamente e valida limites e sinal positivo antes de enviar à API.
- Pendências: eliminado `ReferenceError: missing is not defined` na condição de carregamento malsucedido.
- Pendências: a interface oculta ações cujas tabelas RC7 não estão disponíveis e exibe uma explicação específica em vez de gerar botões sem funcionalidade.
- Regressão: testes automatizados de todos os 11 módulos, cenários negativos de sinal e interfaces públicas, em três larguras de viewport.
- Sem mutações no Supabase real nesta rodada. Restam recursos da RC7 ainda não instalados, descritos no relatório completo.
