# Teleprompter Pro

Teleprompter + cronômetro de palco, em HTML/CSS/JS puro. Sem build, sem servidor obrigatório.

## Arquivos
- `index.html` — mesa de controle (operador)
- `prompter.html` — tela do palestrante (não precisa de nenhum clique dele)
- `sync.js` — sincronia entre as telas + cálculos de rolagem/cronômetro
- `styles.css`

## Hospedagem Apache / site na web (PHP) — recomendado
Envie **todos os arquivos** da pasta para o seu servidor (`index.html`, `prompter.html`, `sync.js`, `styles.css`, **`api.php`**, `.htaccess`). Nada para instalar: o `api.php` cuida da sincronia.

- Mesa de controle: `https://seusite.com/teleprompter/`
- Tela do palestrante (celular/TV): `https://seusite.com/teleprompter/prompter.html?sala=PALCO-1`

Requisitos: PHP ativo e permissão de escrita na pasta (o `api.php` cria a subpasta `dados/`; se não conseguir, usa a pasta temporária do servidor). O topo da mesa deve mostrar **"sincronizando (PHP)"**.

Deu errado? Abra **`diagnostico.html`** na mesma pasta: ele testa o `api.php`, a execução do PHP, a gravação do estado e cada arquivo, apontando a causa.

## Rodando localmente com Node
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
O `sync.js` detecta sozinho onde está hospedado:
1. **PHP** (`api.php` responde) → a mesa publica o estado e as telas consultam a cada 500 ms. Ideal para Apache/hospedagem compartilhada.
2. **Node** (`server.js`) → SSE em `/events`, push instantâneo.
3. **Nenhum** (`file://` ou servidor estático) → só janelas do mesmo navegador, com aviso visível na mesa.

Rolagem e cronômetro não dependem da latência: as telas recebem **marcas de tempo** (instante do play + offset) e calculam a posição localmente, com os relógios alinhados ao do servidor (`?a=time` / `/time`). Por isso 300 ms de rede não causam defasagem.

Salas: use `?sala=NOME` para rodar vários palcos no mesmo servidor sem se misturarem.
