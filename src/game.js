(() => {
'use strict';
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const reflow = n => void n.offsetWidth;

/* ================== CONSTANTES ================== */
const ROUND_SECONDS = 5;                 // cuenta atrás de cada ronda
const BIG_FROM = 3;                      // a partir de 3: contador gigante
const RING_C = 2 * Math.PI * 30;
const BEATS = { rock:'scissors', paper:'rock', scissors:'paper' };
const DETALLE = {
  'rock>scissors':  'La piedra ROMPE las tijeras',
  'paper>rock':     'El papel ENVUELVE la piedra',
  'scissors>paper': 'Las tijeras CORTAN el papel',
};
const NAMES = { rock:'piedra', paper:'papel', scissors:'tijeras' };
const SAVE_KEY = 'ppt_save_v2';

/* Dificultades: IA que contrarresta predicciones con probabilidad "iq" */
const DIFFS = {
  easy:   { label:'FÁCIL',   name:'CPU NOVATA',   glove:'g_classic', sleeve:'s_blue',   aura:'a_blue',   iq:.35, reward:40  },
  normal: { label:'NORMAL',  name:'CPU PRO',      glove:'g_cyan',    sleeve:'s_purple', aura:'a_purple', iq:.62, reward:75  },
  hard:   { label:'DIFÍCIL', name:'CPU DEMONIO',  glove:'g_lava',    sleeve:'s_black',  aura:'a_red',    iq:.86, reward:150 },
};

/* ================== GUARDADO (localStorage seguro) ================== */
const DEFAULT_SAVE = () => ({
  coins: 100,
  diff: 'normal',
  name: 'Jugador-' + (100 + Math.floor(Math.random() * 900)),
  owned: { gloves:['g_classic'], sleeves:['s_blue'], auras:['a_blue'] },
  eq: { glove:'g_classic', sleeve:'s_blue', aura:'a_blue' },
  stats: { w:0, l:0 },
  muted: false,
});
const store = {
  read(){ try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || null; } catch(e){ return null; } },
  write(v){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch(e){} },
};
let save = Object.assign(DEFAULT_SAVE(), store.read() || {});
save.owned = Object.assign({ gloves:['g_classic'], sleeves:['s_blue'], auras:['a_blue'] }, save.owned);
save.eq    = Object.assign({ glove:'g_classic', sleeve:'s_blue', aura:'a_blue' }, save.eq);
save.stats = Object.assign({ w:0, l:0 }, save.stats);
if (!DIFFS[save.diff]) save.diff = 'normal';
const persist = () => store.write(save);

/* ================== CATÁLOGO DE SKINS ================== */
const SKINS = {
  gloves: [
    { id:'g_classic', name:'Clásico',       price:0,   fill:'#FFFFFF' },
    { id:'g_emerald', name:'Esmeralda',      price:250, fill:'#2EE6A8' },
    { id:'g_ruby',    name:'Rubí',           price:250, fill:'#FF3B5C' },
    { id:'g_sapphire',name:'Zafiro',         price:250, fill:'#3B7BFF' },
    { id:'g_lav',     name:'Lavanda',        price:200, fill:'#C9A7FF' },
    { id:'g_neon',    name:'Neón Rosa',      price:300, fill:'#FF36E0' },
    { id:'g_cyan',    name:'Cian Eléctrico', price:300, fill:'#22E7FF' },
    { id:'g_candy',   name:'Caramelo',       price:400, fill:'url(#pCandy)' },
    { id:'g_carbon',  name:'Carbono',        price:400, fill:'url(#pCarbon)' },
    { id:'g_cammo',   name:'Camo',           price:450, fill:'url(#pCammo)' },
    { id:'g_toxic',   name:'Tóxico',         price:500, fill:'url(#pToxic)' },
    { id:'g_gold',    name:'Oro Rey',        price:600, fill:'url(#pGold)' },
    { id:'g_lava',    name:'Lava',           price:600, fill:'url(#pLava)' },
    { id:'g_ice',     name:'Hielo Eterno',   price:650, fill:'url(#pIce)' },
    { id:'g_galaxy',  name:'Galaxia',        price:800, fill:'url(#pGalaxy)' },
    { id:'g_rainbow', name:'Arcoíris',       price:900, fill:'url(#pRainbow)' },
  ],
  sleeves: [
    { id:'s_blue',   name:'Azul',     price:0,   fill:'#3D7EFF' },
    { id:'s_red',    name:'Carmesí',  price:150, fill:'#FF4D6B' },
    { id:'s_green',  name:'Jade',     price:150, fill:'#2FBF60' },
    { id:'s_black',  name:'Negro',    price:200, fill:'#23263B' },
    { id:'s_orange', name:'Naranja',  price:200, fill:'#FF8A3D' },
    { id:'s_pink',   name:'Rosa',     price:200, fill:'#FF7AB6' },
    { id:'s_purple', name:'Púrpura',  price:250, fill:'#8B5CF6' },
    { id:'s_gold',   name:'Dorada',   price:400, fill:'#FFC53D' },
  ],
  auras: [
    { id:'a_blue',   name:'Azul',    price:0,   c:'#56C4FF' },
    { id:'a_red',    name:'Roja',    price:150, c:'#FF5A78' },
    { id:'a_green',  name:'Verde',   price:150, c:'#3DDC84' },
    { id:'a_cyan',   name:'Cian',    price:200, c:'#22E7FF' },
    { id:'a_pink',   name:'Rosa',    price:250, c:'#FF7AB6' },
    { id:'a_purple', name:'Violeta', price:250, c:'#A78BFA' },
    { id:'a_gold',   name:'Dorada',  price:300, c:'#FFD93D' },
    { id:'a_white',  name:'Blanca',  price:400, c:'#FFFFFF' },
  ],
};
const skinById = (cat, id) => SKINS[cat].find(s => s.id === id) || SKINS[cat][0];
const hexToRgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
};

/* ================== IA DE LA CPU ==================
   Aprende tus patrones y contrarresta lo que va a jugar:
   - Cadena de Markov de orden 2 (tus dos últimas jugadas -> siguiente)
   - Cadena de Markov de orden 1 (tu última jugada -> siguiente)
   - Frecuencia global si tienes un sesgo claro
   - La dificultad (iq) decide cuántas veces usa la predicción;
     el resto de las jugadas son aleatorias puras (impredecible). */
const CpuAI = (() => {
  const COUNTER = { rock:'paper', paper:'scissors', scissors:'rock' };
  let h = [];                       // historial del jugador en esta sesión
  const t1 = new Map();             // orden 1
  const t2 = new Map();             // orden 2
  let lastPredicted = null;
  let lastCorrect = false;

  const key = (a, b) => a + b;
  function bump(map, k, v){
    if (!map.has(k)) map.set(k, { rock:0, paper:0, scissors:0 });
    map.get(k)[v]++;
  }
  const total = m => m.rock + m.paper + m.scissors;
  const argmax = m => ['rock','paper','scissors'].reduce((a, b) => m[b] > m[a] ? b : a);

  function record(c){
    if (!BEATS[c]) return;
    if (h.length >= 1) bump(t1, h[h.length-1], c);
    if (h.length >= 2) bump(t2, key(h[h.length-2], h[h.length-1]), c);
    h.push(c);
  }
  function predict(){
    if (h.length >= 3){                                  // Markov orden 2
      const m = t2.get(key(h[h.length-2], h[h.length-1]));
      if (m && total(m) >= 2) return argmax(m);
    }
    if (h.length >= 1){                                  // Markov orden 1
      const m = t1.get(h[h.length-1]);
      if (m && total(m) >= 2) return argmax(m);
    }
    if (h.length >= 4){                                  // sesgo de frecuencia
      const f = { rock:0, paper:0, scissors:0 };
      h.forEach(c => f[c]++);
      const best = argmax(f);
      if (f[best] - Math.min(f.rock, f.paper, f.scissors) >= 3) return best;
    }
    return null;                                         // sin señal clara
  }
  function pick(iq){
    lastPredicted = predict();
    if (lastPredicted && Math.random() < iq){
      lastCorrect = true;
      return COUNTER[lastPredicted];                     // contrarresta la predicción
    }
    lastCorrect = false;
    return ['rock','paper','scissors'][Math.floor(Math.random() * 3)];
  }
  return {
    record, pick, predict,
    get lastPredicted(){ return lastPredicted; },
    get lastCorrect(){ return lastCorrect; },
    get memory(){ return h.length; },
    reset(){ h = []; t1.clear(); t2.clear(); lastPredicted = null; lastCorrect = false; },
  };
})();

/* ================== SONIDO ================== */
const Sfx = (() => {
  let ctx = null, master = null, noiseBuf = null, muted = !!save.muted;
  function init(){
    if (ctx){ if (ctx.state === 'suspended') ctx.resume().catch(()=>{}); return true; }
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination);
      const n = Math.floor(ctx.sampleRate * .4);
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      return true;
    }catch(e){ return false; }
  }
  function tone({f=440, f2=0, dur=.15, type='sine', vol=.4, when=0}){
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + .05);
  }
  function noise({dur=.2, vol=.4, when=0, freq=800}){
    if (!ctx || muted || !noiseBuf) return;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + .05);
  }
  return {
    init,
    get muted(){ return muted; },
    set muted(v){ muted = v; save.muted = v; persist(); },
    tick(){    tone({f:660, dur:.07, type:'square', vol:.22}); },
    bigTick(){ tone({f:190, f2:80, dur:.3, type:'sine', vol:.95});
               tone({f:560, dur:.05, type:'square', vol:.2});
               noise({dur:.14, vol:.3, freq:1000}); },
    ya(){      tone({f:150, f2:55, dur:.45, type:'sine', vol:1});
               noise({dur:.3, vol:.5, freq:500});
               tone({f:880, f2:1760, dur:.2, type:'triangle', vol:.25}); },
    select(){  tone({f:620, f2:930, dur:.11, type:'triangle', vol:.5}); },
    pump(){    tone({f:240, f2:150, dur:.14, type:'triangle', vol:.5}); },
    impact(){  tone({f:210, f2:48, dur:.32, type:'sine', vol:1});
               noise({dur:.22, vol:.75, freq:420}); },
    rwin(){    tone({f:523, dur:.1, type:'triangle', vol:.4});
               tone({f:784, dur:.16, type:'triangle', vol:.4, when:.09}); },
    rlose(){   tone({f:220, f2:130, dur:.28, type:'sawtooth', vol:.2}); },
    rdraw(){   tone({f:440, dur:.12, type:'square', vol:.22});
               tone({f:440, dur:.16, type:'square', vol:.22, when:.14}); },
    coin(){    tone({f:1318, dur:.09, type:'square', vol:.3});
               tone({f:1760, dur:.18, type:'square', vol:.3, when:.09}); },
    buy(){     tone({f:784, dur:.1, type:'triangle', vol:.4});
               tone({f:1046, dur:.1, type:'triangle', vol:.4, when:.1});
               tone({f:1568, dur:.2, type:'triangle', vol:.4, when:.2}); },
    sad(){     tone({f:392, f2:196, dur:.5, type:'sine', vol:.3}); },
    matchWin(){[523,659,784,1046,1318].forEach((f,i)=>tone({f, dur:.2, type:'triangle', vol:.45, when:i*.1}));
               noise({dur:.4, vol:.25, when:.1, freq:2000}); },
    matchLose(){[330,262,196,147].forEach((f,i)=>tone({f, dur:.3, type:'sawtooth', vol:.2, when:i*.16})); },
    click(){   tone({f:900, dur:.05, type:'square', vol:.18}); },
  };
})();
const buzz = p => { try{ navigator.vibrate && navigator.vibrate(p); }catch(e){} };

/* ================== ESTADO ================== */
const M = {
  phase: 'idle',           // idle | count | chant | reveal | banner | ended
  round: 0, remaining: ROUND_SECONDS,
  wins: { me:0, opp:0 },
  myChoice: null, oppChoice: null,
  paused: false,
};
const T = { round:null, next:null };

/* ================== DOM ================== */
const el = {
  game:$('#game'), arena:$('#arena'), footer:$('#choices'),
  wrapP:$('#wrapP'), wrapA:$('#wrapA'), handP:$('#handP'), handA:$('#handA'),
  zoneP:$('#zoneP'), zoneA:$('#zoneA'),
  cdWrap:$('#cdWrap'), cdNum:$('#cdNum'), ring:$('#ringFg'), roundLabel:$('#roundLabel'),
  bigNum:$('#bigNum'), flash:$('#flash'), chant:$('#chant'), chantWord:$('#chantWord'),
  fx:$('#fx'), toast:$('#toast'), banner:$('#roundBanner'), cpuStatus:$('#cpuStatus'),
  pipsP:$('#pipsP'), pipsA:$('#pipsA'), nameP:$('#nameP'), nameA:$('#nameA'),
  matchOverlay:$('#matchOverlay'), mTrophy:$('#mTrophy'), mTitle:$('#mTitle'),
  mScore:$('#mScore'), mReward:$('#mReward'), mRewardNum:$('#mRewardNum'), mSub:$('#mSub'),
  btnAgain:$('#btnAgain'), btnHome:$('#btnHome'),
  menu:$('#menuScreen'), btnPlay:$('#btnPlay'), btnShop:$('#btnShop'),
  diffRow:$('#diffRow'),
  nameInput:$('#nameInput'), pRecord:$('#pRecord'), coinsMenu:$('#coinsMenu'),
  coinsChip:$('#coinsChip'), coinsShop:$('#coinsShop'), avatarBox:$('#avatarBox'),
  menuHands:$('#menuHands'),
  shop:$('#shopOverlay'), shopGrid:$('#shopGrid'), shopFoot:$('#shopFoot'),
  btnShopClose:$('#btnShopClose'), btnMute:$('#btnMute'),
};

/* ================== AYUDAS VISUALES ================== */
function setPose(side, pose){
  const hand = side === 'p' ? el.handP : el.handA;
  $$('.pose', hand).forEach(s => s.classList.toggle('active', s.classList.contains('pose-' + pose)));
}
function kick(strength){
  el.game.classList.remove('kick','kick2'); reflow(el.game);
  el.game.classList.add(strength > 1 ? 'kick2' : 'kick');
}
function shake(){
  el.arena.classList.remove('shake'); reflow(el.arena); el.arena.classList.add('shake');
}
function flashScreen(){
  el.flash.classList.remove('go'); reflow(el.flash); el.flash.classList.add('go');
}
function toast(msg, ms=2800){
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(()=>el.toast.classList.remove('show'), ms);
}
function bigNumber(txt, strong=false){
  el.bigNum.innerHTML = '';
  const s = document.createElement('span');
  s.className = 'pum outl' + (strong ? ' strong' : '');
  s.textContent = txt;
  el.bigNum.appendChild(s);
  clearTimeout(bigNumber.t);
  bigNumber.t = setTimeout(()=>s.remove(), 1000);
}
function sparks(n, colors){
  for (let i = 0; i < n; i++){
    const sp = document.createElement('i');
    sp.className = 'spark';
    const ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 110;
    sp.style.setProperty('--dx', (Math.cos(ang) * dist) + 'px');
    sp.style.setProperty('--dy', (Math.sin(ang) * dist * .75) + 'px');
    sp.style.setProperty('--s',  (5 + Math.random() * 8) + 'px');
    sp.style.setProperty('--c',  colors[i % colors.length]);
    el.fx.appendChild(sp);
    setTimeout(()=>sp.remove(), 750);
  }
}
function shockwave(){
  const w = document.createElement('div');
  w.className = 'shock';
  el.fx.appendChild(w);
  setTimeout(()=>w.remove(), 600);
}
function confetti(){
  const cols = ['#FFD93D','#3DDC84','#38D0FF','#FF7AB6','#FFB020','#ffffff'];
  for (let i = 0; i < 20; i++){
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = (4 + Math.random() * 92) + '%';
    c.style.setProperty('--dx', (Math.random() * 90 - 45) + 'px');
    c.style.setProperty('--c',  cols[i % cols.length]);
    c.style.setProperty('--d', (0.9 + Math.random() * 0.9) + 's');
    c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    el.matchOverlay.appendChild(c);
    setTimeout(()=>c.remove(), 2400);
  }
}
function banner(text, type){
  el.banner.textContent = text;
  el.banner.className = '';
  el.banner.classList.add('show', 'rb-' + type);
}
function hideBanner(){ el.banner.classList.remove('show'); }
function updatePips(){
  $$('i', el.pipsP).forEach((p, i) => p.classList.toggle('on', i < M.wins.me));
  $$('i', el.pipsA).forEach((p, i) => p.classList.toggle('on', i < M.wins.opp));
}
function bumpCoins(){
  el.coinsChip.classList.remove('bump'); reflow(el.coinsChip); el.coinsChip.classList.add('bump');
  el.coinsMenu.textContent = save.coins;
  el.coinsShop.textContent = save.coins;
}
function cpuSay(txt){
  el.cpuStatus.textContent = txt;
  el.cpuStatus.classList.add('show');
}
function cpuQuiet(){ el.cpuStatus.classList.remove('show'); }

/* ================== SKINS: APLICAR ================== */
function applySkins(){
  const g = skinById('gloves', save.eq.glove);
  const s = skinById('sleeves', save.eq.sleeve);
  const a = skinById('auras', save.eq.aura);
  el.handP.style.setProperty('--glove', g.fill);
  el.handP.style.setProperty('--sleeve', s.fill);
  el.zoneP.style.setProperty('--zonec', hexToRgba(a.c, .42));
  el.footer.style.setProperty('--glove', g.fill);
  el.avatarBox.style.setProperty('--glove', g.fill);
  el.avatarBox.style.setProperty('--sleeve', s.fill);
  $$('svg', el.menuHands).forEach(svg => {
    svg.style.setProperty('--glove', g.fill);
    svg.style.setProperty('--sleeve', s.fill);
  });
  el.coinsMenu.textContent = save.coins;
  el.coinsShop.textContent = save.coins;
  el.pRecord.textContent = `🏆 ${save.stats.w} · ${save.stats.l}`;
}
function applyOppSkins(p){
  const g = skinById('gloves', p.glove);
  const s = skinById('sleeves', p.sleeve);
  const a = skinById('auras', p.aura);
  el.handA.style.setProperty('--glove', g.fill);
  el.handA.style.setProperty('--sleeve', s.fill);
  el.zoneA.style.setProperty('--zonec', hexToRgba(a.c, .40));
}

/* ================== MOTOR DE RONDA ================== */
function resetRoundVisuals(){
  [el.wrapP, el.wrapA].forEach(w => w.classList.remove('pumping','thrust','picked'));
  [el.zoneP, el.zoneA].forEach(z => z.classList.remove('hot','winner','loser'));
  setPose('p','rock'); setPose('a','rock');
  cpuQuiet();
}
function unlockButtons(){
  el.footer.classList.remove('locked');
  $$('.choice-btn', el.footer).forEach(b => b.classList.remove('selected','dim','auto'));
}
function lockButtons(){
  el.footer.classList.add('locked');
  $$('.choice-btn', el.footer).forEach(b => { if(!b.classList.contains('selected')) b.classList.add('dim'); });
}

function beginRound(n){
  clearTimeout(T.round); clearTimeout(T.next);
  M.phase = 'count';
  M.round = n; M.remaining = ROUND_SECONDS;
  M.myChoice = null; M.oppChoice = null;
  resetRoundVisuals(); unlockButtons(); hideBanner();
  el.cdWrap.classList.remove('hidden','danger');
  el.cdNum.textContent = String(ROUND_SECONDS);
  el.ring.style.strokeDashoffset = 0;
  el.roundLabel.textContent = `RONDA ${n} · PRIMERO A 2`;
  el.arena.classList.remove('round-in'); reflow(el.arena); el.arena.classList.add('round-in');
  Sfx.tick(); buzz(12);
  cpuSay(M.round === 1 || CpuAI.memory < 2
    ? '🤖 ' + M.opp.name + ' te observa…'
    : '🧠 ' + M.opp.name + ' analiza tus patrones…');
  scheduleTick(1000);
}
function scheduleTick(ms){
  clearTimeout(T.round);
  T.round = setTimeout(()=>{ if(!M.paused) tick(); }, ms);
}
function updateRing(n){
  el.cdNum.textContent = String(n);
  el.ring.style.strokeDashoffset = (RING_C * (ROUND_SECONDS - n) / ROUND_SECONDS).toFixed(1);
  el.cdWrap.classList.toggle('danger', n < ROUND_SECONDS);
}
function tick(){
  if (M.phase !== 'count' || M.paused) return;
  M.remaining--;
  const n = M.remaining;
  if (n >= BIG_FROM + 1){                       // contador pequeño arriba
    updateRing(n); Sfx.tick(); buzz(8);
    scheduleTick(1000);
  } else if (n >= 1){                           // 3·2·1 → ¡PUM! gigante central
    el.cdWrap.classList.add('hidden');
    bigNumber(String(n));
    Sfx.bigTick(); buzz(35);
    kick(1); shake();
    scheduleTick(1000);
  } else {                                      // 0 → ¡YA!
    el.cdWrap.classList.add('hidden');
    bigNumber('¡YA!', true);
    Sfx.ya(); buzz([40,30,40]);
    kick(2); shake(); flashScreen();
    if (!M.myChoice) autoPick();
    lockButtons();
    clearTimeout(T.round);
    T.round = setTimeout(()=>{ if(!M.paused) startChant(); }, 700);
  }
}
function autoPick(){
  const opts = Object.keys(BEATS);
  M.myChoice = opts[Math.floor(Math.random() * opts.length)];
  const btn = $(`.choice-btn[data-choice="${M.myChoice}"]`);
  if (btn) btn.classList.add('selected','auto');
  toast('⏱️ ¡Tiempo agotado! Elección aleatoria');
}
function choose(choice, btn){
  if (M.phase !== 'count' || M.myChoice) return;
  Sfx.init();
  M.myChoice = choice;
  Sfx.select(); buzz(20);
  btn.classList.add('selected');
  lockButtons();
  $$('.choice-btn', el.footer).forEach(b => { if (b !== btn) b.classList.add('dim'); });
  el.zoneP.classList.add('hot');
  el.wrapP.classList.remove('picked'); reflow(el.wrapP); el.wrapP.classList.add('picked');
  setTimeout(()=>el.wrapP.classList.remove('picked'), 420);
}

function startChant(){
  if (M.phase !== 'count' || M.remaining > 0) return;
  M.phase = 'chant';
  el.chant.classList.add('on');
  const words = [['¡PIEDRA!','w-rock'], ['¡PAPEL!','w-paper'], ['¡TIJERA!','w-sci']];
  words.forEach((w, i) => {
    setTimeout(()=>{
      if (M.phase !== 'chant') return;
      el.chantWord.className = 'outl ' + w[1];
      el.chantWord.textContent = w[0];
      reflow(el.chantWord);
      el.chantWord.classList.add('pop');
      Sfx.pump(); buzz(15);
    }, i * 400);
  });
  [el.wrapP, el.wrapA].forEach(w => w.classList.add('pumping'));
  setTimeout(()=>{ if(!M.paused) reveal(); }, 400 * 3 + 130);
}
function reveal(){
  if (M.phase !== 'chant') return;
  M.phase = 'reveal';
  cpuQuiet();
  el.chant.classList.remove('on');
  /* la CPU predice según tu historial y contrarresta */
  const aiChoice = CpuAI.pick(DIFFS[save.diff].iq);
  M.oppChoice = aiChoice;
  setPose('p', M.myChoice);
  setPose('a', aiChoice);
  el.zoneA.classList.add('hot');
  [el.wrapP, el.wrapA].forEach(w => w.classList.remove('pumping'));
  el.wrapP.classList.add('thrust');
  el.wrapA.classList.add('thrust');
  setTimeout(()=>{ if (M.phase === 'reveal') impactFx(); }, 220);
  setTimeout(()=>{ if (M.phase === 'reveal') roundResult(M.myChoice, aiChoice); }, 1150);
}
function impactFx(){
  Sfx.impact(); buzz(70);
  kick(2); shake();
  shockwave();
  sparks(16, ['#ffffff','#8FE3FF','#FFD93D','#B7C6FF','#FF9DB0']);
}

function roundResult(myC, oppC){
  M.phase = 'banner';
  CpuAI.record(myC);                            // la IA aprende de TU jugada
  const winner = myC === oppC ? 'draw' : (BEATS[myC] === oppC ? 'me' : 'opp');
  if (winner === 'me') M.wins.me++;
  else if (winner === 'opp') M.wins.opp++;
  updatePips();
  if (winner === 'me'){ el.zoneP.classList.add('winner'); el.zoneA.classList.add('loser'); }
  else if (winner === 'opp'){ el.zoneA.classList.add('winner'); el.zoneP.classList.add('loser'); }
  if (winner === 'me'){ banner('🏆 ¡RONDA GANADA!', 'win'); Sfx.rwin(); buzz([20,40,20]); }
  else if (winner === 'opp'){
    banner('💥 RONDA PERDIDA', 'lose'); Sfx.rlose(); buzz(80);
    if (CpuAI.lastCorrect) cpuSay('🧠 ¡Predijo tu ' + NAMES[myC].toUpperCase() + '!');
  }
  else { banner('🤝 EMPATE — SE REPITE', 'draw'); Sfx.rdraw(); buzz(25); }
  const over = M.wins.me >= 2 || M.wins.opp >= 2;
  T.next = setTimeout(()=>{
    if (over) endMatch(M.wins.me >= 2);
    else beginRound(M.round + 1);
  }, over ? 2000 : 2900);
}

/* ================== PARTIDA ================== */
function startMatch(){
  Sfx.init(); Sfx.click(); buzz(15);
  M.phase = 'idle';
  M.wins = { me:0, opp:0 }; M.round = 0;
  M.myChoice = null; M.oppChoice = null;
  const d = DIFFS[save.diff];
  M.opp = { name:d.name, glove:d.glove, sleeve:d.sleeve, aura:d.aura };
  el.menu.classList.add('hide');
  el.matchOverlay.classList.remove('show');
  $$('.confetti', el.matchOverlay).forEach(c => c.remove());
  el.nameP.textContent = 'TÚ';
  el.nameA.textContent = d.name;
  applyOppSkins(M.opp);
  updatePips();
  setTimeout(()=>beginRound(1), 550);
}
function endMatch(won){
  if (M.phase === 'ended') return;
  M.phase = 'ended';
  cpuQuiet(); hideBanner();
  el.cdWrap.classList.add('hidden');
  const d = DIFFS[save.diff];
  let reward = 0;
  if (won){ save.stats.w++; reward = d.reward; save.coins += reward; }
  else save.stats.l++;
  persist();
  el.mTrophy.textContent = won ? '🏆' : '💀';
  el.mTitle.textContent = won ? '¡VICTORIA!' : 'DERROTA';
  el.mTitle.className = 'outl ' + (won ? 'mt-win' : 'mt-lose');
  el.mScore.textContent = `TÚ ${M.wins.me} – ${M.wins.opp} ${M.opp.name}`;
  if (won) el.mSub.textContent = `¡Has vencido a ${M.opp.name} al mejor de 3!`;
  else el.mSub.textContent = `${M.opp.name} ha leído tus patrones… ¡cámbialos y revancha!`;
  if (reward > 0){
    el.mReward.classList.add('show');
    el.mRewardNum.textContent = '0';
    animateCount(el.mRewardNum, reward, 900);
    setTimeout(()=>{ Sfx.coin(); bumpCoins(); }, 350);
  } else el.mReward.classList.remove('show');
  el.matchOverlay.classList.add('show');
  if (won){ Sfx.matchWin(); buzz([40,60,40,60]); confetti(); }
  else { Sfx.matchLose(); buzz(120); }
  applySkins();
}
function animateCount(node, target, ms){
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / ms);
    node.textContent = Math.round(target * k);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function goMenu(){
  clearTimeout(T.round); clearTimeout(T.next);
  M.phase = 'idle'; M.pendingReveal = null;
  el.matchOverlay.classList.remove('show');
  $$('.confetti', el.matchOverlay).forEach(c => c.remove());
  resetRoundVisuals(); unlockButtons(); hideBanner();
  el.cdWrap.classList.add('hidden');
  el.footer.classList.add('locked');
  el.nameP.textContent = 'TÚ'; el.nameA.textContent = 'CPU';
  M.wins = { me:0, opp:0 }; updatePips();
  el.menu.classList.remove('hide');
  applySkins();
}
function playAgain(){ startMatch(); }

/* ================== TIENDA ================== */
let shopCat = 'gloves';
function renderShop(){
  $$('.shop-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === shopCat));
  el.coinsShop.textContent = save.coins;
  el.shopGrid.innerHTML = '';
  const cat = shopCat;
  const eqId = save.eq[cat === 'gloves' ? 'glove' : cat === 'sleeves' ? 'sleeve' : 'aura'];
  SKINS[cat].forEach(sk => {
    const owned = save.owned[cat].includes(sk.id);
    const equipped = eqId === sk.id;
    const card = document.createElement('div');
    card.className = 'shop-card' + (equipped ? ' equipped' : owned ? ' owned' : '');
    let prev;
    if (cat === 'auras'){
      prev = `<div class="aura-prev" style="background:radial-gradient(circle, ${hexToRgba(sk.c,.85)} 0%, ${hexToRgba(sk.c,.25)} 55%, transparent 72%)"></div>`;
    } else {
      const st = cat === 'gloves' ? `--glove:${sk.fill}` : `--sleeve:${sk.fill}`;
      prev = `<svg viewBox="0 0 220 220" style="${st}"><use href="#pose-paper"/></svg>`;
    }
    const priceHtml = sk.price === 0 ? '<span class="sprice free">GRATIS</span>'
      : `<span class="sprice">🪙 ${sk.price}</span>`;
    let state;
    if (equipped) state = '<span class="sstate st-equipped">EQUIPADA</span>';
    else if (owned) state = '<span class="sstate st-equip">EQUIPAR</span>';
    else if (save.coins >= sk.price) state = '<span class="sstate st-buy">COMPRAR</span>';
    else state = '<span class="sstate st-poor">SIN MONEDAS</span>';
    card.innerHTML = `<div class="sprev">${prev}</div><div class="sname">${sk.name}</div>${priceHtml}${state}`;
    card.addEventListener('pointerdown', e => { e.preventDefault(); shopClick(cat, sk); });
    el.shopGrid.appendChild(card);
  });
}
function shopClick(cat, sk){
  Sfx.init();
  const eqKey = cat === 'gloves' ? 'glove' : cat === 'sleeves' ? 'sleeve' : 'aura';
  if (save.owned[cat].includes(sk.id)){
    save.eq[eqKey] = sk.id; persist();
    applySkins(); renderShop();
    Sfx.click(); buzz(12);
    toast('✨ ' + sk.name + ' equipada');
  } else if (save.coins >= sk.price){
    save.coins -= sk.price;
    save.owned[cat].push(sk.id);
    save.eq[eqKey] = sk.id; persist();
    applySkins(); renderShop();
    Sfx.buy(); buzz([20,30,20]);
    toast('🎉 ¡Skin desbloqueada: ' + sk.name + '!');
  } else {
    Sfx.sad();
    toast('🪙 Te faltan monedas — ¡gana partidas!', 2200);
  }
}
function openShop(){ renderShop(); el.shop.classList.add('show'); Sfx.click(); }
function closeShop(){ el.shop.classList.remove('show'); Sfx.click(); }

/* ================== MENÚ ================== */
function setDiff(d){
  if (!DIFFS[d]) return;
  save.diff = d; persist();
  $$('.diff-pill', el.diffRow).forEach(b => b.classList.toggle('active', b.dataset.diff === d));
  Sfx.click(); buzz(10);
}
function initMenu(){
  el.nameInput.value = save.name;
  $$('.diff-pill', el.diffRow).forEach(b => {
    b.classList.toggle('active', b.dataset.diff === save.diff);
    b.addEventListener('pointerdown', e => { e.preventDefault(); setDiff(b.dataset.diff); });
  });
  applySkins();
  el.nameInput.addEventListener('change', () => {
    const v = el.nameInput.value.trim().slice(0, 12);
    save.name = v || ('Jugador-' + (100 + Math.floor(Math.random() * 900)));
    el.nameInput.value = save.name;
    persist();
  });
}

/* ================== PANTALLA COMPLETA + ORIENTACIÓN ================== */
async function tryImmersive(){
  const fails = [];
  try{
    const root = document.documentElement;
    if (!document.fullscreenElement){
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI:'hide' });
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      else throw new Error('fullscreen no disponible');
    }
  }catch(e){ fails.push('pantalla completa'); }
  await new Promise(r => setTimeout(r, 80));
  try{
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
  }catch(e){ fails.push('bloquear la orientación horizontal'); }
  if (fails.length) toast('⚠️ Tu navegador no permite ' + fails.join(' ni ') + '.', 3800);
}
let immersiveTried = false;
function beginGame(){
  if (!immersiveTried){ immersiveTried = true; tryImmersive(); }
  startMatch();
}

const isPortrait = () => window.innerHeight > window.innerWidth * 1.02;
function pauseGame(){
  if (M.phase !== 'idle' && M.phase !== 'ended' && !M.paused){
    M.paused = true; clearTimeout(T.round); clearTimeout(T.next);
  }
}
function resumeGame(){
  if (M.paused && !isPortrait() && document.visibilityState === 'visible'){
    M.paused = false;
    if (M.phase === 'count'){
      if (M.remaining <= 0) startChant();
      else scheduleTick(600);
    }
  }
}
function checkOrientation(){
  const p = isPortrait();
  document.body.classList.toggle('portrait', p);
  p ? pauseGame() : resumeGame();
}
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 150));
document.addEventListener('visibilitychange', () => document.hidden ? pauseGame() : resumeGame());
if (!('ontouchstart' in window) && !navigator.maxTouchPoints){
  $('#rotateText').textContent = 'Este juego solo funciona en horizontal: amplia la ventana o gira el móvil 🔄';
}

/* ================== EVENTOS ================== */
const onBtn = window.PointerEvent ? 'pointerdown' : 'click';
$$('.choice-btn').forEach(b => {
  b.addEventListener(onBtn, e => { e.preventDefault(); choose(b.dataset.choice, b); });
});
el.btnPlay.addEventListener(onBtn, e => { e.preventDefault(); beginGame(); });
el.btnShop.addEventListener(onBtn, e => { e.preventDefault(); openShop(); });
el.btnShopClose.addEventListener(onBtn, e => { e.preventDefault(); closeShop(); });
el.btnAgain.addEventListener(onBtn, e => { e.preventDefault(); Sfx.click(); playAgain(); });
el.btnHome.addEventListener(onBtn, e => { e.preventDefault(); Sfx.click(); goMenu(); });
el.btnMute.addEventListener(onBtn, e => {
  e.preventDefault(); e.stopPropagation();
  Sfx.muted = !Sfx.muted;
  el.btnMute.classList.toggle('muted', Sfx.muted);
  if (!Sfx.muted){ Sfx.init(); Sfx.click(); }
});
$$('.shop-tab').forEach(t => {
  t.addEventListener(onBtn, e => { e.preventDefault(); shopCat = t.dataset.cat; renderShop(); Sfx.click(); });
});
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.key === '1' || e.key === '2' || e.key === '3'){
    const c = ['rock','paper','scissors'][+e.key - 1];
    choose(c, $(`.choice-btn[data-choice="${c}"]`));
  } else if (e.key === 'Enter' || e.key === ' '){
    if (el.matchOverlay.classList.contains('show')) playAgain();
    else if (!el.menu.classList.contains('hide')) beginGame();
  }
});
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());

/* ================== ARRANQUE ================== */
el.footer.classList.add('locked');
el.cdWrap.classList.add('hidden');
initMenu();
checkOrientation();

/* API interna para pruebas */
window.__ppt = {
  M, save, Sfx, CpuAI, DIFFS, BEATS, ROUND_SECONDS, SKINS,
  fns: {
    beginRound, tick, choose, startChant, reveal, roundResult, endMatch,
    startMatch, goMenu, playAgain, autoPick, applySkins, setDiff,
    renderShop, shopClick, openShop, closeShop, setPose, beginGame,
  },
};
})();
