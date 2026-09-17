/* ============================================================
   PIEDRA · PAPEL · TIJERAS — Servidor multijugador
   Sin dependencias: HTTP estático + WebSockets implementados a mano.
   - Sirve index.html
   - Matchmaking: empareja a los jugadores que busquen partida
   - Arbitraje: valida rondas, elecciones y calcula resultados
   ============================================================ */
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const ROUND_MS = 5600;      // margen del servidor antes de rellenar aleatorio
const NEXT_ROUND_MS = 4200; // espera entre rondas
const INTRO_MS = 1600;      // espera tras emparejar
const NOBODY_MS = 12000;    // aviso "no hay jugadores" si nadie entra

/* ---------------- HTTP estático ---------------- */
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true, clients: clients.size, waiting: !!waiting, matches: matches.size }));
    return;
  }
  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

/* ---------------- WebSocket mínimo (RFC6455) ---------------- */
const clients = new Set();      // todas las conexiones
let waiting = null;             // jugador esperando rival
const matches = new Map();      // partidas activas
let mid = 0;

function sendRaw(conn, op, payload) {
  if (conn.socket.destroyed) return;
  const len = payload.length;
  let header;
  if (len < 126) header = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x80 | op; header[1] = 126; header.writeUInt16BE(len, 2); }
  else { header = Buffer.alloc(10); header[0] = 0x80 | op; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2); }
  conn.socket.write(Buffer.concat([header, payload]));
}
function send(conn, obj) { sendRaw(conn, 0x1, Buffer.from(JSON.stringify(obj))); }

function parseFrames(conn) {
  for (;;) {
    const b = conn.buf;
    if (b.length < 2) return;
    const fin = !!(b[0] & 0x80), op = b[0] & 0x0f, masked = !!(b[1] & 0x80);
    let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; const big = b.readBigUInt64BE(2); if (big > 1048576n) { conn.socket.destroy(); return; } len = Number(big); off = 10; }
    if (len > 1048576) { conn.socket.destroy(); return; }
    const maskLen = masked ? 4 : 0;
    if (b.length < off + maskLen + len) return;
    let mask = null;
    if (masked) { mask = b.slice(off, off + 4); off += 4; }
    let payload = b.slice(off, off + len);
    if (mask) { const out = Buffer.alloc(len); for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3]; payload = out; }
    conn.buf = b.slice(off + len);
    if (op === 8) { try { conn.socket.end(); } catch (e) {} drop(conn); return; }
    else if (op === 9) { sendRaw(conn, 0x0a, payload); }
    else if (op === 10) { conn.alive = true; }
    else if (op === 1 || op === 0 || op === 2) {
      conn.frag = Buffer.concat([conn.frag || Buffer.alloc(0), payload]);
      if (fin) {
        const msg = conn.frag; conn.frag = null;
        try { onMessage(conn, JSON.parse(msg.toString('utf8'))); }
        catch (e) { /* mensaje inválido: ignorar */ }
      }
    }
  }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );
  socket.setNoDelay(true);
  const conn = {
    socket, id: crypto.randomUUID().slice(0, 8), alive: true,
    profile: { name: 'Jugador' }, match: null, role: null,
    buf: Buffer.alloc(0), frag: null, qTimer: null, dropped: false,
  };
  clients.add(conn);
  socket.on('data', d => { conn.buf = Buffer.concat([conn.buf, d]); parseFrames(conn); });
  socket.on('close', () => drop(conn));
  socket.on('error', () => { try { socket.destroy(); } catch (e) {} drop(conn); });
  socket.on('end', () => drop(conn));
  send(conn, { t: 'welcome', id: conn.id });
});

/* Keep-alive: ping cada 25 s, corta conexiones muertas */
setInterval(() => {
  for (const c of clients) {
    if (!c.alive) { try { c.socket.destroy(); } catch (e) {} drop(c); }
    else { c.alive = false; sendRaw(c, 0x9, Buffer.alloc(0)); }
  }
}, 25000);

/* ---------------- Lógica de partida ---------------- */
function drop(conn) {
  if (conn.dropped) return;
  conn.dropped = true;
  clients.delete(conn);
  if (conn.qTimer) { clearInterval(conn.qTimer); conn.qTimer = null; }
  if (waiting === conn) waiting = null;
  const match = conn.match;
  if (match) {
    conn.match = null;
    const other = conn.role === 'p1' ? match.p2 : match.p1;
    clearTimeout(match.timer);
    matches.delete(match.id);
    if (other && !other.socket.destroyed) {
      other.match = null;
      send(other, { t: 'oppLeft', score: match.score, n: match.round });
    }
  }
}

function onMessage(conn, m) {
  switch (m.t) {
    case 'queue': conn.profile = sanitizeProfile(m.profile); joinQueue(conn); break;
    case 'cancelQueue': cancelQueue(conn); break;
    case 'choice': matchChoice(conn, m); break;
    case 'ping': send(conn, { t: 'pong' }); break;
  }
}

function sanitizeProfile(p) {
  p = p && typeof p === 'object' ? p : {};
  return {
    name: String(p.name || 'Jugador').slice(0, 14) || 'Jugador',
    glove: String(p.glove || 'g_classic').slice(0, 32),
    sleeve: String(p.sleeve || 's_blue').slice(0, 32),
    aura: String(p.aura || 'a_blue').slice(0, 32),
  };
}

function joinQueue(conn) {
  cancelQueue(conn, true);
  if (waiting && waiting !== conn && !waiting.socket.destroyed) {
    const a = waiting, b = conn;
    waiting = null;
    startMatch(a, b);
  } else {
    waiting = conn;
    send(conn, { t: 'waiting' });
    conn.qTimer = setInterval(() => {
      if (waiting === conn) send(conn, { t: 'nobody' });
    }, NOBODY_MS);
  }
}
function cancelQueue(conn, silent) {
  if (conn.qTimer) { clearInterval(conn.qTimer); conn.qTimer = null; }
  if (waiting === conn) waiting = null;
  if (!silent) send(conn, { t: 'cancelled' });
}

function startMatch(a, b) {
  mid++;
  const match = { id: mid, p1: a, p2: b, score: [0, 0], round: 0, choices: {}, phase: 'intro', timer: null };
  a.match = match; a.role = 'p1';
  b.match = match; b.role = 'p2';
  if (a.qTimer) { clearInterval(a.qTimer); a.qTimer = null; }
  if (b.qTimer) { clearInterval(b.qTimer); b.qTimer = null; }
  matches.set(mid, match);
  send(a, { t: 'found', you: 'p1', opp: b.profile, matchId: mid });
  send(b, { t: 'found', you: 'p2', opp: a.profile, matchId: mid });
  match.timer = setTimeout(() => startRound(match), INTRO_MS);
}

function startRound(match) {
  if (!matches.has(match.id)) return;
  match.round++;
  match.choices = {};
  match.phase = 'count';
  match.deadline = Date.now() + ROUND_MS + 900;
  send(match.p1, { t: 'round', n: match.round });
  send(match.p2, { t: 'round', n: match.round });
  match.timer = setTimeout(() => resolveRound(match), ROUND_MS + 900);
}

function matchChoice(conn, m) {
  const match = conn.match;
  if (!match || match.phase !== 'count') return;
  if (m.n !== match.round) return;
  if (match.choices[conn.role]) return;
  const c = BEATS[m.choice] ? m.choice : null;
  if (!c) return;
  match.choices[conn.role] = c;
  /* La resolución SIEMPRE ocurre al vencer el plazo del temporizador,
     así ambos clientes terminan su cuenta atrás + cántico antes de la revelación. */
}

function resolveRound(match) {
  if (!matches.has(match.id) || match.phase !== 'count') return;
  match.phase = 'reveal';
  const opts = Object.keys(BEATS);
  if (!match.choices.p1) match.choices.p1 = opts[(Date.now() + match.round) % 3];
  if (!match.choices.p2) match.choices.p2 = opts[(Date.now() * 7 + match.round) % 3];
  const c1 = match.choices.p1, c2 = match.choices.p2;
  const winner = c1 === c2 ? 'draw' : (BEATS[c1] === c2 ? 'p1' : 'p2');
  if (winner === 'p1') match.score[0]++;
  if (winner === 'p2') match.score[1]++;
  const msg = { t: 'reveal', n: match.round, p1: c1, p2: c2, winner, score: [match.score[0], match.score[1]] };
  send(match.p1, msg);
  send(match.p2, msg);
  const over = match.score[0] >= 2 || match.score[1] >= 2;
  match.timer = setTimeout(() => {
    if (!matches.has(match.id)) return;
    if (over) endMatch(match);
    else startRound(match);
  }, NEXT_ROUND_MS);
}

function endMatch(match) {
  match.phase = 'end';
  const winner = match.score[0] >= 2 ? 'p1' : 'p2';
  const msg = { t: 'matchEnd', winner, score: [match.score[0], match.score[1]] };
  send(match.p1, msg);
  send(match.p2, msg);
  matches.delete(match.id);
  match.p1.match = null; match.p2.match = null;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('PPT multijugador escuchando en el puerto ' + PORT);
});
