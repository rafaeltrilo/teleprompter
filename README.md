# Teleprompter Pro

Teleprompter + cronômetro de palco, em HTML/CSS/JS puro. Sem build, sem servidor obrigatório.

## Arquivos
- `index.html` — mesa de controle (operador)
- `prompter.html` — tela do palestrante (não precisa de nenhum clique dele)
- `sync.js` — sincronia entre as telas + cálculos de rolagem/cronômetro
- `styles.css`

## Como usar
1. Abra `index.html` (duplo clique, ou sirva a pasta: `python3 -m http.server 8077`).
2. Clique em **Abrir tela do palestrante** e arraste essa janela para o segundo monitor / TV; duplo clique nela entra em tela cheia.
3. Tudo o que você mexer na mesa aparece na hora na tela do palestrante.

### Recursos
- Rolagem com velocidade ajustável, pausar, voltar ao topo, ±10s.
- Cronômetro regressivo ou progressivo, duração rápida (5–60 min), ±1 min, alerta amarelo e vermelho ao estourar.
- Layout da tela: roteiro + cronômetro, só roteiro ou só cronômetro.
- Orientação: normal (monitor direto), espelho horizontal (vidro/beam-splitter) e vertical (prompter de lente) — espelha a tela inteira, inclusive cronômetro e mensagens.
- Tamanho da fonte, entrelinha, alinhamento, linha guia de leitura.
- Mensagens ao vivo com frases prontas.
- Importar roteiro `.txt`, contagem de palavras e estimativa de fala.
- Layout adaptado para PC e celular.

### Atalhos (mesa)
`Espaço` play/pause da rolagem · `T` cronômetro · `↑`/`↓` recuar/avançar · `0` topo.

## Sincronia
A sincronia usa `BroadcastChannel` + `localStorage`: funciona entre janelas, abas e monitores **do mesmo navegador/dispositivo** (o caso típico: notebook do operador + saída HDMI para o monitor do palestrante).

Para controlar de um **dispositivo diferente** (celular controlando a TV, por exemplo) é preciso um servidor de sinalização (WebSocket). Posso adicionar isso em seguida — é a única parte que exige backend.
