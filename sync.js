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

class Sync {
  constructor(room) {
    this.room = room || roomFromUrl();
    this.key = 'tp:' + this.room;
    this.bc = ('BroadcastChannel' in window) ? new BroadcastChannel(this.key) : null;
    this.listeners = [];
    this.state = this.load();
    if (this.bc) this.bc.onmessage = (e) => this.apply(e.data, false);
    addEventListener('storage', (e) => {
      if (e.key === this.key && e.newValue) this.apply(JSON.parse(e.newValue), false);
    });
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
    }
    this.listeners.forEach(fn => fn(this.state));
  }
  set(patch) {
    this.apply(Object.assign({}, this.state, patch, { rev: Date.now() }), true);
  }
  onChange(fn) { this.listeners.push(fn); fn(this.state); }
}

/* ---- cálculos derivados (iguais nas duas telas) ---- */
const Calc = {
  scrollOffset(s) {
    if (!s.running) return s.offset;
    return s.offset + (Date.now() - s.startedAt) / 1000 * s.speed;
  },
  elapsed(s) {
    if (!s.tRunning) return s.tElapsed;
    return s.tElapsed + (Date.now() - s.tStartedAt) / 1000;
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
