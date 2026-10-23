/* DIG DUG - 1982 arcade-style browser tribute for the WTP Arcade.
   Native 224x288 portrait screen. All graphics are hand-authored pixel maps drawn in code,
   all sound is synthesized with Web Audio (Namco WSG-style wavetable). No ROM data or samples. */
"use strict";
(() => {
const W = 224, H = 288, FPS = 60;
const Q = new URLSearchParams(location.search);
const START_ROUND = Math.max(0, parseInt(Q.get("wave") || Q.get("round") || "0", 10) || 0);
const DEBUG = START_ROUND > 0 || Q.has("debug");
const cv = document.getElementById("game"), ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;

/* ---------------- font (5x7, drawn bold like the Namco 8x8 set) ---------------- */
const FONT = {
A:"0e11111f111111",B:"1e11111e11111e",C:"0e11101010110e",D:"1e11111111111e",E:"1f10101e10101f",F:"1f10101e101010",
G:"0e11101711110f",H:"1111111f111111",I:"0e04040404040e",J:"0101010111110e",K:"11121418141211",L:"1010101010101f",
M:"111b1515111111",N:"11191513111111",O:"0e11111111110e",P:"1e11111e101010",Q:"0e11111115120d",R:"1e11111e141211",
S:"0f10100e01011e",T:"1f040404040404",U:"1111111111110e",V:"1111111111110a04".slice(0,14),W:"1111111515150a",X:"11110a040a1111",
Y:"11110a04040404",Z:"1f01020408101f","0":"0e11131519110e","1":"040c040404040e","2":"0e11010204081f","3":"1f02040201110e",
"4":"02060a121f0202","5":"1f101e0101110e","6":"0608101e11110e","7":"1f010204080808","8":"0e11110e11110e","9":"0e11110f01020c",
"-":"0000001f000000",".":"00000000000c0c","!":"04040404040004","©":"0e111719171 10e".replace(" ",""),"/":"01010204081010",
"'":"04040800000000",":":"000c0c000c0c00","=":"00001f001f0000"};
const GLYPH = {};
for (const k in FONT) { const s = FONT[k], rows = []; for (let i = 0; i < 7; i++) rows.push(parseInt(s.substr(i * 2, 2), 16) || 0); GLYPH[k] = rows; }
function text(str, x, y, col, align) {
  str = String(str).toUpperCase();
  if (align === "r") x -= str.length * 8; else if (align === "c") x -= (str.length * 8) >> 1;
  ctx.fillStyle = col;
  for (let i = 0; i < str.length; i++) {
    const g = GLYPH[str[i]]; if (!g) continue;
    for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue;
      for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * 8 + c + 1, y + r, 2, 1); }
  }
}

/* ---------------- sprites (hand-authored pixel maps) ---------------- */
const PAL = { W:"#dedede", B:"#045fcb", b:"#2121de", R:"#fa0500", Y:"#dce205", G:"#00b806", K:"#000000", k:"#212121",
  O:"#ff8c00", r:"#91490 3".replace(" ",""), d:"#512202", y:"#ffb800", P:"#ff6eb4", p:"#ff4040", g:"#7cff3c", w:"#ffffff", n:"#7a3e00", T:"#de9747", V:"#9a28d8" };
function mk(rows, pal) {
  const h = rows.length, w = rows[0].length, c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = rows[j][i]; if (ch !== "." && (pal || PAL)[ch]) { x.fillStyle = (pal || PAL)[ch]; x.fillRect(i, j, 1, 1); } }
  return c;
}
const S = {};
S.dd = [mk([
"................",
"....WWWWW.......",
"...WWWWWWWW.....",
"..WWWWWWBBBB....",
"..WWWWWBBWBBB...",
"..WWWWWBBBBBB...",
"..WWWWWWBBBB....",
"...WWWWWWWW.....",
"....BBWWWWBB....",
"...WWBBWWWBBb...",
"..WWWWBWWWWWb...",
"..WWWWWWWWW.....",
"...WWWWWWWW.....",
"...BBB..WWW.....",
"..BBBB...BBB....",
"................"]), mk([
"................",
"....WWWWW.......",
"...WWWWWWWW.....",
"..WWWWWWBBBB....",
"..WWWWWBBWBBB...",
"..WWWWWBBBBBB...",
"..WWWWWWBBBB....",
"...WWWWWWWW.....",
"....BBWWWWBB....",
"...WWBBWWWBBb...",
"..WWWWBWWWWWb...",
"..WWWWWWWWW.....",
"...WWWWWWWW.....",
"....WWW.BBB.....",
"....BBB.BBBB....",
"................"])];
S.ddPump = mk([
"................",
"....WWWWW.......",
"...WWWWWWWW.....",
"..WWWWWWBBBB....",
"..WWWWWBBWBBB...",
"..WWWWWBBBBBB...",
"..WWWWWWBBBB....",
"...WWWWWWWW.....",
"....BBWWBBBBBBBB",
"...WWWWWWWBBBBBB",
"..WWWWWWWWW.....",
"..WWWWWWWWW.....",
"...WWWWWWWW.....",
"...BBB..WWW.....",
"..BBBB...BBB....",
"................"]);
S.pooka = [mk([
"................",
".....RRRRRR.....",
"...RRRRRRRRRR...",
"..RRRRRRRRRRRR..",
"..RRYYYYYYYYRR..",
".RRYYWWYYWWYYRR.",
".RRYYKWYYKWYYRR.",
".RRRYYYYYYYYRRR.",
".RRRRRRRRRRRRRR.",
".RRRRRRRRRRRRRR.",
"..RRRRRRRRRRRR..",
"..RRRRRRRRRRRR..",
"...RRRRRRRRRR...",
"...YYY....YYY...",
"..YYYY....YYYY..",
"................"]), mk([
"................",
".....RRRRRR.....",
"...RRRRRRRRRR...",
"..RRRRRRRRRRRR..",
"..RRYYYYYYYYRR..",
".RRYYWWYYWWYYRR.",
".RRYYKWYYKWYYRR.",
".RRRYYYYYYYYRRR.",
".RRRRRRRRRRRRRR.",
".RRRRRRRRRRRRRR.",
"..RRRRRRRRRRRR..",
"..RRRRRRRRRRRR..",
"...RRRRRRRRRR...",
"....YYY..YYY....",
"....YYYY.YYYY...",
"................"])];
S.fygar = [mk([
"................",
".........G.G....",
"........GGGGG...",
".......GGGGGGG..",
"......GGGGGRWG..",
".G....GGGGGGGGGG",
".GG..GGGGGGGWWWW",
"..GGGGGGGGGG....",
"..GGGWWWGGGG.G..",
".GGGWWWWWGGGG...",
".GGGWWWWWGG.....",
"..GGWWWWGGG.....",
"...GGGGGGG......",
"...GGG..GGG.....",
"..GGGG..GGGG....",
"................"]), mk([
"................",
".........G.G....",
"........GGGGG...",
".......GGGGGGG..",
"......GGGGGRWG..",
"G.....GGGGGGGGGG",
"GG...GGGGGGGWWWW",
".GGGGGGGGGGG....",
"..GGGWWWGGGG.G..",
".GGGWWWWWGGGG...",
".GGGWWWWWGG.....",
"..GGWWWWGGG.....",
"...GGGGGGG......",
"....GGG.GGG.....",
"....GGGG.GGGG...",
"................"])];
S.eyes = mk([
"................","................","................","................",
"...WWW....WWW...","..WWWWW..WWWWW..","..WWKKW..WWKKW..","..WWKKW..WWKKW..","...WWW....WWW...",
"................","................","................","................","................","................","................"]);
S.rock = mk([
"................",
"......rrr.......",
"....rrTTrrr.....",
"...rTTTrrrrd....",
"..rTTrrrrrrrd...",
"..rTrrrdrrrrd...",
".rrrrrddrrrrrd..",
".rTrrrrrrrrrrd..",
".rrrrrrrrdrrrd..",
"rrrrdrrrrrrrrdd.",
"rrrrrrrrrrrrrrd.",
".rrrrrrrdrrrrdd.",
".ddrrrrrrrrddd..",
"..dddddddddd....",
"................",
"................"]);
S.rockHalf = mk([
"................","................","................","................","................","................",
"................","................","..r..rr...r.....",".rTr.rrd.rTr..r.","rrrd.rrdrrrd.rd.","rrdd..d.rrdd.dd.","................","................","................","................"]);
S.galaxian = mk([
"................","...B....B.......","...B....B.......","...BBBBBB.......","..RRBYYBRR......",".RRRBYYBRRR.....","RR.BBYYBB.RR....",
"R..BYYYYB..R....","R...BYYB...R....","....B..B........","................","................","................","................","................","................"]);
S.flowerS = mk(["..W.W..",".WWWWW.","WWWRWWW",".WWWWW.","..W.W..","...G...","G..G...","GG.G...",".GGG.GG","...GGG.","...G..."]);
S.flowerB = mk(["..R.R..",".RRRRR.","RRRYRRR",".RRRRR.","..R.R..","...G...",".G.G...","..GG.GG","...G...","...G..."]);
const flip = {};
function flipped(c) { if (flip[c.__id]) return flip[c.__id]; const f = document.createElement("canvas"); f.width = c.width; f.height = c.height;
  const x = f.getContext("2d"); x.scale(-1, 1); x.drawImage(c, -c.width, 0); c.__id = c.__id || Math.random(); flip[c.__id] = f; return f; }
// draw sprite at x,y (top-left of 16x16), facing: R L U D, scale around center
function spr(c, x, y, face, sx, sy) {
  sx = sx || 1; sy = sy || sx;
  ctx.save(); ctx.translate(Math.round(x) + 8, Math.round(y) + 8);
  if (face === "U") ctx.rotate(-Math.PI / 2); else if (face === "D") ctx.rotate(Math.PI / 2);
  if (face === "L") ctx.scale(-sx, sy); else ctx.scale(sx, sy);
  ctx.drawImage(c, -8, -8); ctx.restore();
}

/* ---------------- audio: Namco WSG-like wavetable synth ---------------- */
let AC = null, master = null, WAVE = null, WAVE2 = null, noiseBuf = null;
localStorage.removeItem("digdug_muted"); /* build 8: legacy key could be stuck on; sound ON by default */
let muted = localStorage.getItem("digdug_muted_v8") === "1";
const muteBtn = document.getElementById("btn-mute");
function audio() {
  if (AC) { if (AC.state !== "running" && AC.resume) AC.resume().catch(() => {}); if (master) master.gain.value = muted ? 0 : 0.32; return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = AC.createGain(); master.gain.value = muted ? 0 : 0.32; master.connect(AC.destination);
  // 32-sample 4-bit style waves rebuilt as harmonic series (bright pulse-ish lead, soft bass)
  const re = new Float32Array(12), im = new Float32Array(12), im2 = new Float32Array(12);
  [0, 1, .55, .38, .2, .16, .08, .06, .04, .03, .02, .01].forEach((v, i) => im[i] = v);
  [0, 1, .15, .1, .02, 0, 0, 0, 0, 0, 0, 0].forEach((v, i) => im2[i] = v);
  WAVE = AC.createPeriodicWave(re, im); WAVE2 = AC.createPeriodicWave(re, im2);
  noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = noiseBuf.getChannelData(0); let v = 0;
  for (let i = 0; i < d.length; i++) { if (i % 3 === 0) v = Math.random() * 2 - 1; d[i] = v; }
}
function setMute(m) { muted = m; localStorage.setItem("digdug_muted_v8", m ? "1" : "0"); if (master) master.gain.value = m ? 0 : 0.32; if (muteBtn) muteBtn.textContent = m ? "SOUND OFF" : "SOUND ON"; }
if (muteBtn) { muteBtn.textContent = muted ? "SOUND OFF" : "SOUND ON"; muteBtn.addEventListener("click", e => { audio(); setMute(!muted); muteBtn.blur(); }); }
const mf = n => 440 * Math.pow(2, (n - 69) / 12);
function tone(f, t, dur, vol, w, f2) {
  if (!AC || f <= 0 || demo) return;
  const o = AC.createOscillator(), g = AC.createGain();
  if (w === "sq" || w === "triangle" || w === "sawtooth") o.type = w === "sq" ? "square" : w; else o.setPeriodicWave(w === 2 ? WAVE2 : WAVE);
  o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(t, dur, vol, fc, fc2, q) {
  if (!AC || demo) return;
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = "bandpass"; f.Q.value = q || 1; f.frequency.setValueAtTime(fc, t); if (fc2) f.frequency.exponentialRampToValueAtTime(fc2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.linearRampToValueAtTime(0, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}
const now = () => AC ? AC.currentTime + 0.01 : 0;
function seq(notes, step, vol, w, t0) { // notes: [midi, len] ; 0 = rest
  if (!AC) return 0; let t = t0 || now();
  for (const [n, l] of notes) { if (n) tone(mf(n), t, step * l * 0.9, vol, w); t += step * l; }
  return t;
}
// Walking theme (transcribed by ear/FFT from the reference, 8th notes ~ 0.125 s, plays only while moving)
const WALK = [[76,1],[0,1],[81,1],[76,1],[76,1],[74,1],[72,1],[74,1],[67,1],[74,1],[0,1],[74,1],[74,1],[72,1],[71,1],[72,1],
              [76,1],[0,1],[81,1],[76,1],[76,1],[74,1],[72,1],[74,1],[79,1],[77,1],[76,1],[74,1],[72,1],[0,1],[72,1],[0,1]];
const WALK_BASS = [48,55,48,55,43,50,43,50,48,55,48,55,43,50,48,48];
const WALK_STEP = 0.125;
let walkPos = 0, walkAcc = 0;
let demo = false, demoT = 0, dctl = { i: 0, t: 0, dir: null, n: 0 };
function walkTick(dt) { // advance only while Dig Dug moves
  walkAcc -= dt;
  if (walkAcc > 0 || !AC) return;
  walkAcc += WALK_STEP;
  const [n] = WALK[walkPos % WALK.length], t = now();
  if (n) tone(mf(n), t, WALK_STEP * 0.8, 0.13, 1);
  if (walkPos % 2 === 0) tone(mf(WALK_BASS[(walkPos >> 1) % WALK_BASS.length]), t, WALK_STEP * 1.6, 0.11, 2);
  walkPos++;
}
// hurry-up (last enemy) - same motif, faster and a fourth higher, continuous
let hurryOn = false, hurryNext = 0, hurryPos = 0;
function hurryTick() {
  if (!hurryOn || !AC) return;
  const st = 0.085;
  while (hurryNext < AC.currentTime + 0.15) {
    if (hurryNext < AC.currentTime) hurryNext = AC.currentTime + 0.02;
    const [n] = WALK[hurryPos % WALK.length]; if (n) tone(mf(n + 5), hurryNext, st * 0.8, 0.12, 1);
    if (hurryPos % 2 === 0) tone(mf(WALK_BASS[(hurryPos >> 1) % WALK_BASS.length] + 5), hurryNext, st * 1.5, 0.1, 2);
    hurryPos++; hurryNext += st;
  }
}
const sfx = {
  coin() { const t = now(); tone(mf(84), t, 0.05, 0.15, 1); tone(mf(91), t + 0.05, 0.08, 0.15, 1); },
  start() { // opening tune: rising A-minor arpeggio then the "here we go" phrase
    const t = seq([[69,1],[72,1],[76,1],[79,1],[76,1],[72,1],[69,2],[0,4]], 0.075, 0.14, 1);
    seq([[79,2],[80,2],[79,2],[76,2],[74,2],[72,2],[74,2],[76,4],[0,2],[72,2],[74,2],[76,2],[79,6]], 0.09, 0.13, 1, t);
    seq([[45,4],[52,4],[45,4],[52,4],[43,4],[50,4],[48,8]], 0.09, 0.1, 2, t);
  },
  harpoon() { const t = now(); tone(500, t, 0.09, 0.1, "sq", 1500); },
  pump() { const t = now(); tone(mf(64), t, 0.05, 0.14, 1, mf(57)); noise(t, 0.06, 0.12, 3000, 1500, 2); },
  pop() { const t = now(); noise(t, 0.18, 0.35, 2500, 300, 0.7); tone(1200, t, 0.12, 0.12, "sq", 150); },
  rockWobble() { const t = now(); for (let i = 0; i < 4; i++) tone(i % 2 ? 180 : 210, t + i * 0.07, 0.05, 0.08, 1); },
  rockFall() { const t = now(); tone(1400, t, 0.55, 0.1, 1, 350); },
  crush() { const t = now(); noise(t, 0.35, 0.4, 700, 120, 0.6); tone(120, t, 0.25, 0.15, "triangle", 50); },
  fire() { const t = now(); noise(t, 0.45, 0.25, 600, 2400, 1.2); tone(220, t, 0.45, 0.05, "sawtooth", 440); },
  die() { stopMusic(); let t = now();
    const run = [70,69,68,71,68,71,67,66,69,65,69,66,69,65,68,67,64,67,63,62,65,64];
    for (const n of run) { tone(mf(n), t, 0.05, 0.13, 1); t += 0.055; }
    t += 0.1; seq([[74,1],[73,1],[72,1],[0,1],[81,3]], 0.11, 0.13, 1, t); },
  clear() { stopMusic(); seq([[72,1],[76,1],[79,1],[84,2],[79,1],[84,4],[0,2],[86,1],[84,1],[83,1],[84,4]], 0.09, 0.13, 1);
    seq([[48,4],[55,4],[48,4],[43,4],[48,6]], 0.09, 0.1, 2); },
  veg() { seq([[84,1],[88,1],[91,1],[96,2]], 0.06, 0.12, 1); },
  bonus() { const t = now(); for (let i = 0; i < 6; i++) tone(mf(79 + i * 2), t + i * 0.045, 0.05, 0.13, 1); },
  extra() { seq([[79,1],[84,1],[88,1],[91,1],[88,1],[91,3]], 0.07, 0.13, 1); },
  over() { stopMusic(); seq([[72,2],[71,2],[69,2],[67,2],[65,2],[64,2],[62,2],[60,6]], 0.12, 0.13, 1); },
  hiscore() { seq([[72,1],[76,1],[79,1],[84,1],[79,1],[84,3]], 0.1, 0.12, 1); },
};
function stopMusic() { hurryOn = false; }

/* ---------------- playfield ---------------- */
const DIRT_TOP = 40, ROW0 = 32, MW = 112, MH = 116;   // dig mask in 2x2 px cells from y=40..272
let dug = new Uint8Array(MW * MH);
const dirt = document.createElement("canvas"); dirt.width = W; dirt.height = H; const dctx = dirt.getContext("2d");
// 4 strata [base, speckle]; palette changes every 4 rounds (round 1 colours measured from the reference)
const PALETTES = [
  [["#feb800","#c8d80a"],["#dd6800","#ffb800"],["#b72200","#e86e00"],["#970000","#c02800"]],
  [["#ffde97","#ffffff"],["#dea050","#ffde97"],["#b86e2c","#e0a060"],["#7a3e10","#b86e2c"]],
  [["#97de97","#e0ffe0"],["#50b050","#a0e090"],["#288028","#60b040"],["#0a500a","#309030"]],
  [["#de97de","#ffd0ff"],["#b060b0","#de97de"],["#802880","#b060b0"],["#500a50","#802880"]],
  [["#97c8ff","#e0f0ff"],["#5090de","#97c8ff"],["#2860b0","#5090de"],["#0a3080","#2860b0"]],
  [["#dedede","#ffffff"],["#a0a0a0","#dedede"],["#707070","#a8a8a8"],["#404040","#787878"]],
];
const BANDS = [40, 96, 160, 224, 272];
function paletteFor(r) { return PALETTES[Math.floor((r - 1) / 4) % PALETTES.length]; }
function buildDirt(r) {
  const P = paletteFor(r);
  dctx.clearRect(0, 0, W, H);
  for (let b = 0; b < 4; b++) {
    const y0 = BANDS[b], y1 = BANDS[b + 1];
    dctx.fillStyle = P[b][0]; dctx.fillRect(0, y0, W, y1 - y0);
    dctx.fillStyle = P[b][1];
    for (let y = y0 + 2; y < y1; y += 4) for (let x = ((y >> 2) & 1) * 2 + 1; x < W; x += 4) dctx.fillRect(x, y, 1, 1);
  }
  dug.fill(0);
}
function isDug(px, py) {
  px |= 0; py |= 0;
  if (px < 0 || px >= W) return false;
  if (py < DIRT_TOP) return py >= 0;
  if (py >= 272) return false;
  return dug[((py - DIRT_TOP) >> 1) * MW + (px >> 1)] === 1;
}
function digRect(x0, y0, x1, y1) { // inclusive px rect
  x0 = Math.max(0, x0); x1 = Math.min(W - 1, x1); y0 = Math.max(DIRT_TOP, y0); y1 = Math.min(271, y1);
  if (y1 < y0) return;
  for (let y = y0 >> 1; y <= y1 >> 1; y++) for (let x = x0 >> 1; x <= x1 >> 1; x++) {
    const i = (y - (DIRT_TOP >> 1)) * MW + x; if (i >= 0 && i < dug.length) dug[i] = 1; }
  dctx.clearRect(x0 & ~1, y0 & ~1, ((x1 | 1) - (x0 & ~1)) + 1, ((y1 | 1) - (y0 & ~1)) + 1);
}
function dig(x, y) { // a 16x16 sprite position -> 12px wide rounded tunnel
  digRect(x + 3, y + 2, x + 12, y + 13); digRect(x + 2, y + 3, x + 13, y + 12);
}
function digCell(c, r) { dig(c * 16, ROW0 + r * 16); }
function digLine(c0, r0, c1, r1) {
  const sc = Math.sign(c1 - c0), sr = Math.sign(r1 - r0);
  let x = c0 * 16, y = ROW0 + r0 * 16; const X = c1 * 16, Y = ROW0 + r1 * 16;
  for (;;) { dig(x, y); if (x === X && y === Y) break; x += sc * 2; y += sr * 2; }
}

/* ---------------- round setup ---------------- */
let rngS = 1; const rnd = () => ((rngS = (rngS * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const VEG = [["CARROT",400],["TURNIP",600],["MUSHROOM",800],["CUCUMBER",1000],["EGGPLANT",2000],["PEPPER",3000],
             ["TOMATO",4000],["ONION",5000],["WATERMELON",6000],["GALAXIAN",7000],["PINEAPPLE",8000]];
function vegIndex(r) { return r <= 1 ? 0 : r === 2 ? 1 : Math.min(10, Math.floor((r - 3) / 2) + 2); }
function enemyCounts(r) { const total = Math.min(8, 4 + Math.floor((r - 1) / 2)); const fy = Math.min(total - 2, 1 + Math.floor(r / 3)); return [total - fy, fy]; }
// Round 1 layout measured from the reference capture (col,row ; rows 1..14 are dirt)
const ROUND1 = {
  tunnels: [[1,2,1,6],[9,2,11,2],[2,10,5,10],[9,9,9,13]],
  enemies: [["pooka",1,3],["pooka",10,2],["fygar",3,10],["pooka",9,12]],
  rocks: [[4,3],[10,9],[3,11]],
};
function genLayout(r) {
  if (r === 1) return ROUND1;
  rngS = r * 7919 + 13;
  const [np, nf] = enemyCounts(r), L = { tunnels: [], enemies: [], rocks: [] }, used = new Set();
  const occ = (c, rr) => used.has(c + "," + rr);
  const mark = (c, rr) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) used.add((c + a) + "," + (rr + b)); };
  for (let rr = 1; rr <= 8; rr++) used.add("6," + rr), used.add("5,7"), used.add("7,7"), used.add("5," + rr), used.add("7," + rr);
  const types = []; for (let i = 0; i < np; i++) types.push("pooka"); for (let i = 0; i < nf; i++) types.splice(1 + (i * 2) % (types.length), 0, "fygar");
  for (const ty of types) {
    for (let tries = 0; tries < 200; tries++) {
      const horiz = rnd() < 0.55, len = 2 + Math.floor(rnd() * 3);
      const c0 = Math.floor(rnd() * (horiz ? 14 - len : 13)), r0 = 2 + Math.floor(rnd() * (horiz ? 12 : 13 - len));
      const cells = []; for (let k = 0; k <= len; k++) cells.push(horiz ? [c0 + k, r0] : [c0, r0 + k]);
      if (cells.some(([c, rr]) => c > 13 || rr > 14 || occ(c, rr))) continue;
      cells.forEach(([c, rr]) => mark(c, rr));
      L.tunnels.push([cells[0][0], cells[0][1], cells[len][0], cells[len][1]]);
      const m = cells[Math.floor(len / 2)]; L.enemies.push([ty, m[0], m[1]]); break;
    }
  }
  const nr = r < 5 ? 3 : 4;
  for (let tries = 0; tries < 300 && L.rocks.length < nr; tries++) {
    const c = Math.floor(rnd() * 14), rr = 2 + Math.floor(rnd() * 11);
    if (occ(c, rr) || occ(c, rr + 1) || L.rocks.some(([a, b]) => Math.abs(a - c) < 2 && Math.abs(b - rr) < 2)) continue;
    L.rocks.push([c, rr]); used.add(c + "," + rr);
  }
  return L;
}

/* ---------------- game state ---------------- */
const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const OPP = { U: "D", D: "U", L: "R", R: "L" };
let mode = "attract", credits = 0, round = 1, score = 0, lives = 2, nextExtra = 10000, frame = 0, modeT = 0;
let player, enemies = [], rocks = [], harpoon = null, veg = null, pops = [], rocksDropped = 0, vegSpawned = false;
let shots = 0, layout = null, paused = false, firstReady = true, lastMoved = false;
const TABLE_KEY = "digdug_table";
let table; try { table = JSON.parse(localStorage.getItem(TABLE_KEY)); } catch (e) { table = null; }
if (!Array.isArray(table) || table.length !== 5) table = [[10000,"DIG"],[9000,"DUG"],[8000,"POO"],[7000,"KAH"],[6000,"FYG"]];
let high = Math.max(+localStorage.getItem("digdug_high") || 0, table[0][0]);
let entry = null;

function addScore(n) {
  if (demo) { score += n; return; } // attract demo: never touches extra lives, high score or the table
  score += n;
  if (score >= nextExtra) { lives++; sfx.extra(); nextExtra += nextExtra === 10000 ? 40000 : 40000; }
  if (score > high) { high = score; localStorage.setItem("digdug_high", String(high)); }
}
function layerOf(y) { const cy = y + 8; return cy < 96 ? 0 : cy < 160 ? 1 : cy < 224 ? 2 : 3; }
function startGame(r) {
  audio(); round = r || 1; score = 0; lives = 2; nextExtra = 10000; firstReady = true;
  sfx.start(); startRound(true);
}
function startRound(fresh, L) {
  layout = L || genLayout(round);
  buildDirt(round);
  for (const [a, b, c, d] of layout.tunnels) digLine(a, b, c, d);
  // centre shaft dug from the surface to row 7 and the start chamber
  digRect(99, DIRT_TOP, 108, 140); digLine(5, 7, 7, 7);
  rocks = layout.rocks.map(([c, rr]) => ({ x: c * 16, y: ROW0 + rr * 16, st: "idle", t: 0, crushed: [], fell: false }));
  rocksDropped = 0; vegSpawned = false; veg = null;
  spawnActors();
}
function spawnActors() {
  player = { x: 96, y: ROW0 + 7 * 16, face: "R", anim: 0, moveAcc: 0, dead: 0 };
  enemies = layout.enemies.map(([ty, c, rr], i) => mkEnemy(ty, c * 16, ROW0 + rr * 16, i));
  harpoon = null; pops = []; hurryOn = false;
  mode = "ready"; modeT = 0;
}
function mkEnemy(type, x, y, i) {
  return { type, x, y, hx: x, hy: y, dir: i % 2 ? "L" : "R", fx: i % 2 ? -1 : 1, st: "move", acc: 0, inflate: 0, deflT: 0,
    ghostT: ghostDelay() + i * 40, t: 0, anim: 0, fireT: 0, horiz: false, gx: 0, gy: 0, flee: false };
}
const ghostDelay = () => Math.max(150, 540 - round * 25) + Math.floor(Math.random() * 240);
const eSpeed = () => Math.min(0.75, 0.38 + round * 0.025);
const gSpeed = () => Math.min(0.55, 0.26 + round * 0.02);

/* ---------------- input ---------------- */
/* ---------------- attract mode (title -> character intro -> demo play -> best 5 -> loop) ---------------- */
const T_TITLE = 600, T_CHARS = 1150, T_DEMO = T_TITLE + T_CHARS, T_HS = 2000, T_HS_END = 2420;
const DEMO_LAYOUT = {
  tunnels: [[1,2,1,6],[9,2,11,2],[2,10,5,10],[10,11,10,13]],
  enemies: [["pooka",1,4],["pooka",10,2],["fygar",3,10],["pooka",10,12]],
  rocks: [[4,3],[10,9],[12,6]],
};
// scripted joystick: [axis, grid target] | ["wait", frames] | ["fire", facing] | ["pump", timeout]
const DEMO_SCRIPT = [["x",8],["y",10],["x",10],["link",10,10,11],["wait",30],["x",8],["wait",150],["fire",1],["wait",130],
  ["x",5],["pump",260],["y",7],["x",1],["y",6],["pump",320],["wait",1400]];
function startDemo() {
  demo = true; demoT = 0; dctl = { i: 0, t: 0, dir: null, n: 0 };
  round = 1; score = 0; lives = 2; firstReady = false; held.length = 0; touchDir = null; pumpHeld = false;
  startRound(true, DEMO_LAYOUT);
  enemies.forEach((e, i) => { e.ghostT = 1e9; e.frozen = i >= 2; });
  modeT = 40;
}
function endDemo(toHi) {
  demo = false; harpoon = null; enemies = []; rocks = []; pops = []; veg = null; hurryOn = false; player = null;
  round = 1; score = 0; lives = 2; paused = false;
  mode = "attract"; modeT = toHi ? T_HS : 0;
}
function exitAttract() { // any key / tap: leave the attract sequence instantly and show the title / coin screen
  if (demo) endDemo(false); else if (mode === "attract" && modeT > 0) modeT = 0;
}
addEventListener("keydown", () => exitAttract(), true);
addEventListener("pointerdown", () => exitAttract(), true);
function demoDrive() {
  demoT++; dctl.dir = null; pumpEdge = false; pumpHeld = false;
  const a = DEMO_SCRIPT[dctl.i]; if (!a || !player) return;
  dctl.t++; const next = () => { dctl.i++; dctl.t = 0; };
  if (a[0] === "x" || a[0] === "y") {
    const tgt = a[0] === "x" ? a[1] * 16 : ROW0 + a[1] * 16, cur = a[0] === "x" ? player.x : player.y;
    if (cur === tgt || dctl.t > 400) next(); else dctl.dir = a[0] === "x" ? (tgt > cur ? "R" : "L") : (tgt > cur ? "D" : "U");
  } else if (a[0] === "wait") { if (dctl.t >= a[1]) next(); }
  else if (a[0] === "link") { digLine(a[1], a[2], a[1], a[3]); next(); } // join the dug cell to the shaft below the rock
  else if (a[0] === "fire") { const f = enemies.find(e => e.type === "fygar" && e.st === "move"); if (f) { f.fx = a[1]; f.st = "fire"; f.t = 0; } next(); }
  else if (a[0] === "pump") {
    if (dctl.t === 1) dctl.n = liveEnemies().length;
    if (liveEnemies().length < dctl.n || dctl.t > a[1]) { next(); return; }
    if (!harpoon) { if (dctl.t % 24 === 2) pumpEdge = true; } else if (harpoon.st === "hold" && dctl.t % 8 === 0) pumpEdge = true;
  }
}

const held = []; let pumpHeld = false, pumpEdge = false, touchDir = null;
const KEYDIR = { ArrowUp: "U", KeyW: "U", ArrowDown: "D", KeyS: "D", ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R" };
function curDir() { if (demo) return dctl.dir; if (touchDir) return touchDir; return held.length ? held[held.length - 1] : null; }
addEventListener("keydown", e => {
  audio();
  const d = KEYDIR[e.code];
  if (d) { e.preventDefault(); if (!held.includes(d)) held.push(d); if (mode === "entry") entryKey(d); return; }
  if (mode === "entry" && /^Key[A-Z]$/.test(e.code) && !KEYDIR[e.code]) { e.preventDefault(); if (!e.repeat) entryKey("=" + e.code[3]); return; }
  if (e.code === "Space" || e.code === "ControlLeft" || e.code === "ControlRight") { e.preventDefault(); if (!e.repeat) { pumpEdge = true; if (mode === "entry") entryKey("OK"); } pumpHeld = true; return; }
  if (e.repeat) return;
  if (e.code === "Digit5" || e.code === "Numpad5") coin();
  else if (e.code === "Enter" || e.code === "Digit1" || e.code === "Numpad1") { if (mode === "entry") entryKey("OK"); else { if (!credits && e.code === "Enter") coin(); pressStart(); } }
  else if (e.code === "KeyP") { if (mode !== "attract") paused = !paused; }
  else if (e.code === "KeyM") setMute(!muted);
  else if (e.code === "Backquote" && DEBUG) debug.clear();
});
addEventListener("keyup", e => {
  const d = KEYDIR[e.code]; if (d) { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); }
  if (e.code === "Space" || e.code.startsWith("Control")) pumpHeld = false;
});
addEventListener("blur", () => { held.length = 0; pumpHeld = false; touchDir = null; });
function coin() { if (mode === "attract" || mode === "over") { credits = Math.min(9, credits + 1); sfx.coin(); } }
function pressStart() { if (mode === "attract" && credits > 0) { credits--; startGame(1); } }

// touch: d-pad runs while held (slide between directions), big PUMP button, multi-touch via pointer events
const dpad = document.getElementById("dpad"), pumpBtn = document.getElementById("btn-pump");
let touchMode = false;
function setTouch() { if (!touchMode) { touchMode = true; document.body.classList.add("touch"); } }
if ("ontouchstart" in window || navigator.maxTouchPoints > 0) setTouch();
const dpadPtrs = new Map();
function dpadDir(e) {
  const r = dpad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  if (Math.hypot(dx, dy) < r.width * 0.08) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy > 0 ? "D" : "U");
}
function refreshDpad() {
  let d = null; for (const v of dpadPtrs.values()) d = v || d; 
  if (d !== touchDir && mode === "entry" && d) entryKey(d);
  touchDir = d;
  dpad.querySelectorAll(".dp").forEach(b => b.classList.toggle("active", b.dataset.dir === d));
}
if (dpad) {
  dpad.addEventListener("pointerdown", e => { e.preventDefault(); audio(); setTouch(); try { dpad.setPointerCapture(e.pointerId); } catch (_) {} dpadPtrs.set(e.pointerId, dpadDir(e)); refreshDpad(); if (mode === "attract") credits ? pressStart() : coin(); });
  dpad.addEventListener("pointermove", e => { if (dpadPtrs.has(e.pointerId)) { dpadPtrs.set(e.pointerId, dpadDir(e)); refreshDpad(); } });
  const up = e => { dpadPtrs.delete(e.pointerId); refreshDpad(); };
  dpad.addEventListener("pointerup", up); dpad.addEventListener("pointercancel", up); dpad.addEventListener("lostpointercapture", up);
}
if (pumpBtn) {
  pumpBtn.addEventListener("pointerdown", e => { e.preventDefault(); audio(); setTouch(); try { pumpBtn.setPointerCapture(e.pointerId); } catch (_) {}
    pumpBtn.classList.add("active"); pumpHeld = true; pumpEdge = true;
    if (mode === "attract") { credits ? pressStart() : coin(); } else if (mode === "entry") entryKey("OK"); });
  const up = () => { pumpHeld = false; pumpBtn.classList.remove("active"); };
  pumpBtn.addEventListener("pointerup", up); pumpBtn.addEventListener("pointercancel", up); pumpBtn.addEventListener("lostpointercapture", up);
}
cv.addEventListener("pointerdown", e => { audio(); if (e.pointerType !== "mouse") setTouch(); if (mode === "attract") { if (credits) pressStart(); else coin(); } });
const pb = document.getElementById("btn-pause"); if (pb) pb.addEventListener("click", () => { if (mode !== "attract" && !demo) paused = !paused; pb.blur(); });
document.addEventListener("touchstart", e => { if (!e.target.closest("#topbar")) e.preventDefault(); }, { passive: false });
document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("dblclick", e => e.preventDefault());

/* ---------------- player ---------------- */
const aligned = v => (v & 15) === 0;
const alignedY = y => ((y - ROW0) & 15) === 0;
function rockAt(x, y, ignore) { return rocks.find(r => r !== ignore && r.st !== "crumble" && Math.abs(r.x - x) < 14 && Math.abs(r.y - y) < 14); }
function stepPlayer() {
  const p = player; let d = curDir(); let moved = false;
  if (harpoon) { if (d && harpoon.st === "hold") harpoon = null; else d = null; }
  if (d) {
    let md = d;
    const horiz = d === "L" || d === "R";
    if (horiz && !alignedY(p.y)) md = (p.face === "U" || p.face === "D") ? p.face : (((p.y - ROW0) & 15) < 8 ? "U" : "D");
    if (!horiz && !aligned(p.x)) md = (p.face === "L" || p.face === "R") ? p.face : ((p.x & 15) < 8 ? "L" : "R");
    p.moveAcc += 0.5 + (frame & 1 ? 0.06 : 0);  // ~0.53 px/frame, measured from the capture
    while (p.moveAcc >= 1) {
      p.moveAcc -= 1;
      const [dx, dy] = DIRS[md], nx = p.x + dx, ny = p.y + dy;
      if (nx < 0 || nx > 208 || ny < 48 || ny > 256) break;
      if (rockAt(nx + dx * 2, ny + dy * 2)) break;
      p.x = nx; p.y = ny; p.face = md; moved = true; dig(p.x, p.y);
      if (md !== d && ((d === "L" || d === "R") ? alignedY(p.y) : aligned(p.x))) md = d;
    }
    if (moved) p.anim++;
  }
  if (moved) p.walkHold = 4; else if (p.walkHold > 0) p.walkHold--;
  lastMoved = p.walkHold > 0;
  if (lastMoved) walkTick(1 / FPS);
  // pump
  if (pumpEdge) {
    if (!harpoon) { shots++; harpoon = { len: 0, dir: p.face, st: "ext", target: null, pumpT: 0 }; sfx.harpoon(); }
    else if (harpoon.st === "hold") pumpOnce();
  }
  if (harpoon && harpoon.st === "hold" && pumpHeld) { if (++harpoon.pumpT >= 16) pumpOnce(); }
  if (harpoon && harpoon.st === "ext") {
    harpoon.len += 4;
    const [dx, dy] = DIRS[harpoon.dir], cx = p.x + 8, cy = p.y + 8;
    const tx = cx + dx * (6 + harpoon.len), ty = cy + dy * (6 + harpoon.len);
    const hit = enemies.find(e => (e.st === "move" || e.st === "fire" || e.st === "inflate" || (e.st === "flee" && e.fleePh === 2)) &&
      Math.abs(e.x + 8 - tx) < 8 && Math.abs(e.y + 8 - ty) < 8);
    if (hit) { harpoon.st = "hold"; harpoon.target = hit; harpoon.pumpT = 0; hit.st = "inflate"; hit.flee = hit.flee; hit.horiz = dx !== 0; if (hit.inflate < 1) hit.inflate = 1; hit.deflT = 0; sfx.pump(); }
    else if (!isDug(tx, ty) || tx < 0 || tx > W || harpoon.len >= 44) harpoon = null;
  }
  if (harpoon && harpoon.st === "hold") {
    const e = harpoon.target; if (!enemies.includes(e) || e.st !== "inflate") harpoon = null;
    else { const [dx, dy] = DIRS[harpoon.dir]; harpoon.len = Math.max(0, Math.abs(dx ? e.x - p.x : e.y - p.y) - 8); }
  }
}
function pumpOnce() {
  const e = harpoon.target; harpoon.pumpT = 0; e.inflate++; e.deflT = 0; sfx.pump();
  if (e.inflate >= 4) { e.st = "pop"; e.t = 0; sfx.pop(); harpoon = null;
    let pts = [200, 300, 400, 500][layerOf(e.y)]; if (e.type === "fygar" && e.horiz) pts *= 2;
    addScore(pts); pops.push({ x: e.x + 8, y: e.y, txt: String(pts), t: 0 }); }
}

/* ---------------- enemies ---------------- */
function canPass(x, y, d, e) {
  const [dx, dy] = DIRS[d], nx = x + dx * 16, ny = y + dy * 16;
  if (nx < 0 || nx > 208 || ny < 48 || ny > 256) return false;
  for (let k = 4; k <= 16; k += 4) if (!isDug(x + 8 + dx * k, y + 8 + dy * k)) return false;
  if (rockAt(nx, ny)) return false;
  return true;
}
function chooseDir(e) {
  const opts = Object.keys(DIRS).filter(d => canPass(e.x, e.y, d, e));
  if (!opts.length) return null;
  const nr = opts.filter(d => d !== OPP[e.dir]);
  if (!nr.length) return opts[0];
  if (nr.includes(e.dir) && Math.random() < 0.6) return e.dir;
  if (Math.random() < 0.55) { // chase bias
    const best = nr.slice().sort((a, b) => dist2(e, a) - dist2(e, b))[0]; return best; }
  return nr[Math.floor(Math.random() * nr.length)];
}
function dist2(e, d) { const [dx, dy] = DIRS[d]; return (e.x + dx * 16 - player.x) ** 2 + (e.y + dy * 16 - player.y) ** 2; }
function liveEnemies() { return enemies.filter(e => e.st !== "pop" && e.st !== "crushed"); }
function stepEnemies() {
  const live = liveEnemies();
  if (live.length === 1 && !live[0].flee && mode === "play" && live[0].st !== "inflate") { live[0].flee = true; live[0].st = "flee"; live[0].fleePh = 0; hurryOn = true; hurryNext = 0; }
  for (const e of enemies) {
    e.t++; e.anim++;
    if (e.st === "move") {
      if (e.frozen) continue;
      e.acc += eSpeed();
      if (aligned(e.x) && alignedY(e.y) && --e.ghostT <= 0 && player.dead === 0) { e.st = "ghost"; e.gx = e.x; e.gy = e.y; e.t = 0; e.from = e.x + "," + e.y; continue; }
      while (e.acc >= 1) {
        e.acc -= 1;
        if (aligned(e.x) && alignedY(e.y)) { const d = chooseDir(e); if (!d) { e.acc = 0; break; } e.dir = d; }
        const [dx, dy] = DIRS[e.dir]; e.x += dx; e.y += dy; if (dx) e.fx = dx;
      }
      // Fygar fire
      if (e.type === "fygar" && Math.abs(player.y - e.y) < 6 && player.dead === 0 && Math.abs(player.x - e.x) < 72 && Math.random() < 0.006 + round * 0.0005) {
        e.fx = player.x > e.x ? 1 : -1; e.st = "fire"; e.t = 0; }
    } else if (e.st === "fire") {
      if (e.t === 36) sfx.fire();
      if (e.t > 110) { e.st = "move"; e.t = 0; }
    } else if (e.st === "ghost") {
      const tx = player.x, ty = player.y, dx = tx - e.gx, dy = ty - e.gy, m = Math.hypot(dx, dy) || 1;
      e.gx += dx / m * gSpeed(); e.gy += dy / m * gSpeed(); e.x = Math.round(e.gx); e.y = Math.round(e.gy);
      if (dx) e.fx = Math.sign(dx);
      if (e.t > 60) {
        const c = Math.round(e.gx / 16) * 16, r = ROW0 + Math.round((e.gy - ROW0) / 16) * 16;
        if (Math.abs(c - e.gx) < 1 && Math.abs(r - e.gy) < 1 && r >= 48 && (c + "," + r) !== e.from && isDug(c + 8, r + 8) && isDug(c + 3, r + 8) && isDug(c + 12, r + 8) && !rockAt(c, r) ||
            (e.t > 900 && isDug(c + 8, r + 8) && r >= 48)) {
          e.x = c; e.y = r; e.st = "move"; e.ghostT = ghostDelay(); e.t = 0; e.acc = 0;
        }
      }
    } else if (e.st === "flee") {
      if (e.fleePh === 0) { // become eyes and head straight up to the surface
        e.gx = e.x; e.gy = e.y; e.fleePh = 1; }
      if (e.fleePh === 1) {
        const tx = Math.round(e.gx / 16) * 16;
        e.gx += Math.sign(tx - e.gx) * Math.min(Math.abs(tx - e.gx), gSpeed());
        e.gy -= gSpeed() * 1.2; e.x = Math.round(e.gx); e.y = Math.round(e.gy);
        if (e.gy <= ROW0) { e.y = ROW0; e.x = Math.round(e.gx); e.fleePh = 2; e.fx = -1; e.acc = 0; }
      } else if (e.fleePh === 2) {
        e.acc += eSpeed() * 1.1; while (e.acc >= 1) { e.acc -= 1; e.x--; } e.fx = -1;
        if (e.x < -16) { e.st = "crushed"; e.gone = true; }
      }
    } else if (e.st === "inflate") {
      const hooked = harpoon && harpoon.target === e;
      if (++e.deflT > (hooked ? 55 : 40)) { e.deflT = 0; e.inflate--; if (e.inflate <= 0) { e.inflate = 0; e.st = e.flee ? "flee" : "move"; if (hooked) harpoon = null; e.acc = 0; if (!aligned(e.x) || !alignedY(e.y)) { e.x = Math.round(e.x / 16) * 16; e.y = ROW0 + Math.round((e.y - ROW0) / 16) * 16; } } }
    } else if (e.st === "pop") { if (e.t > 24) e.dead = true; }
  }
  enemies = enemies.filter(e => !e.dead && !e.gone);
  // collisions with player
  if (player.dead === 0) for (const e of enemies) {
    const harmful = e.st === "move" || e.st === "ghost" || e.st === "fire" || (e.st === "flee");
    if (harmful && Math.abs(e.x - player.x) < 11 && Math.abs(e.y - player.y) < 11) { killPlayer(); break; }
    if (e.st === "fire" && e.t >= 36) { const len = fireLen(e); const fx0 = e.fx > 0 ? e.x + 14 : e.x + 2 - len, fx1 = fx0 + len;
      if (player.x + 13 > fx0 && player.x + 3 < fx1 && Math.abs(player.y - e.y) < 10) { killPlayer(); break; } }
  }
}
function fireLen(e) { const t = e.t - 36; return t < 0 ? 0 : t < 12 ? 16 : t < 24 ? 32 : 48; }

/* ---------------- rocks / vegetable ---------------- */
const CRUSH = [0, 1000, 2500, 4000, 6000, 8000, 10000, 12000, 15000];
function stepRocks() {
  for (const r of rocks) {
    r.t++;
    if (r.st === "idle") {
      const under = isDug(r.x + 8, r.y + 20) && isDug(r.x + 4, r.y + 20) && isDug(r.x + 11, r.y + 20);
      const pBelow = Math.abs(player.x - r.x) < 12 && player.y > r.y && player.y - r.y < 20;
      if (under && !pBelow) { r.st = "wobble"; r.t = 0; sfx.rockWobble(); }
    } else if (r.st === "wobble") {
      if (r.t > 40) { r.st = "fall"; r.t = 0; r.fell = true; sfx.rockFall(); rocksDropped++; }
    } else if (r.st === "fall") {
      for (let k = 0; k < 2; k++) {
        const below = r.y + 16;
        if (r.y >= 256 || (!isDug(r.x + 8, below + 1) && r.t > 6)) { land(r); break; }
        r.y++;
        for (const e of enemies) if (e.st !== "pop" && e.st !== "crushed" && Math.abs(e.x - r.x) < 12 && e.y - r.y < 14 && e.y - r.y > -4) {
          e.st = "crushed"; e.rock = r; r.crushed.push(e); if (harpoon && harpoon.target === e) harpoon = null; }
        if (player.dead === 0 && Math.abs(player.x - r.x) < 12 && player.y - r.y < 14 && player.y - r.y > 0) killPlayer(r);
      }
      for (const e of r.crushed) { e.y = r.y + 6; e.x = r.x; }
    } else if (r.st === "crumble") { if (r.t > 36) r.dead = true; }
  }
  rocks = rocks.filter(r => !r.dead);
  if (rocksDropped >= 2 && !vegSpawned && mode === "play") { vegSpawned = true; const vi = vegIndex(round); veg = { x: 96, y: ROW0 + 7 * 16, t: 0, i: vi }; sfx.veg(); }
  if (veg) { veg.t++; if (veg.t > 600) veg = null;
    else if (player.dead === 0 && Math.abs(player.x - veg.x) < 10 && Math.abs(player.y - veg.y) < 10) { const v = VEG[veg.i][1]; addScore(v); pops.push({ x: veg.x + 8, y: veg.y, txt: String(v), t: 0 }); veg = null; sfx.bonus(); } }
}
function land(r) {
  r.st = "crumble"; r.t = 0; sfx.crush();
  const n = r.crushed.length;
  if (n) { const pts = CRUSH[Math.min(8, n)]; addScore(pts); pops.push({ x: r.x + 8, y: r.y, txt: String(pts), t: 0 }); }
  for (const e of r.crushed) e.dead = true;
  enemies = enemies.filter(e => !e.dead);
}

/* ---------------- flow ---------------- */
function killPlayer(rock) {
  if (player.dead) return;
  player.dead = 1; player.crushed = !!rock; harpoon = null; hurryOn = false;
  mode = "dying"; modeT = 0; sfx.die();
}
function update() {
  frame++; modeT++;
  for (const p of pops) p.t++; pops = pops.filter(p => p.t < 70);
  if (mode === "attract") {
    if (credits && modeT >= T_TITLE) modeT = T_TITLE - 180; // a credit holds the PUSH START screen
    if (modeT === T_DEMO) startDemo(); else if (modeT >= T_HS_END) modeT = 0;
    return;
  }
  if (mode === "ready") { if (modeT > (firstReady ? 150 : 100)) { mode = "play"; modeT = 0; firstReady = false; } pumpEdge = false; return; }
  if (mode === "play") {
    if (demo) { demoDrive(); if (demoT > 3000) { endDemo(true); return; } }
    stepPlayer(); stepEnemies(); if (mode !== "play") { pumpEdge = false; return; } stepRocks();
    if (!enemies.length && mode === "play") { mode = "clear"; modeT = 0; harpoon = null; sfx.clear(); }
  } else if (mode === "dying") {
    for (const r of rocks) if (r.st === "fall" || r.st === "crumble") { r.t++; if (r.st === "fall") { r.y = Math.min(r.y + 2, 256); if (!isDug(r.x + 8, r.y + 17) || r.y >= 256) land(r); } else if (r.t > 36) r.dead = true; }
    rocks = rocks.filter(r => !r.dead);
    if (modeT > 170 && demo) { endDemo(true); return; }
    if (modeT > 170) {
      if (lives > 0) { lives--; const keep = enemies.length; spawnActors(); enemies = enemies.slice(0, Math.max(keep, 0)); if (!enemies.length) { mode = "clear"; modeT = 0; } }
      else { mode = "over"; modeT = 0; sfx.over(); }
    }
  } else if (mode === "clear") {
    if (modeT > 170) { if (demo) { endDemo(true); return; } round++; startRound(false); }
  } else if (mode === "over") {
    if (modeT > 200) {
      const rank = table.findIndex(t => score > t[0]);
      if (rank >= 0) { entry = { rank, chars: [0, 0, 0], pos: 0 }; mode = "entry"; modeT = 0; pumpEdge = false; held.length = 0; sfx.hiscore(); /* build 8: stale pump/dir input cannot skip initial 1 */ }
      else { mode = "attract"; modeT = 0; }
    }
  }
  pumpEdge = false;
}
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ. ";
function entryKey(k) {
  if (!entry || mode !== "entry" || modeT < 30) return; /* 0.5 s guard */
  if (k.length === 2 && k[0] === "=") { const i = ALPHA.indexOf(k[1]); if (i >= 0) { entry.chars[entry.pos] = i; k = "OK"; } else return; }
  const c = entry.chars;
  if (k === "U") c[entry.pos] = (c[entry.pos] + 1) % ALPHA.length;
  else if (k === "D") c[entry.pos] = (c[entry.pos] + ALPHA.length - 1) % ALPHA.length;
  else if (k === "L") entry.pos = Math.max(0, entry.pos - 1);
  else if (k === "R" || k === "OK") {
    entry.pos++;
    if (entry.pos > 2) {
      table.splice(entry.rank, 0, [score, c.map(i => ALPHA[i]).join("")]); table.length = 5;
      localStorage.setItem(TABLE_KEY, JSON.stringify(table)); entry = null; mode = "attract"; modeT = 0;
    }
  }
}

/* ---------------- drawing ---------------- */
const RED = "#ff0000", WHITE = "#dedede";
function drawHUD() {
  if (mode !== "play" || (frame >> 4) & 1) text("1UP", 24, 0, RED);
  text("HIGH SCORE", 72, 0, RED);
  text(score ? String(score) : "00", 56, 8, WHITE, "r");
  text(String(high || 10000), 136, 8, WHITE, "r");
  text("ROUND", 176, 272, WHITE);
  text(String(round), 216, 280, WHITE, "r");
  if (mode !== "attract") for (let i = 0; i < Math.min(lives, 6); i++) spr(S.dd[0], i * 16, 272, "R", 1);
}
function drawFlowers() {
  let x = 216; const big = Math.floor(round / 10), small = round % 10;
  for (let i = 0; i < small && x > 120; i++) { x -= 9; ctx.drawImage(S.flowerS, x + 1, 29); }
  for (let i = 0; i < big && x > 120; i++) { x -= 12; ctx.drawImage(S.flowerB, x + 2, 30); }
}
function drawY(y) { return y < 48 ? y - (48 - y) / 2 : y; }
function drawEnemy(e) {
  const x = e.x, y = drawY(e.y), fr = (e.anim >> 4) & 1, sp = e.type === "pooka" ? S.pooka[fr] : S.fygar[fr];
  const face = e.fx < 0 ? "L" : "R";
  if (e.st === "ghost" || (e.st === "flee" && e.fleePh === 1)) {
    if (e.st === "flee" || !isDug(x + 8, e.y + 8) || (frame & 8)) spr(S.eyes, x, y, "R"); else spr(sp, x, y, face);
    return;
  }
  if (e.st === "inflate") { const s = 1 + e.inflate * 0.22; spr(sp, x, y, face, s); return; }
  if (e.st === "pop") { if (e.t < 10) spr(sp, x, y, face, 1.9); else { ctx.fillStyle = WHITE; for (let a = 0; a < 8; a++) { const r = 6 + (e.t - 10); ctx.fillRect(x + 8 + Math.cos(a * 0.785) * r, y + 8 + Math.sin(a * 0.785) * r, 2, 2); } } return; }
  if (e.st === "crushed") { spr(sp, x, y + 4, face, 1, 0.5); return; }
  if (e.st === "fire") {
    if (e.t < 36) { if ((e.t >> 2) & 1) spr(sp, x, y, face); else { ctx.globalAlpha = 0.6; spr(sp, x, y, face); ctx.globalAlpha = 1; } return; }
    spr(sp, x, y, face);
    const len = fireLen(e), fx0 = e.fx > 0 ? x + 14 : x + 2 - len;
    for (let i = 0; i < len; i += 4) {
      const h = 3 + Math.min(i, len - i) / 3 + ((i + frame) & 2);
      ctx.fillStyle = i % 8 ? "#ff2000" : "#ffb800"; ctx.fillRect(fx0 + i, y + 8 - h / 2, 4, h);
      ctx.fillStyle = "#ffff80"; ctx.fillRect(fx0 + i + 1, y + 7, 2, 2);
    }
    return;
  }
  spr(sp, x, y, face);
}
function drawVeg(v) {
  const x = v.x, y = v.y, i = v.i;
  if (i === 9) { ctx.drawImage(S.galaxian, x + 2, y + 3); return; }
  const C = [["#ff8c00","#00b806"],["#ffffff","#00b806"],["#ff2000","#ffffff"],["#00b806","#7cff3c"],["#9a28d8","#00b806"],
    ["#00b806","#ffde00"],["#ff2000","#00b806"],["#ffde97","#00b806"],["#00b806","#ff2000"],null,["#ffb800","#00b806"]][i];
  ctx.fillStyle = C[0];
  if (i === 0) { for (let k = 0; k < 10; k++) ctx.fillRect(x + 4 + k * 0.6, y + 4 + k, 6 - k * 0.6, 1); ctx.fillStyle = C[1]; ctx.fillRect(x + 3, y + 1, 2, 4); ctx.fillRect(x + 6, y, 2, 4); }
  else if (i === 2) { ctx.beginPath(); ctx.arc(x + 8, y + 8, 7, Math.PI, 0); ctx.fill(); ctx.fillStyle = C[1]; ctx.fillRect(x + 5, y + 8, 6, 6); ctx.fillRect(x + 5, y + 4, 2, 2); ctx.fillRect(x + 10, y + 3, 2, 2); }
  else if (i === 3) { ctx.fillRect(x + 2, y + 6, 12, 5); ctx.fillStyle = C[1]; for (let k = 3; k < 14; k += 3) ctx.fillRect(x + k, y + 7, 1, 1); }
  else if (i === 4) { ctx.beginPath(); ctx.ellipse(x + 8, y + 9, 5, 6, 0.5, 0, 7); ctx.fill(); ctx.fillStyle = C[1]; ctx.fillRect(x + 9, y + 1, 4, 3); }
  else if (i === 8) { ctx.beginPath(); ctx.arc(x + 8, y + 8, 7, 0, 7); ctx.fill(); ctx.fillStyle = C[1]; ctx.beginPath(); ctx.arc(x + 8, y + 8, 5, 0, 7); ctx.fill(); ctx.fillStyle = "#000"; ctx.fillRect(x + 6, y + 6, 1, 1); ctx.fillRect(x + 9, y + 9, 1, 1); }
  else if (i === 10) { ctx.beginPath(); ctx.ellipse(x + 8, y + 10, 5, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#a06000"; for (let k = 0; k < 4; k++) ctx.fillRect(x + 4 + k * 2, y + 6 + (k & 1) * 3, 1, 6); ctx.fillStyle = C[1]; ctx.fillRect(x + 7, y, 2, 4); ctx.fillRect(x + 4, y + 1, 2, 3); ctx.fillRect(x + 10, y + 1, 2, 3); }
  else { ctx.beginPath(); ctx.arc(x + 8, y + 9, 6, 0, 7); ctx.fill(); ctx.fillStyle = C[1]; ctx.fillRect(x + 7, y, 2, 4); ctx.fillRect(x + 5, y + 2, 6, 1); if (i === 1) { ctx.fillStyle = "#c040c0"; ctx.fillRect(x + 3, y + 5, 10, 3); } }
}
function drawPlay() {
  ctx.fillStyle = "#000197"; ctx.fillRect(0, 0, W, DIRT_TOP);
  ctx.fillStyle = "#000"; ctx.fillRect(0, DIRT_TOP, W, 232); ctx.fillRect(0, 272, W, 16);
  ctx.drawImage(dirt, 0, 0);
  drawFlowers();
  for (const r of rocks) {
    let ox = 0; if (r.st === "wobble") ox = (r.t >> 2) & 1 ? 1 : -1;
    if (r.st === "crumble") { if (r.t < 18) ctx.drawImage(S.rockHalf, r.x, r.y - 4); else if ((r.t >> 2) & 1) ctx.drawImage(S.rockHalf, r.x, r.y); }
    else ctx.drawImage(S.rock, r.x + ox, r.y);
  }
  if (veg && (veg.t < 480 || (veg.t >> 3) & 1)) drawVeg(veg);
  for (const e of enemies) drawEnemy(e);
  // player
  const p = player;
  if (p) {
    if (p.dead) {
      const t = modeT;
      if (p.crushed) spr(S.dd[0], p.x, p.y + 4, p.face, 1, 0.5);
      else if (t < 40) spr(S.dd[0], p.x, p.y, p.face);
      else if (t < 100) spr(S.dd[(t >> 3) & 1], p.x, p.y, "RDLU"[(t >> 3) & 3], 1 - (t - 40) / 90, 1 - (t - 40) / 120);
      else if (t < 130) { ctx.fillStyle = WHITE; ctx.fillRect(p.x + 7, p.y + 7, 2, 2); }
    } else {
      const sp = harpoon ? S.ddPump : S.dd[(p.anim >> 3) & 1];
      spr(sp, p.x, p.y, p.face);
      if (harpoon && harpoon.len > 0) {
        const [dx, dy] = DIRS[harpoon.dir], cx = p.x + 8 + dx * 8, cy = p.y + 8 + dy * 8 + (dx ? 1 : 0), L = harpoon.len;
        ctx.fillStyle = WHITE;
        if (dx) ctx.fillRect(dx > 0 ? cx : cx - L, cy, L, 1); else ctx.fillRect(cx, dy > 0 ? cy : cy - L, 1, L);
        const tx = cx + dx * L, ty = cy + dy * L; ctx.fillStyle = "#ff4040";
        ctx.fillRect(tx - 1 - (dx < 0 ? 1 : 0), ty - 1 - (dy < 0 ? 1 : 0), 3, 3);
      }
    }
  }
  for (const pp of pops) text(pp.txt, pp.x, drawY(pp.y) + 4 - Math.min(pp.t, 20) / 5, WHITE, "c");
  if (mode === "ready" && !demo) { if (firstReady) text("PLAYER 1", 112, 128, WHITE, "c"); text("READY", 112, 168, WHITE, "c"); }
  if (mode === "over" || mode === "dying" && lives === 0 && modeT > 150) text("GAME OVER", 112, 168, WHITE, "c");
  if (paused) text("PAUSE", 112, 168, WHITE, "c");
}
function drawLogo(y) {
  // pink gabled roofs over chunky yellow letters with a dark-orange drop edge (own pixel art)
  const str = "DIG DUG";
  for (let i = 0; i < str.length; i++) { if (str[i] === " ") continue; const x = 26 + i * 24;
    ctx.fillStyle = "#c8389a"; ctx.beginPath(); ctx.moveTo(x - 3, y + 15); ctx.lineTo(x + 10, y + 2); ctx.lineTo(x + 23, y + 15); ctx.fill();
    ctx.fillStyle = "#ff8ed0"; ctx.beginPath(); ctx.moveTo(x - 1, y + 13); ctx.lineTo(x + 10, y + 2); ctx.lineTo(x + 21, y + 13); ctx.fill(); }
  for (const [col, ox, oy] of [["#b04000", 2, 2], ["#ffe020", 0, 0]]) { ctx.fillStyle = col;
    for (let i = 0; i < str.length; i++) { const g = GLYPH[str[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r] & (16 >> c)) ctx.fillRect(26 + i * 24 + c * 4 + ox, y + 16 + r * 4 + oy, 4, 4); } }
}
// title: Dig Dug digs a tunnel from the surface down and under the logo while a Pooka and Fygar stroll above
const TITLE_PATH = [[8, 30], [24, 30], [24, 104], [120, 104]];
function pathAt(d) {
  let acc = 0;
  for (let i = 1; i < TITLE_PATH.length; i++) { const [x0, y0] = TITLE_PATH[i - 1], [x1, y1] = TITLE_PATH[i], L = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    if (d <= acc + L) { const f = (d - acc) / L; return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, x1 > x0 ? "R" : x1 < x0 ? "L" : y1 > y0 ? "D" : "U", i]; }
    acc += L; }
  const e = TITLE_PATH[TITLE_PATH.length - 1]; return [e[0], e[1], "R", TITLE_PATH.length];
}
function drawTitle(t) {
  ctx.fillStyle = "#000197"; ctx.fillRect(0, 16, W, 30);
  ctx.fillStyle = "#dede00"; ctx.fillRect(0, 46, W, 226);
  ctx.fillStyle = "#b8a000"; for (let y = 50; y < 272; y += 6) for (let x = (y / 6 & 1) * 3; x < W; x += 6) ctx.fillRect(x, y, 1, 1);
  const d = Math.max(0, Math.min(400, (t - 20) * 0.75)), [px, py, face, seg] = pathAt(d);
  ctx.fillStyle = "#000";
  for (let i = 1; i <= Math.min(seg, TITLE_PATH.length - 1); i++) {
    const [x0, y0] = TITLE_PATH[i - 1], [ex, ey] = i < seg ? TITLE_PATH[i] : [px, py];
    const top = Math.max(46, Math.min(y0, ey) - 6), bot = Math.max(y0, ey) + 6;
    if (bot > top) ctx.fillRect(Math.min(x0, ex) - 6, top, Math.abs(ex - x0) + 12, bot - top); }
  drawLogo(52);
  spr(S.dd[(t >> 3) & 1], px - 8, py - 8, face);
  const wx = 230 - ((t * 0.4) % 290);
  spr(S.fygar[(t >> 4) & 1], wx, 22, "L"); spr(S.pooka[(t >> 4) & 1], wx + 24, 22, "L");
  ctx.fillStyle = "#ff2000"; ctx.fillRect(150, 20, 52, 9); text("TRIBUTE", 176, 21, "#ffffff", "c");
  // big character portraits
  spr(S.dd[(t >> 4) & 1], 40, 160, "R", 3); spr(S.pooka[(t >> 4) & 1], 112, 166, "L", 2.2); spr(S.fygar[(t >> 4) & 1], 168, 156, "L", 3.2);
  text(credits ? "PUSH START BUTTON" : "INSERT COIN", 112, 204, (t >> 5) & 1 ? "#000197" : "#ff0000", "c");
  text("1 PLAYER  1 COIN", 112, 218, "#000197", "c");
  text("1ST BONUS 10000 PTS", 112, 230, "#000197", "c");
  text("AND EVERY 40000 PTS", 112, 240, "#000197", "c");
  text("© 1982 STYLE FAN TRIBUTE", 112, 256, "#000197", "c");
}
// character introduction + scoring demonstration
function drawChars(t) {
  drawLogo(30);
  text("CHARACTER", 112, 94, "#ffe020", "c");
  const Y = 128, DX = Math.max(104, 224 - t);
  const ddFace = t < 120 ? "L" : t < 440 ? "L" : "R", walking = t < 120;
  // Pooka: appears, gets pumped and bursts
  if (t >= 130) {
    if (t < 410) { const inf = t < 290 ? 0 : Math.min(4, 1 + ((t - 290) / 30 | 0)); spr(S.pooka[(t >> 4) & 1], 40, Y, "R", 1 + inf * 0.22); }
    else if (t < 434) { ctx.fillStyle = WHITE; for (let a = 0; a < 8; a++) { const r = 6 + (t - 410); ctx.fillRect(48 + Math.cos(a * 0.785) * r, Y + 8 + Math.sin(a * 0.785) * r, 2, 2); } }
    if (t >= 410 && t < 540) text("200", 48, Y + 2, WHITE, "c");
    text("POOKA", 48, Y + 28, "#ffe020", "c");
  }
  // harpoon from Dig Dug to the Pooka
  if (t >= 260 && t < 410) { const L = Math.min(44, (t - 260) * 4); ctx.fillStyle = WHITE; ctx.fillRect(DX - L, Y + 9, L, 1); ctx.fillStyle = "#ff4040"; ctx.fillRect(DX - L - 2, Y + 8, 3, 3); }
  spr(t >= 260 && t < 410 ? S.ddPump : S.dd[walking ? (t >> 3) & 1 : 0], DX, Y, ddFace);
  // Fygar: appears, flashes, breathes fire, then a rock drops on it
  if (t >= 190) {
    const crushed = t >= 668, fy = 168;
    if (!crushed) {
      const flashing = t >= 460 && t < 496;
      if (!flashing || ((t >> 2) & 1)) spr(S.fygar[(t >> 4) & 1], fy, Y, "L");
      if (t >= 496 && t < 590) { const len = t < 508 ? 16 : t < 520 ? 32 : 48, fx0 = fy + 2 - len;
        for (let i = 0; i < len; i += 4) { const h = 3 + Math.min(i, len - i) / 3 + ((i + frame) & 2);
          ctx.fillStyle = i % 8 ? "#ff2000" : "#ffb800"; ctx.fillRect(fx0 + i, Y + 8 - h / 2, 4, h); ctx.fillStyle = "#ffff80"; ctx.fillRect(fx0 + i + 1, Y + 7, 2, 2); } }
    } else if (t < 720) spr(S.fygar[0], fy, Y + 4, "L", 1, 0.5);
    if (t >= 610) { // rock: wobble, fall, crumble
      const ry = t < 650 ? Y - 40 : Math.min(Y - 6, Y - 40 + (t - 650) * 2), ox = t < 650 ? ((t >> 2) & 1 ? 1 : -1) : 0;
      if (t < 700) ctx.drawImage(S.rock, fy + ox, ry); else if (t < 740 && (t >> 2) & 1) ctx.drawImage(S.rockHalf, fy, Y - 6);
    }
    if (t >= 700 && t < 860) text("1000", 176, Y + 2, WHITE, "c");
    text("FYGAR", 176, Y + 28, "#ffe020", "c");
  }
  if (t >= 760) {
    text("PUMP  200 - 1000 PTS", 112, 176, "#dedede", "c");
    text("ROCK  1000 - 15000 PTS", 112, 190, "#dedede", "c");
  }
  text("© 1982 STYLE TRIBUTE", 112, 222, "#dedede", "c");
  text("FAN MADE - WTP ARCADE", 112, 238, "#ff2000", "c");
}
function drawBest5() {
  drawLogo(30);
  text("BEST 5", 112, 100, "#ff0000", "c");
  text("SCORE", 104, 120, "#ffe020", "r"); text("NAME", 136, 120, "#ffe020");
  const ord = ["1ST", "2ND", "3RD", "4TH", "5TH"];
  table.forEach((t, i) => { const y = 140 + i * 18; text(ord[i], 24, y, "#dedede"); text(String(t[0]), 112, y, "#dedede", "r"); text(t[1], 144, y, "#ff0000"); });
  text("© 1982 STYLE TRIBUTE", 112, 240, "#dedede", "c");
}
function drawAttract() {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  if (modeT < T_TITLE) drawTitle(modeT);
  else if (modeT < T_DEMO) drawChars(modeT - T_TITLE);
  else drawBest5();
  text("CREDIT " + credits, 16, 272, WHITE);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, 16);
  drawHUD();
}
function drawEntry() {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); drawHUD();
  text("ENTER YOUR INITIALS", 112, 80, "#ff0000", "c");
  text("SCORE " + score, 112, 104, WHITE, "c");
  for (let i = 0; i < 3; i++) text(ALPHA[entry.chars[i]], 96 + i * 12, 136, i === entry.pos && (frame & 16) ? "#ffde00" : WHITE);
  text("UP/DOWN  LETTER", 112, 176, "#a0a0ff", "c");
  text("PUMP  NEXT", 112, 192, "#a0a0ff", "c");
}
function draw() {
  if (mode === "attract") drawAttract();
  else if (mode === "entry") drawEntry();
  else { drawPlay(); drawHUD(); if (mode === "clear" && modeT > 40) text("ROUND CLEAR", 112, 168, WHITE, "c"); }
}

/* ---------------- loop ---------------- */
let last = performance.now(), accT = 0;
function loop(t) {
  accT += Math.min(100, t - last); last = t;
  while (accT >= 1000 / FPS) { accT -= 1000 / FPS; if (!paused) update(); }
  if (!paused) hurryTick();
  draw();
  requestAnimationFrame(loop);
}
// debug hooks used by the automated tests (?wave=N jumps straight to round N)
const debug = {
  skipIntro() { if (mode === "ready") { mode = "play"; modeT = 0; firstReady = false; } },
  enemyAhead() { // put the nearest enemy two tiles ahead of Dig Dug in an open tunnel
    const e = liveEnemies()[0]; if (!e) return; const p = player;
    p.x = 96; p.y = ROW0 + 7 * 16; p.face = "R"; harpoon = null; digLine(6, 7, 8, 7);
    e.x = 128; e.y = p.y; e.st = "move"; e.acc = -9999; e.ghostT = 99999; e.flee = false; hurryOn = false;
  },
  rockOverEnemy() { const e = liveEnemies()[0]; if (!e) return; e.x = 32; e.y = ROW0 + 11 * 16; e.st = "move"; e.acc = -9999; e.ghostT = 99999; digLine(2, 9, 2, 12);
    rocks.push({ x: 32, y: ROW0 + 8 * 16, st: "idle", t: 0, crushed: [], fell: false }); },
  clear() { enemies = []; },
  veg() { rocksDropped = 2; vegSpawned = true; digLine(6, 7, 8, 7); player.x = 128; player.y = ROW0 + 7 * 16; player.face = "L"; veg = { x: 96, y: ROW0 + 7 * 16, t: 0, i: vegIndex(round) }; sfx.veg(); },
  mode(m) { mode = m; },
  setScore(n) { score = n; },
  endGame() { lives = 0; killPlayer(); },
};
window.DIGDUG = {
  get state() { return { mode, demo, attract: mode === "attract" ? (modeT < T_TITLE ? "title" : modeT < T_DEMO ? "characters" : "best5") : demo ? "demo" : null,
    demoStep: dctl.i, table: table.map(t => t.slice()), round, score, lives, credits, high, rocksDropped, paused, muted,
    player: player && { x: player.x, y: player.y, face: player.face, dead: player.dead },
    enemies: enemies.map(e => ({ type: e.type, x: e.x, y: e.y, st: e.st, inflate: e.inflate })),
    rocks: rocks.map(r => ({ x: r.x, y: r.y, st: r.st })), veg: veg && { i: veg.i, name: VEG[veg.i][0] }, harpoon: harpoon && { st: harpoon.st, len: harpoon.len }, walking: lastMoved, shots }; },
  build: 8, audio: () => (AC ? AC.state : "none"), entry: () => entry && { pos: entry.pos, letters: entry.chars.map(i => ALPHA[i]).join(""), t: modeT },
  debug: DEBUG ? debug : undefined,
};
if (START_ROUND) { credits = 1; mode = "attract"; credits--; round = START_ROUND; score = 0; lives = 2; startRound(true); }
requestAnimationFrame(loop);
  // -- Audio unlock (sound ON by default): first tap/click/key anywhere resumes Web Audio --
  (function () {
    function silentWav() {
      const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
      const s = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
      s(0, "RIFF"); v.setUint32(4, 36 + n, true); s(8, "WAVEfmt "); v.setUint32(16, 16, true);
      v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
      v.setUint16(32, 1, true); v.setUint16(34, 8, true); s(36, "data"); v.setUint32(40, n, true); b.fill(128, 44);
      let str = ""; for (let i = 0; i < b.length; i++) str += String.fromCharCode(b[i]);
      return "data:audio/wav;base64," + btoa(str);
    }
    let tag = null, kicked = null;
    function onGesture() {
      try { if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback"; } catch (_) {}
      try { if (!tag) { tag = new Audio(silentWav()); tag.setAttribute("playsinline", ""); tag.loop = true; tag.volume = 0.01; } if (tag.paused) { const p = tag.play(); if (p && p.catch) p.catch(function () {}); } } catch (_) {}
      try { audio(); } catch (_) {}
      try {
        const c = AC;
        if (c) {
          if (c.state !== "running" && c.resume) c.resume().catch(function () {});
          if (kicked !== c) { kicked = c; const sb = c.createBuffer(1, 1, 22050), src = c.createBufferSource(); src.buffer = sb; src.connect(c.destination); src.start(0); }
        }
      } catch (_) {}
    }
    ["pointerdown", "touchstart", "touchend", "mousedown", "click", "keydown"].forEach(function (t) {
      window.addEventListener(t, onGesture, { capture: true, passive: true });
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { try { const c = AC; if (c && c.state === "suspended") c.resume().catch(function () {}); } catch (_) {} } });
    window.__audioInfo = function () { const c = AC; return { ctx: c ? c.state : "none", muted: muted }; };
  })();

})();
