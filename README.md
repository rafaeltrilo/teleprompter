# Teleprompter Pro

Teleprompter + cronômetro de palco, em HTML/CSS/JS puro. Sem build, sem servidor obrigatório.

## Arquivos
- `index.html` — mesa de controle (operador)
- `prompter.html` — tela do palestrante (não precisa de nenhum clique dele)
- `sync.js` — sincronia entre as telas + cálculos de rolagem/cronômetro
- `styles.css`

## Como usar (com celular / TV — recomendado)
```bash
node server.js          # ou: npm start   (porta 8080; PORT=3000 node server.js)
```
O terminal mostra os links. Na mesa (seu PC) abra `http://localhost:8080/`; no **celular/TV da mesma rede Wi-Fi** abra o link com o IP (`http://192.168.x.x:8080/prompter.html?sala=PALCO-1`) — ele também aparece pronto para copiar no cartão "Celular / TV" da mesa.

Tudo o que você mexe na mesa chega na hora no celular: rolagem, velocidade, cronômetro, layout, espelhamento e mensagens. O relógio das duas telas é alinhado com o do servidor, então o cronômetro não fica defasado.

## Como usar (sem servidor)
1. Abra `index.html` com duplo clique.
2. Clique em **Abrir tela do palestrante** e arraste essa janela para o segundo monitor / TV; duplo clique nela entra em tela cheia.
3. Tudo o que você mexer na mesa aparece na hora na tela do palestrante.

### Recursos
- Rolagem com velocidade ajustável, pausar, voltar ao topo, ±10s.
- Cronômetro regressivo ou progressivo, duração rápida (5–60 min), ±1 min, alerta amarelo e vermelho ao estourar.
- Layout da tela: roteiro + cronômetro, só roteiro ou só cronômetro.
- Orientação: normal (monitor direto), espelho horizontal (vidro/beam-splitter) e vertical (prompter de lente) — espelha a tela inteira, inclusive cronômetro e mensagens.
- Tamanho da fonte, entrelinha, alinhamento, linha guia de leitura.
- Mensagens ao vivo com frases prontas.
- Prévia da mesa com botão **Prévia sem espelho**: mesmo com o palco espelhado, o operador lê o texto normalmente (só afeta a mesa).
- Importar roteiro `.txt`, contagem de palavras e estimativa de fala.
- Layout adaptado para PC e celular.

### Atalhos (mesa)
`Espaço` play/pause da rolagem · `T` cronômetro · `↑`/`↓` recuar/avançar · `0` topo.

## Sincronia
- **Com `node server.js`**: a mesa publica o estado em `POST /state` e as telas recebem por **SSE** (`GET /events`) — funciona entre dispositivos diferentes (celular, tablet, TV, outro PC) na mesma rede. `GET /time` alinha os relógios.
- **Sem servidor** (`file://`): `BroadcastChannel` + `localStorage`, só entre janelas do mesmo navegador.

Para usar fora da rede local, basta hospedar esta pasta em qualquer serviço que rode Node (Render, Railway, Fly, VPS) — o mesmo `server.js` serve os arquivos e a sincronia.

Salas: use `?sala=NOME` para rodar vários palcos no mesmo servidor sem se misturarem.
