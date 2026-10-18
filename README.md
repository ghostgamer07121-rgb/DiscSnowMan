# Disc Snowman ❄

Jogo de sobrevivência arcade feito com **HTML, CSS e JavaScript puro**. Sem engine, instalação ou dependências de build.

## Jogar

Abra [Disc Snowman](https://ghostgamer07121-rgb.github.io/DiscSnowMan/) depois que o GitHub Pages terminar a publicação.

## Controles

- **WASD** ou **setas:** mover o boneco de neve.
- **Espaço** ou **Shift:** dash de emergência com breve invulnerabilidade.
- **Esc:** pausar/continuar.
- **Celular:** joystick virtual e botão de dash.

## Sobrevivência

Desvie das serras circulares e tente durar o máximo possível. A dificuldade aumenta com o tempo e o jogo introduz seis comportamentos: ricochete, perseguição, órbita, cruzamento rápido, trajetória ondulada e caos final. Uma colisão encerra a rodada. O recorde fica salvo localmente no navegador.

## Publicação no GitHub Pages

O workflow em `.github/workflows/pages.yml` publica o site a partir da branch `main`. No repositório, se necessário, abra **Settings → Pages** e escolha **GitHub Actions** como fonte de build. Depois consulte **Actions** para acompanhar a publicação.

## Arquivos

- `index.html` — estrutura, HUD e telas do jogo.
- `styles.css` — interface responsiva e visual sci-fi congelado.
- `game.js` — renderização Canvas, controles, serras, dificuldade, colisões e recorde.
- `.github/workflows/pages.yml` — deploy estático via GitHub Pages.

Feito para os que resistem.