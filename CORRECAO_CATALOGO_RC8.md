# RC8 — Correção de imagens internas e preços pendentes

**Contexto:** homologação da RC8 em GitHub Pages, Supabase com procedimentos base e método/variação sem preço.

## Ajustes
- Resolve imagens locais também por nome de método (`Fulani Braids` -> `fulani.jpg`), preservando a prioridade das fotos cadastradas no Supabase.
- Caso a imagem realmente falhe no ambiente publicado, oculta o ícone quebrado e exibe a marca D&D como reserva visual nas opções e no resumo.
- Catálogo não anuncia `R$ 0,00` como preço público; apresenta `Valor a definir pela profissional`.
- Resumo mostra `A definir` e a justificativa, não `R$ 0,00` como se fosse o preço acordado.
- Bloqueia avanço do resumo e envio até existir preço base válido cadastrado pela profissional.
- Aplica o mesmo tratamento de imagens aos cartões, aos detalhes de método/variação e ao resumo.

## Como publicar
Substituir somente os arquivos `app.js` e `styles.css` na raiz do repositório GitHub Pages. **Não modificar Supabase para esta correção**. A pasta `assets/demo/` já deve estar presente no repositório; caso um desses arquivos falte, o site mostrará um marcador de reserva visual até ser enviado.

O banco consultado não tinha preços definidos: isso **não** autoriza usar os valores fictícios da demonstração. Dany e Débora devem cadastrá-los quando decidirem.

## Testes executados
- `node tests_logic.js`: 13 testes unitários aprovados.
- `node tests_extended.js`: 1.692 verificações determinísticas aprovadas.
- `python tests/test_real_catalog_images.py`: imagens locais para os quatro procedimentos reais em 375, 768 e 1440px.
- `python tests/test_http_browser.py`: JS/CSS reais, navegação e imagens em três larguras.
- `python tests/test_unconfigured_catalog.py`: fluxo Tranças > Fulani Braids > Knotless > Dany; preço sem configuração, imagem disponível e simulação 404, bloqueio do avanço.
- `python tools/build.py --check` e `node --check app.js`: aprovados.

## Não homologado
Publicação atual do GitHub Pages e testes de preço real após configuração pelas profissionais. Nenhuma alteração foi feita no banco nesta correção.
