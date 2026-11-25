/* Servidor do Teleprompter — Node puro, sem dependências.
   - serve os arquivos estáticos da pasta
   - GET  /events?sala=X  -> SSE: empurra o estado para todas as telas em tempo real
   - POST /state?sala=X   -> a mesa publica o estado
   - GET  /state?sala=X   -> estado atual (quando uma tela abre)
   Rodar:  node server.js        (porta 8080, ou PORT=3000 node server.js)        */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const rooms = new Map();              // sala -> { state, clients:Set<res> }

const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
               '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
               '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon',
               '.txt':'text/plain; charset=utf-8' };

const room = name => {
  const k = (name || 'PALCO-1').toUpperCase().slice(0, 40);
  if (!rooms.has(k)) rooms.set(k, { state: null, clients: new Set() });
  return rooms.get(k);
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const sala = url.searchParams.get('sala') || 'PALCO-1';

  // ---- SSE: tela do palestrante (e a prévia da mesa) escutam aqui ----
  if (url.pathname === '/events') {
    const r = room(sala);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 1000\n\n');
    if (r.state) res.write('data: ' + JSON.stringify(r.state) + '\n\n');
    r.clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clearInterval(ping); r.clients.delete(res); });
    return;
  }

  // ---- relógio do servidor (corrige diferença de hora entre PC e celular) ----
  if (url.pathname === '/time') {
    res.writeHead(200, { 'Content-Type':'application/json', 'Cache-Control':'no-store',
                         'Access-Control-Allow-Origin':'*' });
    return res.end(JSON.stringify({ t: Date.now() }));
  }

  // ---- endereços de rede local, para a mesa mostrar o link do celular ----
  if (url.pathname === '/ips') {
    const ips = Object.values(os.networkInterfaces()).flat()
      .filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
    res.writeHead(200, { 'Content-Type':'application/json', 'Cache-Control':'no-store' });
    return res.end(JSON.stringify({ ips, port: PORT }));
  }

  // ---- estado ----
  if (url.pathname === '/state') {
    const r = room(sala);
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8',
                           'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify(r.state || {}));
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 2e6) req.destroy(); });
      req.on('end', () => {
        try {
          const next = JSON.parse(body);
          r.state = next;
          const frame = 'data: ' + JSON.stringify(next) + '\n\n';
          for (const c of r.clients) { try { c.write(frame); } catch {} }
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }).end();
        } catch { res.writeHead(400).end('json inválido'); }
      });
      return;
    }
    if (req.method === 'OPTIONS') {
      return res.writeHead(204, { 'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type' }).end();
    }
  }

  // ---- arquivos estáticos ----
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('proibido'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}).end('não encontrado'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
                         'Cache-Control': 'no-store' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('\n  Teleprompter no ar!\n');
  console.log('  Mesa de controle:  http://localhost:' + PORT + '/');
  ips.forEach(ip => console.log('  No celular/TV:     http://' + ip + ':' + PORT + '/prompter.html?sala=PALCO-1'));
  console.log('\n  (celular e PC precisam estar no mesmo Wi-Fi)\n');
});
