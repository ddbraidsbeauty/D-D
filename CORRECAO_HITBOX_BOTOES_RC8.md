# RC8 — Correção da área clicável dos botões

## Problema reproduzido

Dentro das janelas do painel administrativo, botões largos como **Salvar procedimento** só respondiam nas extremidades. A caixa de notificações (`#siteNotice`) tinha `opacity:0` e o invólucro com `pointer-events:none`, mas o filho `.notice-card` explicitamente usava `pointer-events:auto`, interceptando o centro do botão mesmo invisível.

## Correção

Ajuste exclusivamente de CSS em `styles/10-finance-status.css`, propagado ao `styles.css` gerado:

```css
.site-notice:not(.open){visibility:hidden}
.site-notice:not(.open) .notice-card{pointer-events:none}
```

Não altera a lógica de salvamento nem os dados do Supabase.

## Testes

- `python tests/test_save_hitbox.py`: clique físico no centro e inspeção do elemento sobre o botão em 375, 768 e 1440 px; abertura e fechamento de notificação.
- `python tests/test_catalog_individual_options.py`: manipulação e envio dos três grupos em procedimento, método e variação nas três larguras.
- `python tests/test_cross_module_interactions.py`: fluxos de 11 módulos em três larguras.
- `python tools/build.py --check`: JS e CSS gerados consistentes.

Testes locais com Supabase simulado, **não** substituem teste humano na versão publicada.
