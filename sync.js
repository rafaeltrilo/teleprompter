/* Sincronização entre a Mesa de Controle e a Tela do Palestrante.
   Usa BroadcastChannel (instantâneo) + localStorage (persistência e fallback).
   Funciona entre abas/janelas/monitores do MESMO navegador.
   A rolagem e o cronômetro são sincronizados por "âncora de tempo"
   (instante de início + offset), então as telas nunca ficam defasadas. */

const DEFAULTS = {
  title: 'Palestra Principal',
  speaker: '',
  script: 'Cole aqui o seu roteiro.\n\nUse linhas em branco para separar os blocos.',
  layout: 'both',          // both | script | timer
  fontSize: 64,            // px
  lineHeight: 1.45,
  align: 'left',           // left | center | right
  mirrorH: false,
  mirrorV: false,
  guide: true,             // linha guia de leitura
  speed: 60,               // px por segundo
  // rolagem
  running: false,
  offset: 0,               // px rolados quando pausou
  startedAt: 0,            // timestamp do play
  // cronômetro
  durationSec: 15 * 60,
  mode: 'down',            // down (regressivo) | up (progressivo)
  tRunning: false,
  tElapsed: 0,             // segundos acumulados em pausa
  tStartedAt: 0,
  warnSec: 120,            // alerta amarelo
  // mensagem ao vivo
  message: '',
  messageOn: false,
  rev: 0
};

function roomFromUrl() {
  const u = new URL(location.href);
  return (u.searchParams.get('sala') || 'PALCO-1').toUpperCase();
}

/* Relógio compartilhado: o celular e o PC podem ter horas diferentes.
   Medimos a diferença contra o relógio do servidor e usamos NOW() em tudo. */
let CLOCK_OFFSET = 0;
function NOW() { return Date.now() + CLOCK_OFFSET; }
let TIME_URL = null;          // definido pelo transporte escolhido
async function syncClock() {
  if (location.protocol === 'file:' || !TIME_URL) return;
  let best = Infinity;
  for (let i = 0; i < 4; i++) {
    try {
      const t0 = Date.now();
      const r = await fetch(TIME_URL, { cache: 'no-store' });
      const t1 = Date.now();
      const { t } = await r.json();
      const rtt = t1 - t0;
      if (rtt < best) { best = rtt; CLOCK_OFFSET = t + rtt / 2 - t1; }
    } catch { return; }
  }
}
setInterval(syncClock, 60000);

class Sync {
  constructor(room) {
    this.room = room || roomFromUrl();
    this.key = 'tp:' + this.room;
    this.bc = ('BroadcastChannel' in window) ? new BroadcastChannel(this.key) : null;
    this.listeners = [];
    this.state = this.load();
    this.online = false;
    this.mode = 'pending';
    if (this.bc) this.bc.onmessage = (e) => this.apply(e.data, false);
    addEventListener('storage', (e) => {
      if (e.key === this.key && e.newValue) this.apply(JSON.parse(e.newValue), false);
    });
    this.connect();   // sincronia entre DISPOSITIVOS (celular, TV, outro PC)
  }

  /* ---- transporte em rede ----
     Detecta sozinho onde está hospedado:
       php  -> api.php  (Apache / hospedagem comum, sem Node)
       node -> /events + /state (server.js, SSE)
       off  -> só este navegador (arquivo aberto direto ou servidor estático) */
  async connect() {
    if (location.protocol === 'file:') { this.mode = 'off'; return; }
    const base = location.pathname.replace(/[^/]*$/, '');   // funciona em subpasta
    try {
      const r = await fetch(base + 'api.php?a=ping', { cache: 'no-store' });
      if (r.ok && (await r.json()).ok) {
        this.mode = 'php'; this.api = base + 'api.php';
        TIME_URL = this.api + '?a=time'; syncClock();
        this.pollLoop();
        return;
      }
    } catch {}
    if (typeof EventSource !== 'undefined') {
      this.mode = 'node'; TIME_URL = base + 'time'; syncClock();
      const es = new EventSource(base + 'events?sala=' + encodeURIComponent(this.room));
      this.es = es;
      es.onopen  = () => { this.online = true; this.listeners.forEach(fn => fn(this.state)); };
      es.onerror = () => { this.online = false; };     // o EventSource reconecta sozinho
      es.onmessage = (e) => {
        try { const d = JSON.parse(e.data); if (d && d.rev) this.apply(d, false); } catch {}
      };
    }
  }

  /* PHP: pergunta por mudanças; o servidor segura a resposta até algo mudar */
  async pollLoop() {
    while (this.mode === 'php') {
      try {
        const url = this.api + '?a=state&sala=' + encodeURIComponent(this.room) +
                    '&rev=' + encodeURIComponent(this.state.rev || 0);
        const r = await fetch(url, { cache: 'no-store' });
        this.online = r.ok || r.status === 204;
        if (r.status === 200) {
          const d = await r.json();
          // só aceita se for mais novo que o nosso (evita ressuscitar estado antigo)
          if (d.estado && d.estado.rev && d.estado.rev > (this.state.rev || 0)) {
            this.apply(d.estado, false);
          }
        }
        this.listeners.forEach(fn => fn(this.state));
        await new Promise(r => setTimeout(r, 500));
      } catch {
        this.online = false;
        this.listeners.forEach(fn => fn(this.state));
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  publish() {
    if (this.mode === 'off' || location.protocol === 'file:') return;
    const base = location.pathname.replace(/[^/]*$/, '');
    const url = this.mode === 'php'
      ? this.api + '?a=state&sala=' + encodeURIComponent(this.room)
      : base + 'state?sala=' + encodeURIComponent(this.room);
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(this.state), keepalive: true }).catch(() => {});
  }
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return Object.assign({}, DEFAULTS, raw ? JSON.parse(raw) : {});
    } catch { return Object.assign({}, DEFAULTS); }
  }
  apply(next, broadcast) {
    if (!next || next.rev === this.state.rev) return;
    this.state = Object.assign({}, DEFAULTS, next);
    if (broadcast) {
      try { localStorage.setItem(this.key, JSON.stringify(this.state)); } catch {}
      if (this.bc) this.bc.postMessage(this.state);
      this.publish();
    }
    this.listeners.forEach(fn => fn(this.state));
  }
  set(patch) {
    this.apply(Object.assign({}, this.state, patch, { rev: NOW() }), true);
  }
  onChange(fn) { this.listeners.push(fn); fn(this.state); }
}

/* ---- cálculos derivados (iguais nas duas telas) ---- */
const Calc = {
  scrollOffset(s) {
    if (!s.running) return s.offset;
    return s.offset + (NOW() - s.startedAt) / 1000 * s.speed;
  },
  elapsed(s) {
    if (!s.tRunning) return s.tElapsed;
    return s.tElapsed + (NOW() - s.tStartedAt) / 1000;
  },
  remaining(s) { return s.durationSec - Calc.elapsed(s); },
  clock(s) {
    const v = s.mode === 'down' ? Calc.remaining(s) : Calc.elapsed(s);
    const neg = v < 0, a = Math.floor(Math.abs(v));
    const h = Math.floor(a / 3600), m = Math.floor(a % 3600 / 60), sec = a % 60;
    const p = n => String(n).padStart(2, '0');
    return (neg ? '-' : '') + (h ? h + ':' : '') + p(m) + ':' + p(sec);
  }
};
