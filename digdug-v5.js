/**
 * DIG DUG — 1982 Namco arcade recreation (Build V5)
 * Arcade-faithful 14-col boards: 15 unique start layouts + post-15 cycle of 12–15.
 * Rounder Pac-Man-hybrid sprites, capsule tunnels, solid Web Audio (await resume + musicLock).
 * Hand-authored canvas + synth only — no ROM / samples. Live: https://bamtec70.github.io/dig-dug-game/
 */
(() => {
  "use strict";

  const TILE = 48;
  const PX = TILE / 16; // 3 — original sprites are 16×16
  const COLS = 14;
  const ROWS = 18;
  const W = COLS * TILE;
  const H = ROWS * TILE;
  const SURFACE = 2; // arcade dirt starts at row 2 (sky 0–1)

  const EMPTY = 0, DIRT = 1, ROCK = 2;

  // Namco layer colors (gold / orange / brick / dark maroon)
  const DIRT_COLS = ["#f8bc10", "#e06818", "#c83820", "#681010"];

  const L = { x: -1, y: 0, id: "L" };
  const R = { x: 1, y: 0, id: "R" };
  const U = { x: 0, y: -1, id: "U" };
  const D = { x: 0, y: 1, id: "D" };
  const ORDER = [U, L, D, R];
  const OPP = { L: R, R: L, U: D, D: U };
  const DIR_BY_ID = { L, R, U, D };

  const POP_LAYER = [200, 300, 400, 500];
  const ROCK_PTS = [0, 1000, 2500, 4000, 6000, 8000, 10000, 12000];

  // Arcade ~60.6 Hz, 16px tiles. Ours are 48px (3×). Dig Dug is slower than Pac-Man;
  // Pookas can run him down in tunnels; digging is clearly slower; ghosts drift.
  const SPD_DIG = 118;       // tunnel / surface
  const SPD_DIG_DIRT = 70;   // carving dirt
  const SPD_ENEMY = 132;     // slightly faster than Dig Dug (Pookas)
  const SPD_GHOST = 82;
  const SPD_ROCK = 190;
  const WALK_NOTE_PX = TILE * 0.4; // a bit under half a tile — walk tune sits on the step, not behind it

  const PAL = {
    k: "#000000",
    w: "#fcfcfc",
    b: "#2038f0",
    n: "#78b8f8",
    r: "#e02018",
    o: "#f84810",
    y: "#f8d018",
    g: "#20c020",
    a: "#148014",
    s: "#f8f070",
    d: "#c07028",
    t: "#e0a050",
    m: "#804018",
    e: "#f83000",
    f: "#f8f020",
    u: "#e8e8e8",
    p: "#f89088",
    h: "#f87858",
    c: "#40e040",
    i: "#a01810",
    q: "#f8f8a8",
    z: "#58c0ff",
  };

  // 16×16 pixel sprites — BUILD V5 rounder Pac-Man-hybrid silhouettes
  const SPR = {
    ddR0: [
      "................",
      ".....wwwww......",
      "....wwwwwww.....",
      "...wwwnnnwwww...",
      "...wwkwwwkwww...",
      "...wwwwwwwwww...",
      "....wwwwwwwwu...",
      "...wwbbbbbwwuu..",
      "...bbbbbbbb.u...",
      "...bbb..bbb.....",
      "...rr....rr.....",
      "....rr..rr......",
      "................",
      "................",
      "................",
      "................",
    ],
    ddR1: [
      "................",
      ".....wwwww......",
      "....wwwwwww.....",
      "...wwwnnnwwww...",
      "...wwkwwwkwww...",
      "...wwwwwwwwww...",
      "....wwwwwwwwu...",
      "...wwbbbbbwwuu..",
      "...bbbbbbbb.u...",
      "....bb..bb......",
      "....rr..rr......",
      "...rr....rr.....",
      "................",
      "................",
      "................",
      "................",
    ],
    ddU0: [
      "................",
      ".....wwwww......",
      "....wwwwwww.....",
      "...wwwnnnwwww...",
      "...wwwwwwwwww...",
      "...wwkwwwkwww...",
      "....wwwwwwww....",
      "...bbbwwwbbb....",
      "...bbbb.bbbb....",
      "...bb.....bb....",
      "...rr.....rr....",
      "....rr...rr.....",
      "................",
      "................",
      "................",
      "................",
    ],
    ddU1: [
      "................",
      ".....wwwww......",
      "....wwwwwww.....",
      "...wwwnnnwwww...",
      "...wwwwwwwwww...",
      "...wwkwwwkwww...",
      "....wwwwwwww....",
      "...bbbwwwbbb....",
      "....bbb.bbb.....",
      "....bb...bb.....",
      "....rr...rr.....",
      "...rr.....rr....",
      "................",
      "................",
      "................",
      "................",
    ],
    ddD0: [
      "................",
      ".....wwwww......",
      "....wwkwwwkw....",
      "...wwwwwwwwww...",
      "...wwwnnnwwww...",
      "...wwwwwwwwww...",
      "....wwwwwwww....",
      "...bbbwwwbbb....",
      "...bbbb.bbbb....",
      "...bb.....bb....",
      "...rr.....rr....",
      "....rr...rr.....",
      "................",
      "................",
      "................",
      "................",
    ],
    ddPump: [
      "................",
      ".....wwwww......",
      "....wwwwwww.....",
      "...wwwnnnwwww...",
      "...wwkwwwkwww...",
      "...wwwwwwwwww...",
      "....wwwwwwwwuuu.",
      "...wwbbbbbwwuuu.",
      "...bbbbbbbb.....",
      "...bbb..bbb.....",
      "...rr....rr.....",
      "....rr..rr......",
      "................",
      "................",
      "................",
      "................",
    ],
    ddDead: [
      "................",
      "................",
      "......r..r......",
      ".......rr.......",
      "......r..r......",
      "....wwwwwww.....",
      "...wwwwwwwww....",
      "...bbbwwwbbb....",
      "....bbbbbbb.....",
      ".....rr.rr......",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    pooka0: [
      "................",
      ".....oooooo.....",
      "....oooooooo....",
      "...ooyyyyyyoo...",
      "..ooyywwkkyyoo..",
      "..ooyywwkkyyoo..",
      "...ooyyyyyyoo...",
      "....oooooooo....",
      ".....oooooo.....",
      "......oo.oo.....",
      ".....yyyyyy.....",
      "....yyyyyyyy....",
      "................",
      "................",
      "................",
      "................",
    ],
    pooka1: [
      "................",
      ".....oooooo.....",
      "....oooooooo....",
      "...ooyyyyyyoo...",
      "..ooyywwkkyyoo..",
      "..ooyywwkkyyoo..",
      "...ooyyyyyyoo...",
      "....oooooooo....",
      ".....oooooo.....",
      "......oo.oo.....",
      "....yyyy..yyyy..",
      "...yyyyyyyyyyyy.",
      "................",
      "................",
      "................",
      "................",
    ],
    pookaGhost: [
      "................",
      "................",
      "....yyyyyyyy....",
      "...yywwkkwyyy...",
      "...yywwkkwyyy...",
      "....yyyyyyyy....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    fygar0: [
      "................",
      ".......aa.......",
      "......gaga......",
      "....gggggggg....",
      "...syyyyygggg...",
      "..sykkyyygggga..",
      "..ssssssssaggg..",
      "...gggggggggg...",
      "....ggg..ggg....",
      "....yy....yy....",
      "...yyy....yyy...",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    fygar1: [
      "................",
      "......aa........",
      ".....gaga.......",
      "....gggggggg....",
      "...syyyyygggg...",
      "..sykkyyygggga..",
      "..ssssssssaggg..",
      "...gggggggggg...",
      ".....gg..ggg....",
      ".....y....yy....",
      "....yy....yyy...",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    fygarGhost: [
      "................",
      "................",
      ".....ssssss.....",
      "....sswkkwws....",
      "....sswkkwws....",
      ".....ssssss.....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    rock: [
      "................",
      ".....mmmmmm.....",
      "....mttttttm....",
      "...mtddddddtm...",
      "...mdwwkkwwdm...",
      "...mdwwkkwwdm...",
      "...mddddddddm...",
      "....mddddddm....",
      ".....mmmmmm.....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    crush: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "....oooooooo....",
      "...ooyyyyyyoo...",
      "....oooooooo....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    flower: [
      "................",
      ".....ryry.......",
      "....rywyry......",
      ".....ryry.......",
      "......a.........",
      "......a.........",
      "......a.........",
      ".....aaa........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    fire0: [
      "................",
      "........f.......",
      "......feef......",
      "....feeeee......",
      "...feeeeeef.....",
      "....eeeeee......",
      ".....feef.......",
      "......f.........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    fire1: [
      "................",
      ".......f.f......",
      ".....feefe......",
      "....eeeeeee.....",
      "...feeeeeeee....",
      "....eeeeefe.....",
      ".....f.f........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    carrot: [
      "......a.a.......",
      ".......a........",
      "......oo........",
      ".....oooo.......",
      ".....oooo.......",
      "....oooo........",
      "....ooo.........",
      "...ooo..........",
      "...oo...........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    turnip: [
      "......a.a.......",
      ".......a........",
      ".....wwwww......",
      "....wwwwwww.....",
      "....pwwwwwp.....",
      ".....ppppp......",
      "......ppp.......",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    mushroom: [
      ".....rrrrr......",
      "....rrwrrwr.....",
      "...rrrrrrrrr....",
      "....wwwwwww.....",
      ".....wwwww......",
      ".....wwwww......",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    cucumber: [
      ".......aa.......",
      "......ggg.......",
      "......ggg.......",
      ".....gcgcg......",
      ".....ggggg......",
      ".....gcgcg......",
      "......ggg.......",
      "......ggg.......",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    eggplant: [
      ".......a........",
      "......aaa.......",
      ".....ppppp......",
      "....ppppppp.....",
      "....ppppppp.....",
      ".....ppppp......",
      "......ppp.......",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    pepper: [
      ".......a........",
      "......ggg.......",
      ".....ggggg......",
      ".....gcgcg......",
      ".....ggggg......",
      "......ggg.......",
      "......gg........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    tomato: [
      ".......a........",
      ".....rrrrr......",
      "....rrrrrrr.....",
      "....rrwrrrr.....",
      "....rrrrrrr.....",
      ".....rrrrr......",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    garlic: [
      ".......a........",
      ".....wwwww......",
      "....wwqwwqw.....",
      "....wwwwwww.....",
      ".....wqwqw......",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    melon: [
      ".....aaaaa......",
      "....aggggga.....",
      "....gcgcgcg.....",
      "....ggggggg.....",
      "....gcgcgcg.....",
      ".....ggggg......",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    galaxian: [
      ".......y........",
      "......yyy.......",
      "....y.yry.y.....",
      "...yyyyryyyy....",
      "....y..y..y.....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    pineapple: [
      "......aaa.......",
      ".....ayaya......",
      "......yyy.......",
      ".....yqyqy......",
      ".....yyyyy......",
      ".....yqyqy......",
      "......yyy.......",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;
  document.documentElement.style.setProperty("--board-w", W + "px");
  document.documentElement.style.setProperty("--board-h", H + "px");

  const $score = document.getElementById("score");
  const $high = document.getElementById("high-score");
  const $level = document.getElementById("level");
  const $lives = document.getElementById("lives");
  const $veg = document.getElementById("veg-tray");
  const overlay = document.getElementById("overlay");
  const $title = document.getElementById("overlay-title");
  const $sub = document.getElementById("overlay-sub");
  const $hint = document.getElementById("overlay-hint");
  const $ctrl = document.getElementById("overlay-controls");

  let audio = null, master = null, namcoWave = null, muted = false, noiseBuf = null;
  let walkStep = 0, walkDist = 0;
  let musicLockUntil = 0;

  // Yuriko Keino / Namco WSG-style walking theme (melody + boom-chuck bass) — V4 retune
  const WALK_MEL = [
    784, 784, 740, 784, 784, 784, 740, 784,
    659, 587, 659, 587, 698, 587, 659, 587,
    659, 659, 622, 659, 659, 659, 622, 659,
    587, 659, 587, 698, 587, 784, 880, 784,
  ];
  const WALK_BASS = [
    196, 294, 196, 294, 185, 294, 185, 294,
    175, 262, 175, 262, 165, 262, 165, 262,
    156, 233, 156, 233, 147, 233, 147, 233,
    147, 220, 147, 220, 165, 247, 185, 262,
  ];
  // Last-enemy "bye-bye" rising phrase
  const HURRY_MEL = [698, 698, 587, 622, 698, 784, 880, 932, 1047, 1245, 1245, 1047];
  const HURRY_BASS = [311, 175, 311, 175, 311, 175, 175, 175, 175, 175, 175, 175];

  function lockMusic(sec) {
    if (!audio) return;
    musicLockUntil = Math.max(musicLockUntil, audio.currentTime + sec);
  }
  function musicLocked() {
    return !!(audio && audio.currentTime < musicLockUntil);
  }

  async function unlockAudio() {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      master = audio.createGain();
      master.gain.value = 0.78;
      master.connect(audio.destination);
      const n = 32;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let i = 1; i < n; i++) {
        imag[i] = (1 / i) * Math.sin(i * Math.PI * 0.28);
      }
      try { namcoWave = audio.createPeriodicWave(real, imag); }
      catch (err) { namcoWave = null; }
    }
    if (audio.state === "suspended") {
      try { await audio.resume(); } catch (err) { /* ignore */ }
    }
    if (!noiseBuf && audio) {
      const n = audio.sampleRate * 0.3 | 0;
      noiseBuf = audio.createBuffer(1, n, audio.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return audio;
  }
  function dest() { return master || audio.destination; }
  function tone(freq, dur, type = "square", vol = 0.035, when = 0, slideTo) {
    if (muted || !audio) return;
    const t = audio.currentTime + when;
    const o = audio.createOscillator();
    const g = audio.createGain();
    if (type === "namco" && namcoWave) o.setPeriodicWave(namcoWave);
    else o.type = type === "namco" ? "triangle" : type;
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slideTo != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(vol * 0.4, t + Math.min(0.05, dur * 0.4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest());
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol = 0.03, when = 0, filterFreq = 800) {
    if (muted || !audio || !noiseBuf) return;
    const t = audio.currentTime + when;
    const src = audio.createBufferSource();
    src.buffer = noiseBuf;
    const f = audio.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterFreq;
    const g = audio.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest());
    src.start(t); src.stop(t + dur + 0.02);
  }
  function seq(notes, type = "namco", vol = 0.04) {
    let t = 0;
    for (const n of notes) {
      const [f, d, gap = 0] = n;
      if (f > 0) tone(f, d, type, vol, t);
      t += d + gap;
    }
  }
  function walkNote(pxPerSec) {
    if (musicLocked()) return;
    const last = typeof aliveEnemies === "function" && enemies && aliveEnemies().length === 1;
    const mel = last ? HURRY_MEL : WALK_MEL;
    const bass = last ? HURRY_BASS : WALK_BASS;
    const i = walkStep % mel.length;
    walkStep++;
    const interval = WALK_NOTE_PX / Math.max(50, pxPerSec || SPD_DIG);
    const dur = Math.max(0.12, Math.min(0.26, interval * 1.15));
    tone(mel[i], dur, "namco", 0.052);
    tone(bass[i], dur + 0.025, "triangle", 0.034);
    if (i % 4 === 0) tone(bass[i] * 0.5, dur + 0.03, "sine", 0.018);
  }
  function sfx(name, arg) {
    if (!audio) unlockAudio();
    if (muted || !audio) return;
    if (name === "walk") {
      walkNote(arg);
    } else if (name === "dig") {
      if (musicLocked()) return;
      noise(0.04, 0.028, 0, 520 + Math.random() * 320);
      tone(62 + Math.random() * 18, 0.04, "triangle", 0.02);
      tone(110 + Math.random() * 20, 0.025, "square", 0.01);
    } else if (name === "harpoon") {
      tone(440, 0.1, "square", 0.048, 0, 1500);
      tone(880, 0.06, "namco", 0.022, 0.02, 1600);
      noise(0.07, 0.024, 0, 2000);
    } else if (name === "pump") {
      const stage = Math.max(1, Math.min(4, arg || 1));
      const f0 = 200 + stage * 85;
      tone(f0, 0.1, "square", 0.05, 0, f0 * 1.6);
      tone(f0 * 0.5, 0.09, "triangle", 0.028);
      tone(f0 * 1.5, 0.06, "namco", 0.018, 0.02);
      noise(0.055, 0.022, 0, 1800);
    } else if (name === "pop") {
      noise(0.18, 0.065, 0, 2400);
      tone(990, 0.08, "square", 0.05, 0, 200);
      tone(740, 0.11, "namco", 0.042, 0.03, 130);
      tone(370, 0.14, "triangle", 0.03, 0.06, 80);
      tone(185, 0.16, "sine", 0.02, 0.1);
    } else if (name === "rock") {
      noise(0.32, 0.08, 0, 260);
      tone(85, 0.38, "sine", 0.065, 0, 34);
      tone(52, 0.22, "triangle", 0.038, 0.04);
      tone(40, 0.18, "sine", 0.025, 0.08);
    } else if (name === "die") {
      lockMusic(1.2);
      const drop = [622, 587, 554, 587, 554, 523, 554, 523, 494, 523, 494, 466, 440];
      drop.forEach((f, i) => {
        tone(f, 0.06, "namco", 0.045, i * 0.052);
        tone(f * 0.75, 0.06, "triangle", 0.025, i * 0.052);
      });
      tone(784, 0.15, "namco", 0.048, 0.7);
      tone(784, 0.2, "namco", 0.04, 0.88);
      noise(0.24, 0.035, 0.72, 700);
    } else if (name === "over") {
      lockMusic(1.6);
      const rise = [622, 659, 698, 740, 784, 831, 880, 880, 698, 880, 880, 932, 932];
      rise.forEach((f, i) => tone(f, 0.075, "namco", 0.048, i * 0.055));
      seq([[466, 0.12], [440, 0.12], [415, 0.12], [392, 0.12], [370, 0.12], [349, 0.16], [233, 0.28]], "triangle", 0.035);
    } else if (name === "start") {
      // Stronger READY jingle: melody + harmony + bass (~3.1s), locks walk/dig
      lockMusic(3.2);
      const mel = [
        [698, 0.15], [698, 0.15], [698, 0.15], [784, 0.2],
        [659, 0.15], [698, 0.15], [784, 0.15], [880, 0.22],
        [698, 0.14], [659, 0.14], [587, 0.14], [659, 0.16],
        [523, 0.16], [587, 0.16], [698, 0.2], [880, 0.36],
      ];
      const harm = [
        [880, 0.15], [880, 0.15], [880, 0.15], [988, 0.2],
        [830, 0.15], [880, 0.15], [988, 0.15], [1047, 0.22],
        [880, 0.14], [830, 0.14], [740, 0.14], [830, 0.16],
        [659, 0.16], [740, 0.16], [880, 0.2], [1175, 0.36],
      ];
      const bass = [
        [175, 0.3], [233, 0.3], [196, 0.3], [262, 0.3],
        [175, 0.28], [220, 0.28], [233, 0.28], [175, 0.55],
      ];
      seq(mel, "namco", 0.065);
      harm.forEach((n, i) => {
        let t = 0;
        for (let j = 0; j < i; j++) t += harm[j][1];
        tone(n[0], n[1] * 0.9, "triangle", 0.028, t);
      });
      seq(bass, "triangle", 0.04);
      tone(349, 0.4, "sine", 0.022, 2.4);
    } else if (name === "clear") {
      lockMusic(1.4);
      seq([
        [587, 0.06], [622, 0.06], [659, 0.06], [698, 0.1],
        [587, 0.06], [622, 0.1],
        [523, 0.06], [587, 0.1],
        [466, 0.06], [523, 0.1],
        [440, 0.06], [466, 0.11],
        [932, 0.14], [1175, 0.12], [466, 0.2],
      ], "namco", 0.052);
      seq([[294, 0.2], [330, 0.2], [349, 0.2], [392, 0.35]], "triangle", 0.03);
    } else if (name === "veg") {
      tone(698, 0.065, "namco", 0.048);
      tone(880, 0.075, "namco", 0.05, 0.05);
      tone(1047, 0.11, "namco", 0.036, 0.11);
    } else if (name === "1up") {
      seq([
        [932, 0.04], [988, 0.04], [1047, 0.04], [1245, 0.05],
        [1047, 0.1], [784, 0.12], [698, 0.16],
      ], "namco", 0.055);
    } else if (name === "fire") {
      noise(0.24, 0.06, 0, 1200);
      tone(150, 0.22, "sawtooth", 0.038, 0, 65);
      tone(240, 0.15, "square", 0.022, 0.02, 85);
    } else if (name === "ghost") {
      tone(196, 0.15, "triangle", 0.026, 0, 450);
      tone(294, 0.13, "namco", 0.022, 0.04, 180);
    }
  }

  let map = [], dug = [];
  let score = 0;
  let high = +localStorage.getItem("digdug_high") || 0;
  let level = 1, lives = 3, extra = false;
  let state = "title";
  let readyT = 0, dieT = 0, clearT = 0;
  let titleT = 0, attractT = 0, overT = 0;
  let attractPlay = false, attractStep = 0, attractPumpT = 0, attractStuck = 0;
  let time = 0, prev = 0;
  let digdug, enemies, rocks, hose, veg, pops;
  let hold = null;
  let pumping = false;
  let vegGot = [];
  let rocksFallen = 0;

  function pad(n) { return String(n).padStart(2, "0"); }
  function midX(c) { return c * TILE + TILE * 0.5; }
  function midY(r) { return r * TILE + TILE * 0.5; }
  function nearestCol(x) { return Math.round((x - TILE * 0.5) / TILE); }
  function nearestRow(y) { return Math.round((y - TILE * 0.5) / TILE); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function inBounds(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }

  function isTunnel(c, r) {
    if (!inBounds(c, r)) return false;
    if (r < SURFACE) return true;
    return map[r][c] === EMPTY;
  }

  function rockBlocks(c, r) {
    if (!inBounds(c, r)) return true;
    if (map[r][c] === ROCK) return true;
    for (const rk of rocks) {
      if (rk.gone) continue;
      if (nearestCol(rk.x) === c && nearestRow(rk.y) === r) return true;
    }
    return false;
  }

  // Flame stays in open tunnels only — dirt/sand and rocks stop it.
  function fygarFlameTiles(e, dir) {
    const tiles = [];
    const r = nearestRow(e.y);
    const c0 = nearestCol(e.x);
    for (let i = 1; i <= 4; i++) {
      const c = c0 + dir.x * i;
      if (!inBounds(c, r) || rockBlocks(c, r) || !isTunnel(c, r)) break;
      tiles.push({ c, r, x: midX(c), y: midY(r) });
    }
    return tiles;
  }

  function dirtBand(r) {
    if (r < SURFACE) return 0;
    const i = r - SURFACE;
    if (i < 4) return 0;
    if (i < 8) return 1;
    if (i < 12) return 2;
    return 3;
  }

  function depthScore(r, type, horiz) {
    let pts = POP_LAYER[dirtBand(r)] || 200;
    if (type === "fygar" && horiz) pts *= 2;
    return pts;
  }

  function vegForRound(lv) {
    if (lv <= 1) return { id: "carrot", p: 400 };
    if (lv === 2) return { id: "turnip", p: 600 };
    if (lv === 3) return { id: "mushroom", p: 800 };
    if (lv <= 5) return { id: "cucumber", p: 1000 };
    if (lv <= 7) return { id: "eggplant", p: 2000 };
    if (lv <= 9) return { id: "pepper", p: 3000 };
    if (lv <= 11) return { id: "tomato", p: 4000 };
    if (lv <= 13) return { id: "garlic", p: 5000 };
    if (lv <= 15) return { id: "melon", p: 6000 };
    if (lv <= 17) return { id: "galaxian", p: 7000 };
    return { id: "pineapple", p: 8000 };
  }

  function hud() {
    $score.textContent = pad(score);
    $high.textContent = pad(high);
    $level.textContent = String(level);
    $lives.innerHTML = "";
    for (let i = 0; i < lives; i++) {
      const d = document.createElement("div");
      d.className = "life-icon";
      $lives.appendChild(d);
    }
    if ($veg) $veg.innerHTML = "";
  }

  function addScore(n) {
    score += n;
    if (!attractPlay) {
      if (score > high) {
        high = score;
        localStorage.setItem("digdug_high", String(high));
      }
      if (!extra && score >= 10000) { extra = true; lives++; sfx("1up"); }
    }
    hud();
  }

  function showOV(title, sub, cls) {
    overlay.classList.remove("hidden", "ready", "paused", "gameover");
    if (cls) overlay.classList.add(cls);
    $title.textContent = title;
    $sub.textContent = sub || "";
    const home = title === "DIG DUG";
    $hint.style.display = home ? "" : "none";
    if ($ctrl) $ctrl.style.display = home ? "" : "none";
  }
  function hideOV() { overlay.classList.add("hidden"); }

  function isTouchPrimary() {
    return window.matchMedia("(pointer: coarse)").matches
      || window.matchMedia("(max-width: 820px)").matches
      || ("ontouchstart" in window);
  }

  // Must stay well below one frame of enemy movement or they snap-loop in place.
  const ALIGN = 0.5;
  function atCenter(e) {
    return Math.abs(e.x - midX(nearestCol(e.x))) <= ALIGN
      && Math.abs(e.y - midY(nearestRow(e.y))) <= ALIGN;
  }
  function snapCenter(e) {
    e.x = midX(nearestCol(e.x));
    e.y = midY(nearestRow(e.y));
  }


  // Arcade board layouts (Ed Collins round screenshots). Coords: c0–13, dirt r2–16.
  // After round 15, layoutIndex cycles layouts 12–15.
  const LEVELS = [
    { // Round 1
      round: 1,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "V", c: 1, r0: 4, r1: 8 },
        { orient: "H", r: 4, c0: 9, c1: 12 },
        { orient: "H", r: 12, c0: 2, c1: 5 },
        { orient: "V", c: 9, r0: 11, r1: 15 },
      ],
      rocks: [{ c: 4, r: 5 }, { c: 10, r: 11 }, { c: 3, r: 13 }],
      enemies: [
        { type: "pooka", c: 1, r: 5, dir: "R" },
        { type: "pooka", c: 10, r: 4, dir: "L" },
        { type: "fygar", c: 4, r: 12, dir: "R" },
        { type: "pooka", c: 9, r: 13, dir: "L" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 2
      round: 2,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 5, c0: 10, c1: 12 },
        { orient: "H", r: 8, c0: 1, c1: 3 },
        { orient: "V", c: 1, r0: 11, r1: 13 },
        { orient: "H", r: 11, c0: 6, c1: 8 },
        { orient: "H", r: 13, c0: 10, c1: 12 },
      ],
      rocks: [{ c: 2, r: 4 }, { c: 8, r: 5 }, { c: 12, r: 10 }, { c: 4, r: 13 }],
      enemies: [
        { type: "fygar", c: 10, r: 5, dir: "L" },
        { type: "pooka", c: 3, r: 8, dir: "R" },
        { type: "pooka", c: 1, r: 11, dir: "R" },
        { type: "pooka", c: 6, r: 11, dir: "L" },
        { type: "fygar", c: 10, r: 13, dir: "L" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 3
      round: 3,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 4, c0: 10, c1: 12 },
        { orient: "H", r: 7, c0: 1, c1: 3 },
        { orient: "V", c: 7, r0: 5, r1: 7 },
        { orient: "V", c: 5, r0: 11, r1: 13 },
        { orient: "H", r: 14, c0: 8, c1: 10 },
      ],
      rocks: [{ c: 2, r: 4 }, { c: 11, r: 8 }, { c: 3, r: 11 }, { c: 12, r: 13 }],
      enemies: [
        { type: "fygar", c: 12, r: 4, dir: "R" },
        { type: "pooka", c: 1, r: 7, dir: "R" },
        { type: "pooka", c: 7, r: 7, dir: "R" },
        { type: "pooka", c: 5, r: 13, dir: "R" },
        { type: "fygar", c: 10, r: 14, dir: "R" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 4
      round: 4,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 5, c0: 3, c1: 5 },
        { orient: "V", c: 7, r0: 5, r1: 7 },
        { orient: "V", c: 11, r0: 9, r1: 11 },
        { orient: "H", r: 12, c0: 3, c1: 5 },
        { orient: "H", r: 14, c0: 7, c1: 9 },
      ],
      rocks: [{ c: 10, r: 4 }, { c: 2, r: 6 }, { c: 11, r: 7 }, { c: 3, r: 10 }, { c: 12, r: 13 }],
      enemies: [
        { type: "pooka", c: 4, r: 5, dir: "R" },
        { type: "pooka", c: 7, r: 5, dir: "L" },
        { type: "fygar", c: 11, r: 10, dir: "R" },
        { type: "fygar", c: 5, r: 12, dir: "L" },
        { type: "pooka", c: 7, r: 14, dir: "L" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 5
      round: 5,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 5, c0: 1, c1: 3 },
        { orient: "V", c: 5, r0: 5, r1: 7 },
        { orient: "V", c: 9, r0: 4, r1: 6 },
        { orient: "V", c: 10, r0: 8, r1: 10 },
        { orient: "H", r: 11, c0: 2, c1: 4 },
        { orient: "H", r: 12, c0: 10, c1: 12 },
      ],
      rocks: [{ c: 8, r: 4 }, { c: 12, r: 5 }, { c: 2, r: 8 }, { c: 5, r: 12 }, { c: 10, r: 13 }],
      enemies: [
        { type: "pooka", c: 3, r: 5, dir: "L" },
        { type: "pooka", c: 5, r: 5, dir: "L" },
        { type: "pooka", c: 9, r: 4, dir: "L" },
        { type: "fygar", c: 10, r: 8, dir: "L" },
        { type: "fygar", c: 4, r: 11, dir: "L" },
        { type: "fygar", c: 10, r: 12, dir: "L" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 6
      round: 6,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 5, c0: 3, c1: 5 },
        { orient: "V", c: 2, r0: 7, r1: 9 },
        { orient: "H", r: 10, c0: 9, c1: 11 },
        { orient: "H", r: 11, c0: 1, c1: 3 },
        { orient: "H", r: 13, c0: 5, c1: 7 },
      ],
      rocks: [{ c: 7, r: 4 }, { c: 10, r: 8 }, { c: 6, r: 11 }, { c: 2, r: 13 }],
      enemies: [
        { type: "pooka", c: 5, r: 5, dir: "R" },
        { type: "fygar", c: 2, r: 7, dir: "R" },
        { type: "fygar", c: 9, r: 10, dir: "L" },
        { type: "fygar", c: 3, r: 11, dir: "L" },
        { type: "fygar", c: 7, r: 13, dir: "L" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 7
      round: 7,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "V", c: 5, r0: 4, r1: 6 },
        { orient: "H", r: 5, c0: 9, c1: 11 },
        { orient: "H", r: 11, c0: 2, c1: 4 },
        { orient: "H", r: 13, c0: 8, c1: 10 },
      ],
      rocks: [{ c: 8, r: 4 }, { c: 1, r: 7 }, { c: 12, r: 8 }, { c: 11, r: 12 }],
      enemies: [
        { type: "pooka", c: 5, r: 4, dir: "R" },
        { type: "pooka", c: 5, r: 5, dir: "R" },
        { type: "fygar", c: 10, r: 5, dir: "R" },
        { type: "fygar", c: 3, r: 11, dir: "L" },
        { type: "fygar", c: 9, r: 13, dir: "R" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 8
      round: 8,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 5, c0: 1, c1: 3 },
        { orient: "V", c: 5, r0: 5, r1: 7 },
        { orient: "H", r: 6, c0: 9, c1: 11 },
        { orient: "V", c: 2, r0: 10, r1: 12 },
        { orient: "H", r: 12, c0: 9, c1: 11 },
        { orient: "H", r: 14, c0: 4, c1: 6 },
      ],
      rocks: [{ c: 3, r: 7 }, { c: 12, r: 8 }, { c: 5, r: 11 }, { c: 7, r: 13 }],
      enemies: [
        { type: "fygar", c: 3, r: 5, dir: "L" },
        { type: "pooka", c: 5, r: 5, dir: "R" },
        { type: "pooka", c: 9, r: 6, dir: "L" },
        { type: "fygar", c: 2, r: 11, dir: "R" },
        { type: "fygar", c: 9, r: 12, dir: "R" },
        { type: "pooka", c: 6, r: 14, dir: "L" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 9
      round: 9,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "V", c: 4, r0: 5, r1: 7 },
        { orient: "H", r: 7, c0: 8, c1: 10 },
        { orient: "V", c: 12, r0: 7, r1: 9 },
        { orient: "H", r: 11, c0: 5, c1: 7 },
        { orient: "H", r: 13, c0: 1, c1: 3 },
        { orient: "H", r: 13, c0: 10, c1: 12 },
      ],
      rocks: [{ c: 7, r: 4 }, { c: 11, r: 5 }, { c: 1, r: 9 }, { c: 9, r: 9 }, { c: 5, r: 13 }],
      enemies: [
        { type: "pooka", c: 4, r: 5, dir: "R" },
        { type: "pooka", c: 8, r: 7, dir: "R" },
        { type: "pooka", c: 12, r: 7, dir: "L" },
        { type: "fygar", c: 7, r: 11, dir: "L" },
        { type: "fygar", c: 3, r: 13, dir: "R" },
        { type: "fygar", c: 10, r: 13, dir: "L" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 10
      round: 10,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "V", c: 11, r0: 4, r1: 6 },
        { orient: "H", r: 6, c0: 7, c1: 9 },
        { orient: "V", c: 3, r0: 7, r1: 9 },
        { orient: "V", c: 9, r0: 8, r1: 10 },
        { orient: "H", r: 12, c0: 3, c1: 5 },
        { orient: "H", r: 13, c0: 9, c1: 11 },
      ],
      rocks: [{ c: 3, r: 5 }, { c: 1, r: 9 }, { c: 11, r: 10 }, { c: 7, r: 13 }],
      enemies: [
        { type: "pooka", c: 11, r: 5, dir: "L" },
        { type: "fygar", c: 7, r: 6, dir: "R" },
        { type: "fygar", c: 3, r: 7, dir: "R" },
        { type: "fygar", c: 9, r: 9, dir: "L" },
        { type: "fygar", c: 5, r: 12, dir: "L" },
        { type: "pooka", c: 9, r: 13, dir: "L" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 11
      round: 11,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 6, c0: 3, c1: 5 },
        { orient: "V", c: 9, r0: 6, r1: 8 },
        { orient: "H", r: 8, c0: 1, c1: 3 },
        { orient: "V", c: 12, r0: 8, r1: 10 },
        { orient: "V", c: 2, r0: 11, r1: 13 },
      ],
      rocks: [{ c: 2, r: 5 }, { c: 10, r: 5 }, { c: 5, r: 12 }, { c: 11, r: 13 }],
      enemies: [
        { type: "fygar", c: 5, r: 6, dir: "L" },
        { type: "fygar", c: 9, r: 7, dir: "L" },
        { type: "pooka", c: 3, r: 8, dir: "R" },
        { type: "fygar", c: 12, r: 9, dir: "L" },
        { type: "fygar", c: 2, r: 11, dir: "R" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 12
      round: 12,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 6, c0: 2, c1: 4 },
        { orient: "H", r: 7, c0: 7, c1: 9 },
        { orient: "V", c: 12, r0: 6, r1: 8 },
        { orient: "H", r: 12, c0: 9, c1: 11 },
        { orient: "H", r: 13, c0: 4, c1: 6 },
      ],
      rocks: [{ c: 8, r: 5 }, { c: 10, r: 9 }, { c: 1, r: 10 }, { c: 9, r: 14 }],
      enemies: [
        { type: "fygar", c: 3, r: 6, dir: "R" },
        { type: "pooka", c: 8, r: 7, dir: "R" },
        { type: "pooka", c: 12, r: 7, dir: "L" },
        { type: "fygar", c: 10, r: 12, dir: "L" },
        { type: "fygar", c: 5, r: 13, dir: "R" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 13
      round: 13,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 5, c0: 9, c1: 11 },
        { orient: "V", c: 3, r0: 7, r1: 9 },
        { orient: "V", c: 11, r0: 8, r1: 10 },
        { orient: "H", r: 12, c0: 5, c1: 7 },
        { orient: "H", r: 14, c0: 10, c1: 12 },
      ],
      rocks: [{ c: 8, r: 4 }, { c: 1, r: 5 }, { c: 2, r: 12 }, { c: 9, r: 13 }],
      enemies: [
        { type: "pooka", c: 10, r: 5, dir: "L" },
        { type: "pooka", c: 3, r: 8, dir: "R" },
        { type: "pooka", c: 11, r: 8, dir: "L" },
        { type: "fygar", c: 7, r: 12, dir: "L" },
        { type: "fygar", c: 10, r: 14, dir: "R" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 14
      round: 14,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 5, c0: 6, c1: 9 },
        { orient: "V", c: 3, r0: 5, r1: 7 },
        { orient: "V", c: 12, r0: 6, r1: 8 },
        { orient: "H", r: 10, c0: 9, c1: 11 },
        { orient: "H", r: 12, c0: 3, c1: 5 },
      ],
      rocks: [{ c: 1, r: 5 }, { c: 10, r: 6 }, { c: 2, r: 10 }, { c: 8, r: 13 }],
      enemies: [
        { type: "fygar", c: 3, r: 5, dir: "R" },
        { type: "pooka", c: 12, r: 6, dir: "L" },
        { type: "fygar", c: 10, r: 10, dir: "L" },
        { type: "fygar", c: 5, r: 12, dir: "L" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
    { // Round 15 — note: H r8 c9–11 is empty in ref (possible mid-play dig); kept as start stub
      round: 15,
      tunnels: [
        { orient: "V", c: 6, r0: 2, r1: 8 },
        { orient: "H", r: 9, c0: 5, c1: 7 },
        { orient: "H", r: 4, c0: 10, c1: 12 },
        { orient: "V", c: 5, r0: 5, r1: 7 },
        { orient: "H", r: 8, c0: 9, c1: 11 },
        { orient: "H", r: 9, c0: 1, c1: 3 },
        { orient: "V", c: 5, r0: 11, r1: 13 },
        { orient: "V", c: 7, r0: 11, r1: 13 },
      ],
      rocks: [{ c: 8, r: 5 }, { c: 1, r: 7 }, { c: 9, r: 11 }, { c: 3, r: 13 }],
      enemies: [
        { type: "pooka", c: 10, r: 4, dir: "L" },
        { type: "pooka", c: 5, r: 6, dir: "R" },
        { type: "fygar", c: 3, r: 9, dir: "R" },
        { type: "fygar", c: 5, r: 11, dir: "R" },
        { type: "fygar", c: 7, r: 11, dir: "L" },
      ],
      player: { c: 6, r: 9, dir: "R" },
    },
  ];

  function layoutIndex(level) {
    if (level <= 15) return level - 1;
    return 11 + ((level - 12) % 4);
  }

  function carve(c, r) {
    if (!inBounds(c, r) || r < SURFACE) return;
    if (map[r][c] === ROCK) return;
    map[r][c] = EMPTY;
    dug[r][c] = 1;
  }
  function carveRect(c, r, w, h) {
    for (let y = r; y < r + h; y++)
      for (let x = c; x < c + w; x++)
        carve(x, y);
  }

  function buildLevel(lv) {
    map = [];
    dug = [];
    for (let r = 0; r < ROWS; r++) {
      map[r] = [];
      dug[r] = [];
      for (let c = 0; c < COLS; c++) {
        // Sky (0–1) + bottom HUD strip (17) stay empty; dirt is arcade rows 2–16
        if (r < SURFACE || r > 16) {
          map[r][c] = EMPTY;
          dug[r][c] = 1;
        } else {
          map[r][c] = DIRT;
          dug[r][c] = 0;
        }
      }
    }

    const layout = LEVELS[layoutIndex(lv)];
    for (const t of layout.tunnels) {
      if (t.orient === "V") {
        for (let r = t.r0; r <= t.r1; r++) carve(t.c, r);
      } else {
        for (let c = t.c0; c <= t.c1; c++) carve(c, t.r);
      }
    }

    rocks = [];
    for (const s of layout.rocks) {
      if (s.r >= SURFACE && s.r <= 16 && s.c >= 0 && s.c < COLS && map[s.r][s.c] !== EMPTY) {
        map[s.r][s.c] = ROCK;
        dug[s.r][s.c] = 0;
        rocks.push({
          c: s.c, r: s.r,
          x: midX(s.c), y: midY(s.r),
          falling: false, fallV: 0, gone: false, crushT: 0, warn: 0, hits: 0,
        });
      } else {
        console.warn("[Dig Dug V5] rock not on dirt", layout.round, s);
      }
    }

    const p = layout.player;
    const pdir = DIR_BY_ID[p.dir] || R;
    digdug = {
      x: midX(p.c), y: midY(p.r),
      dir: pdir, next: null,
      dead: false, walk: 0, digAnim: 0,
    };
    hose = null;
    pumping = false;
    veg = null;
    pops = [];
    rocksFallen = 0;

    enemies = layout.enemies.map((e) => makeEnemy(e.type, e.c, e.r, e.dir));

    // Sanity: enemies/player on empty, rocks on rock cells
    for (const e of layout.enemies) {
      if (!inBounds(e.c, e.r) || map[e.r][e.c] !== EMPTY) {
        console.warn("[Dig Dug V5] enemy not on empty", layout.round, e);
      }
    }
    if (!inBounds(p.c, p.r) || map[p.r][p.c] !== EMPTY) {
      console.warn("[Dig Dug V5] player not on empty", layout.round, p);
    }
    console.log(
      "[Dig Dug V5] round", lv, "layout", layout.round,
      "tunnels", layout.tunnels.length,
      "rocks", rocks.length,
      "enemies", enemies.length
    );
  }

  function makeEnemy(type, c, r, dirId) {
    const opts = tunnelNeighbors(c, r);
    const forced = dirId && DIR_BY_ID[dirId] ? DIR_BY_ID[dirId] : null;
    return {
      type,
      x: midX(c), y: midY(r),
      dir: forced || (opts.length ? opts[(Math.random() * opts.length) | 0] : R),
      state: "roam",
      inflate: 0,
      inflateT: 0,
      ghostT: 0,
      anger: 0,
      fireT: 1400 + Math.random() * 1800,
      fire: null,
      fireWind: 0,
      bob: Math.random() * 1000,
      step: 0,
    };
  }

  async function beginLevel(n) {
    level = n;
    buildLevel(level);
    state = "ready";
    readyT = 3200;
    hold = null;
    pumping = false;
    hud();
    showOV("READY", "ROUND " + level, "ready");
    await unlockAudio();
    sfx("start");
  }

  async function beginGame() {
    await unlockAudio();
    stopPump();
    hold = null;
    attractPlay = false;
    score = 0; lives = 3; level = 1; extra = false; vegGot = [];
    walkStep = 0; walkDist = 0;
    await beginLevel(1);
  }

  function goTitle() {
    stopPump();
    hold = null;
    attractPlay = false;
    pumping = false;
    hose = null;
    state = "title";
    titleT = 4200;
    buildLevel(1);
    showOV("DIG DUG", "INSERT COIN", null);
    hud();
    $lives.innerHTML = "";
    $score.textContent = pad(0);
  }

  function beginAttract() {
    stopPump();
    hold = null;
    attractPlay = true;
    attractStep = 0;
    attractPumpT = 0;
    attractStuck = 0;
    attractT = 40000;
    score = 0; extra = false; vegGot = [];
    walkStep = 0; walkDist = 0;
    buildLevel(1);
    lives = 0;
    hud();
    $lives.innerHTML = "";
    state = "attract";
    hideOV();
  }

  // Cabinet demo path on round 1: walk the shaft, dig to a Pooka, pump, then dig down.
  const ATTRACT_PATH = [
    { c: 6, r: 2 },
    { c: 10, r: 2 },
    { pump: 1700 },
    { c: 10, r: 6 },
    { c: 10, r: 10 },
    { pump: 1700 },
    { c: 6, r: 10 },
    { c: 3, r: 10 },
    { pump: 2000 },
  ];

  function nearestLive() {
    if (!digdug) return null;
    let best = null, bestD = 1e9;
    for (const e of enemies) {
      if (e.state === "dead" || e.state === "crushed" || e.state === "escaped") continue;
      const d = Math.hypot(e.x - digdug.x, e.y - digdug.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function faceToward(tx, ty) {
    const c = nearestCol(digdug.x), r = nearestRow(digdug.y);
    const tc = nearestCol(tx), tr = nearestRow(ty);
    let d;
    if (Math.abs(tc - c) >= Math.abs(tr - r)) d = tc >= c ? R : L;
    else d = tr >= r ? D : U;
    hold = d;
    digdug.dir = d;
    digdug.next = d;
    return d;
  }

  function attractSteer(dt) {
    if (!digdug || digdug.dead) return;
    if (attractStep >= ATTRACT_PATH.length) {
      const e = nearestLive();
      if (e) faceToward(e.x, e.y);
      return;
    }
    const step = ATTRACT_PATH[attractStep];
    if (step.pump) {
      if (pumping) {
        attractPumpT -= dt;
        if (attractPumpT <= 0 || !hose || !hose.target) {
          stopPump();
          attractStep++;
          attractStuck = 0;
        }
        return;
      }
      const e = nearestLive();
      if (!e) { attractStep++; return; }
      faceToward(e.x, e.y);
      startPump();
      attractPumpT = step.pump;
      return;
    }
    const c = nearestCol(digdug.x), r = nearestRow(digdug.y);
    if (atCenter(digdug) && c === step.c && r === step.r) {
      attractStep++;
      attractStuck = 0;
      return;
    }
    if (c !== step.c) faceToward(midX(step.c), digdug.y);
    else faceToward(digdug.x, midY(step.r));
    attractStuck += dt;
    if (attractStuck > 4000) {
      attractStep++;
      attractStuck = 0;
    }
  }

  function canDigDugEnter(c, r) {
    if (!inBounds(c, r)) return false;
    if (r < 0) return false;
    if (map[r][c] === ROCK) return false;
    return true;
  }

  function digCell(c, r) {
    if (!inBounds(c, r) || r < SURFACE) return false;
    if (map[r][c] === DIRT) {
      map[r][c] = EMPTY;
      dug[r][c] = 1;
      digdug.digAnim = 1;
      sfx("dig");
      checkRocks();
      return true;
    }
    return false;
  }

  function moveDigDug(dt) {
    if (!digdug || digdug.dead || pumping) return;
    if (hold) digdug.next = hold;

    if (digdug.next && digdug.next.id === OPP[digdug.dir.id].id) {
      digdug.dir = digdug.next;
    }

    if (atCenter(digdug) && digdug.next && digdug.next.id !== digdug.dir.id) {
      const nc = nearestCol(digdug.x) + digdug.next.x;
      const nr = nearestRow(digdug.y) + digdug.next.y;
      if (canDigDugEnter(nc, nr)) {
        snapCenter(digdug);
        digdug.dir = digdug.next;
      }
    }

    if (atCenter(digdug)) {
      const nc = nearestCol(digdug.x) + digdug.dir.x;
      const nr = nearestRow(digdug.y) + digdug.dir.y;
      if (!canDigDugEnter(nc, nr)) {
        snapCenter(digdug);
        return;
      }
    }

    const nc = nearestCol(digdug.x) + digdug.dir.x;
    const nr = nearestRow(digdug.y) + digdug.dir.y;
    const carving = inBounds(nc, nr) && map[nr][nc] === DIRT;
    const speed = carving ? SPD_DIG_DIRT : SPD_DIG;
    const sp = speed * (dt / 1000);

    digdug.x += digdug.dir.x * sp;
    digdug.y += digdug.dir.y * sp;

    if (digdug.dir.x !== 0) digdug.y = midY(nearestRow(digdug.y));
    else digdug.x = midX(nearestCol(digdug.x));

    digdug.x = clamp(digdug.x, TILE * 0.5, W - TILE * 0.5);
    digdug.y = clamp(digdug.y, TILE * 0.5, H - TILE * 0.5);

    digCell(nearestCol(digdug.x), nearestRow(digdug.y));
    digdug.walk += sp;
    walkDist += sp;
    if (digdug.digAnim > 0) digdug.digAnim -= dt * 0.008;
    if (walkDist >= WALK_NOTE_PX) {
      walkDist -= WALK_NOTE_PX;
      sfx("walk", speed);
    }
  }

  function startPump() {
    if ((state !== "play" && state !== "attract") || !digdug || digdug.dead) return;
    pumping = true;
    hose = { dir: digdug.dir, len: 0, max: 4, target: null };
    sfx("harpoon");
  }
  function stopPump() {
    pumping = false;
    hose = null;
  }

  function updatePump(dt) {
    if (!pumping || !hose || !digdug) return;
    hose.dir = digdug.dir;
    hose.len = Math.min(hose.max, hose.len + dt * 0.012);

    const c0 = nearestCol(digdug.x);
    const r0 = nearestRow(digdug.y);
    const cells = Math.ceil(hose.len);
    hose.target = null;

    for (let i = 1; i <= cells; i++) {
      const c = c0 + hose.dir.x * i;
      const r = r0 + hose.dir.y * i;
      if (!inBounds(c, r)) break;
      if (map[r][c] === ROCK) break;
      if (r >= SURFACE && map[r][c] === DIRT) break;

      for (const e of enemies) {
        if (e.state === "dead" || e.state === "crushed" || e.state === "escaped") continue;
        if (e.state === "ghost") continue;
        if (nearestCol(e.x) === c && nearestRow(e.y) === r) {
          hose.target = e;
          e.state = "inflate";
          e.inflateT += dt;
          if (e.inflateT > 200) {
            e.inflate = Math.min(4, e.inflate + 1);
            e.inflateT = 0;
            sfx("pump", e.inflate);
            if (e.inflate >= 4) {
              popEnemy(e, hose.dir.x !== 0);
              stopPump();
            }
          }
          return;
        }
      }
    }
  }

  function popEnemy(e, horiz) {
    const pts = depthScore(nearestRow(e.y), e.type, horiz);
    e.state = "dead";
    addScore(pts);
    sfx("pop");
    pops.push({ x: e.x, y: e.y, p: pts, t: 900 });
    checkClear();
  }

  function aliveEnemies() {
    return enemies.filter((e) => e.state !== "dead" && e.state !== "crushed" && e.state !== "escaped");
  }

  function checkClear() {
    if (aliveEnemies().length === 0) {
      state = "clear";
      clearT = 1600;
      sfx("clear");
    }
  }

  function checkRocks() {
    for (const rk of rocks) {
      if (rk.gone || rk.falling) continue;
      const below = rk.r + 1;
      if (below >= ROWS) continue;
      if (map[below][rk.c] === EMPTY) {
        rk.warn += 1;
        if (rk.warn >= 2) startRockFall(rk);
      } else {
        rk.warn = 0;
      }
    }
  }

  function startRockFall(rk) {
    rk.falling = true;
    rk.fallV = 40;
    rk.hits = 0;
    if (map[rk.r][rk.c] === ROCK) map[rk.r][rk.c] = EMPTY;
    rocksFallen++;
    sfx("rock");
    if (rocksFallen === 2 && !veg) {
      const v = vegForRound(level);
      veg = { id: v.id, p: v.p, x: midX(7), y: midY(9), t: 10000 };
    }
  }

  function updateRocks(dt) {
    for (const rk of rocks) {
      if (rk.gone) continue;
      if (rk.crushT > 0) {
        rk.crushT -= dt;
        if (rk.crushT <= 0) rk.gone = true;
        continue;
      }
      if (!rk.falling) {
        const below = rk.r + 1;
        if (below < ROWS && map[below][rk.c] === EMPTY) {
          rk.warn += dt;
          if (rk.warn > 900) startRockFall(rk);
        } else rk.warn = 0;
        continue;
      }

      rk.fallV = Math.min(SPD_ROCK, rk.fallV + 520 * (dt / 1000));
      rk.y += rk.fallV * (dt / 1000);
      rk.r = nearestRow(rk.y);

      const under = rk.r + 1;
      let land = false;
      if (under >= ROWS) {
        rk.r = ROWS - 1; land = true;
      } else if (map[under][rk.c] === DIRT || map[under][rk.c] === ROCK) {
        land = true;
      }
      if (land) {
        rk.y = midY(rk.r);
        rk.falling = false;
        map[rk.r][rk.c] = ROCK;
        dug[rk.r][rk.c] = 0;
      }

      for (const e of enemies) {
        if (e.state === "dead" || e.state === "crushed" || e.state === "escaped") continue;
        if (Math.hypot(e.x - rk.x, e.y - rk.y) < TILE * 0.65) {
          e.state = "crushed";
          rk.hits++;
          const pts = ROCK_PTS[Math.min(rk.hits, ROCK_PTS.length - 1)] - (rk.hits > 1 ? ROCK_PTS[rk.hits - 1] : 0);
          addScore(pts);
          pops.push({ x: e.x, y: e.y, p: pts, t: 900 });
          sfx("pop");
          checkClear();
        }
      }
      if (digdug && !digdug.dead && Math.hypot(digdug.x - rk.x, digdug.y - rk.y) < TILE * 0.5) {
        killPlayer();
      }
    }
  }

  function enemySpd(e) {
    const base = e.state === "ghost" ? SPD_GHOST : SPD_ENEMY;
    return base + Math.min(level, 8) * 6;
  }

  function tunnelNeighbors(c, r) {
    const out = [];
    for (const d of ORDER) {
      const nc = c + d.x, nr = r + d.y;
      if (inBounds(nc, nr) && isTunnel(nc, nr)) out.push(d);
    }
    return out;
  }

  function pickRoamDir(e) {
    const c = nearestCol(e.x), r = nearestRow(e.y);
    const rev = OPP[e.dir.id];
    let opts = tunnelNeighbors(c, r).filter((d) => d.id !== rev.id);
    if (!opts.length) opts = tunnelNeighbors(c, r);
    if (!opts.length) {
      e.state = "ghost";
      e.ghostT = 2800 + Math.random() * 1800;
      e.anger = 0;
      sfx("ghost");
      const gopts = ORDER.filter((d) => {
        const nc = c + d.x, nr = r + d.y;
        return inBounds(nc, nr) && map[nr][nc] !== ROCK && nr >= 0;
      });
      e.dir = gopts.length ? gopts[(Math.random() * gopts.length) | 0] : R;
      return;
    }

    const last = aliveEnemies().length === 1;
    if (last) {
      const up = opts.find((d) => d.id === "U");
      const left = opts.find((d) => d.id === "L");
      if (r <= SURFACE && left) { e.dir = left; return; }
      if (up) { e.dir = up; return; }
      if (left) { e.dir = left; return; }
    }

    if (digdug && !digdug.dead && Math.random() < 0.65) {
      const pc = nearestCol(digdug.x), pr = nearestRow(digdug.y);
      let best = opts[0], bestD = 1e9;
      for (const d of opts) {
        const dd = (c + d.x - pc) ** 2 + (r + d.y - pr) ** 2;
        if (dd < bestD) { bestD = dd; best = d; }
      }
      e.dir = best;
    } else {
      e.dir = opts[(Math.random() * opts.length) | 0];
    }
    e.anger = 0;
  }

  function pickGhostDir(e) {
    const c = nearestCol(e.x), r = nearestRow(e.y);
    const rev = OPP[e.dir.id];
    const last = aliveEnemies().length === 1;
    let opts = ORDER.filter((d) => {
      if (d.id === rev.id) return false;
      const nc = c + d.x, nr = r + d.y;
      return inBounds(nc, nr) && map[nr][nc] !== ROCK && nr >= 0;
    });
    if (!opts.length) {
      opts = ORDER.filter((d) => {
        const nc = c + d.x, nr = r + d.y;
        return inBounds(nc, nr) && map[nr][nc] !== ROCK;
      });
    }
    if (!opts.length) { e.dir = rev; return; }

    if (last) {
      const up = opts.find((d) => d.id === "U");
      const left = opts.find((d) => d.id === "L");
      if (up) { e.dir = up; return; }
      if (left) { e.dir = left; return; }
    }

    const tunnelOpts = opts.filter((d) => isTunnel(c + d.x, r + d.y));
    const use = tunnelOpts.length ? tunnelOpts : opts;
    if (digdug && !digdug.dead) {
      const pc = nearestCol(digdug.x), pr = nearestRow(digdug.y);
      let best = use[0], bestD = 1e9;
      for (const d of use) {
        const dd = (c + d.x - pc) ** 2 + (r + d.y - pr) ** 2;
        if (dd < bestD) { bestD = dd; best = d; }
      }
      e.dir = best;
    } else {
      e.dir = use[(Math.random() * use.length) | 0];
    }
  }

  function stepEntity(e, sp, dt, mode) {
    // Always leave the center window this frame so ALIGN cannot snap-loop.
    const step = Math.max(sp * (dt / 1000), ALIGN + 0.25);
    const c = nearestCol(e.x);
    const r = nearestRow(e.y);

    if (atCenter(e)) {
      e.x = midX(c);
      e.y = midY(r);
      if (mode === "ghost" || e.state === "ghost") pickGhostDir(e);
      else pickRoamDir(e);

      if (e.state === "ghost") mode = "ghost";

      const nc = c + e.dir.x, nr = r + e.dir.y;
      if (mode !== "ghost" && (!inBounds(nc, nr) || !isTunnel(nc, nr))) {
        e.anger += dt + 80;
        if (e.anger > 400) {
          e.state = "ghost";
          e.ghostT = 2500 + Math.random() * 2000;
          sfx("ghost");
        }
        return;
      }
    } else {
      const nc = c + e.dir.x, nr = r + e.dir.y;
      if (mode !== "ghost" && inBounds(nc, nr) && !isTunnel(nc, nr)) {
        e.x = midX(c);
        e.y = midY(r);
        e.anger += dt;
        return;
      }
    }

    e.x += e.dir.x * step;
    e.y += e.dir.y * step;

    if (e.dir.x !== 0) e.y = midY(nearestRow(e.y));
    else e.x = midX(nearestCol(e.x));

    const last = aliveEnemies().length === 1;
    if (last) {
      e.x = clamp(e.x, -TILE, W - TILE * 0.5);
      e.y = clamp(e.y, TILE * 0.2, H - TILE * 0.5);
      if (e.x < 0 && nearestRow(e.y) <= SURFACE) {
        e.state = "escaped";
        checkClear();
        return;
      }
    } else {
      e.x = clamp(e.x, TILE * 0.5, W - TILE * 0.5);
      e.y = clamp(e.y, midY(SURFACE - 1), H - TILE * 0.5);
    }
    e.step += step;
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      e.bob += dt;
      if (e.state === "dead" || e.state === "crushed" || e.state === "escaped") continue;

      if (e.state === "inflate") {
        if (!pumping || !hose || hose.target !== e) {
          e.inflateT += dt;
          if (e.inflateT > 350) {
            e.inflate = Math.max(0, e.inflate - 1);
            e.inflateT = 0;
            if (e.inflate <= 0) e.state = "roam";
          }
        }
        continue;
      }

      const last = aliveEnemies().length === 1;
      const breathing = e.type === "fygar" && (e.fire || e.fireWind > 0);

      if (e.state === "ghost") {
        e.ghostT -= dt;
        stepEntity(e, enemySpd(e), dt, "ghost");
        if (e.state === "escaped") continue;
        if (e.ghostT <= 0 && isTunnel(nearestCol(e.x), nearestRow(e.y))) {
          e.state = "roam";
          e.anger = 0;
          e.x = midX(nearestCol(e.x));
          e.y = midY(nearestRow(e.y));
        }
      } else if (!breathing) {
        if (last && e.state === "roam") {
          const c = nearestCol(e.x);
          const r = nearestRow(e.y);
          if (atCenter(e) && r > SURFACE) {
            const up = tunnelNeighbors(c, r).find((d) => d.id === "U");
            if (up) e.dir = up;
            else if (!isTunnel(c, r - 1) && r - 1 >= 0) {
              e.state = "ghost";
              e.ghostT = 2200;
              e.dir = U;
            }
          }
        }
        stepEntity(e, enemySpd(e) * (last ? 1.3 : 1), dt, "roam");
      }

      if (e.type === "fygar" && e.state === "roam" && (e.dir.id === "L" || e.dir.id === "R")) {
        if (e.fireWind > 0) {
          e.fireWind -= dt;
          if (e.fireWind <= 0) {
            e.fire = { dir: e.dir, life: 480 };
            sfx("fire");
          }
        } else if (e.fire) {
          e.fire.life -= dt;
          if (digdug && !digdug.dead) {
            for (const t of fygarFlameTiles(e, e.fire.dir)) {
              if (Math.abs(digdug.x - t.x) < TILE * 0.45 && Math.abs(digdug.y - t.y) < TILE * 0.42) {
                killPlayer();
                break;
              }
            }
          }
          if (e.fire.life <= 0) e.fire = null;
        } else {
          e.fireT -= dt;
          if (e.fireT <= 0 && digdug && !digdug.dead) {
            if (nearestRow(e.y) === nearestRow(digdug.y)
              && Math.sign(digdug.x - e.x) === e.dir.x
              && Math.abs(e.x - digdug.x) < TILE * 5
              && fygarFlameTiles(e, e.dir).length) {
              e.fireWind = 260;
              e.fireT = 2800 + Math.random() * 1800;
            } else {
              e.fireT = 400 + Math.random() * 600;
            }
          }
        }
      }

      if (digdug && !digdug.dead && e.state !== "inflate"
        && Math.hypot(e.x - digdug.x, e.y - digdug.y) < TILE * 0.46) {
        killPlayer();
      }
    }
  }

  function killPlayer() {
    if (!digdug || digdug.dead) return;
    if (state !== "play" && state !== "attract") return;
    digdug.dead = true;
    pumping = false;
    hose = null;
    sfx("die");
    if (attractPlay) {
      state = "die";
      dieT = 1600;
      return;
    }
    lives--;
    hud();
    state = "die";
    dieT = 1500;
  }

  function updateVeg(dt) {
    if (!veg) return;
    veg.t -= dt;
    if (veg.t <= 0) { veg = null; return; }
    if (digdug && !digdug.dead && Math.hypot(digdug.x - veg.x, digdug.y - veg.y) < TILE * 0.7) {
      addScore(veg.p);
      vegGot.push(veg.id);
      sfx("veg");
      pops.push({ x: veg.x, y: veg.y, p: veg.p, t: 800 });
      veg = null;
      hud();
    }
  }

  function update(dt) {
    time += dt;
    if (state === "pause") return;
    if (state === "title") {
      titleT -= dt;
      if (titleT <= 0) beginAttract();
      return;
    }
    if (state === "over") {
      overT -= dt;
      if (overT <= 0) goTitle();
      return;
    }

    if (state === "ready") {
      readyT -= dt;
      if (readyT <= 0) { state = "play"; hideOV(); }
      return;
    }
    if (state === "die") {
      dieT -= dt;
      if (dieT <= 0) {
        if (attractPlay) { goTitle(); return; }
        if (lives <= 0) {
          state = "over";
          overT = 8000;
          sfx("over");
          showOV("GAME OVER", isTouchPrimary() ? "TAP TO RESTART" : "PRESS SPACE", "gameover");
          return;
        }
        buildLevel(level);
        state = "ready";
        readyT = 1400;
        showOV("READY", "", "ready");
      }
      return;
    }
    if (state === "clear") {
      clearT -= dt;
      if (clearT <= 0) beginLevel(level + 1);
      return;
    }

    if (state === "attract") {
      attractT -= dt;
      if (attractT <= 0) { goTitle(); return; }
      attractSteer(dt);
    }

    moveDigDug(dt);
    if (pumping) {
      if (hold) digdug.dir = hold;
      updatePump(dt);
    }
    updateEnemies(dt);
    updateRocks(dt);
    updateVeg(dt);

    for (const p of pops) p.t -= dt;
    pops = pops.filter((p) => p.t > 0);
    if ((time / 250 | 0) !== ((time - dt) / 250 | 0)) checkRocks();
  }

  function blit(rows, cx, cy, opt) {
    opt = opt || {};
    const scale = opt.scale || 1;
    const px = PX * scale;
    const h = rows.length;
    const w = rows[0].length;
    const flipX = !!opt.flipX;
    const x0 = cx - (w * px) / 2;
    const y0 = cy - (h * px) / 2;
    const soft = opt.soft !== false;
    const rPix = soft ? px * 0.58 : 0;
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < w; x++) {
        const ch = row.charAt(flipX ? w - 1 - x : x);
        const col = PAL[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        const pxX = x0 + x * px;
        const pxY = y0 + y * px;
        if (soft) {
          ctx.beginPath();
          ctx.arc(pxX + px * 0.5, pxY + px * 0.5, rPix, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(Math.round(pxX), Math.round(pxY), Math.ceil(px), Math.ceil(px));
        }
      }
    }
  }

  function drawWorld() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    for (let r = SURFACE; r < ROWS; r++) {
      ctx.fillStyle = DIRT_COLS[dirtBand(r)];
      ctx.fillRect(0, r * TILE, W, TILE);
    }

    ctx.fillStyle = "#000000";
    const capR = TILE * 0.52;
    for (let r = SURFACE; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (map[r][c] !== EMPTY) continue;
        const cx = midX(c), cy = midY(r);
        ctx.beginPath();
        ctx.arc(cx, cy, capR, 0, Math.PI * 2);
        ctx.fill();
        if (c + 1 < COLS && map[r][c + 1] === EMPTY) {
          ctx.fillRect(cx - 1, cy - capR, TILE + 2, capR * 2);
        }
        if (r + 1 < ROWS && map[r + 1][c] === EMPTY) {
          ctx.fillRect(cx - capR, cy - 1, capR * 2, TILE + 2);
        }
        // Player shaft (and any surface hole) opens into the black sky
        if (r === SURFACE) {
          ctx.fillRect(cx - capR, 0, capR * 2, cy + 1);
        }
      }
    }

    // Arcade flowers: 1 large ≈ 10 rounds, 1 small ≈ 1 (cap icons so they fit the sky)
    {
      let remain = level;
      let slot = 0;
      const maxSlots = Math.min(COLS - 1, 8);
      while (remain >= 10 && slot < maxSlots) {
        const x = midX(COLS - 1 - slot);
        const y = TILE * 0.85;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1.35, 1.35);
        ctx.translate(-x, -y);
        blit(SPR.flower, x, y);
        ctx.restore();
        remain -= 10;
        slot++;
      }
      while (remain > 0 && slot < maxSlots) {
        blit(SPR.flower, midX(COLS - 1 - slot), TILE * 0.85);
        remain--;
        slot++;
      }
    }

    for (const rk of rocks) {
      if (!rk.gone) blit(SPR.rock, rk.x, rk.y);
    }
  }

  function drawHose() {
    if (!hose || !digdug) return;
    const x = digdug.x, y = digdug.y;
    let tx, ty;
    if (hose.target) {
      tx = hose.target.x;
      ty = hose.target.y;
    } else {
      tx = x + hose.dir.x * (TILE * 0.45 + hose.len * TILE);
      ty = y + hose.dir.y * (TILE * 0.45 + hose.len * TILE);
    }
    ctx.strokeStyle = "#fcfcfc";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + hose.dir.x * 16, y + hose.dir.y * 8);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = "#e8e8e8";
    ctx.beginPath();
    ctx.arc(tx, ty, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a0a0a0";
    ctx.beginPath();
    ctx.arc(tx, ty, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDigDug() {
    if (!digdug) return;
    const x = digdug.x, y = digdug.y;
    if (digdug.dead) {
      blit(SPR.ddDead, x, y);
      return;
    }
    const flip = digdug.dir.id === "L";
    const frame = (digdug.walk / WALK_NOTE_PX | 0) % 2;
    if (pumping) {
      blit(SPR.ddPump, x, y, { flipX: flip });
      drawHose();
      return;
    }
    if (digdug.dir.id === "U") blit(frame ? SPR.ddU1 : SPR.ddU0, x, y);
    else if (digdug.dir.id === "D") blit(SPR.ddD0, x, y);
    else blit(frame ? SPR.ddR1 : SPR.ddR0, x, y, { flipX: flip });
  }

  function drawEnemy(e) {
    if (e.state === "dead" || e.state === "escaped") return;
    const x = e.x;
    const y = e.y;
    const flip = e.dir.id === "L";
    const frame = (e.step / 18 | 0) % 2;

    if (e.state === "crushed") {
      blit(SPR.crush, x, y + 6);
      return;
    }
    if (e.state === "ghost") {
      blit(e.type === "pooka" ? SPR.pookaGhost : SPR.fygarGhost, x, y);
      return;
    }

    const inf = e.inflate || 0;
    const scale = 1 + inf * 0.28;
    if (e.type === "pooka") {
      blit(frame ? SPR.pooka1 : SPR.pooka0, x, y, { flipX: flip, scale });
    } else {
      blit(frame ? SPR.fygar1 : SPR.fygar0, x, y, { flipX: flip, scale });
      if (e.fire) {
        const flame = (time / 80 | 0) % 2 ? SPR.fire1 : SPR.fire0;
        for (const t of fygarFlameTiles(e, e.fire.dir)) {
          blit(flame, t.x, t.y, { flipX: e.fire.dir.x < 0 });
        }
      }
    }
  }

  function drawVeg() {
    if (!veg) return;
    const spr = SPR[veg.id] || SPR.carrot;
    blit(spr, veg.x, veg.y);
  }

  function drawPops() {
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of pops) {
      ctx.globalAlpha = clamp(p.t / 900, 0, 1);
      ctx.fillStyle = "#fcfcfc";
      ctx.fillText(String(p.p), p.x, p.y - (900 - p.t) * 0.02);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.imageSmoothingEnabled = false;
    drawWorld();
    drawVeg();
    for (const e of enemies) drawEnemy(e);
    drawDigDug();
    drawPops();

    if (state === "ready") {
      ctx.fillStyle = "#ffff40";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("READY", W / 2, H * 0.42);
    }
    if (state === "clear") {
      ctx.fillStyle = "#ffff40";
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("ROUND CLEAR", W / 2, H * 0.42);
    }
    if (state === "attract" && (time / 480 | 0) % 2 === 0) {
      ctx.fillStyle = "#ff2020";
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("INSERT COIN", W / 2, TILE * 0.72);
    }
  }

  function tick(ts) {
    if (!prev) prev = ts;
    let dt = ts - prev;
    prev = ts;
    if (dt > 40) dt = 40;
    if (dt < 0) dt = 0;
    update(dt);
    render();
    requestAnimationFrame(tick);
  }

  function setDir(d) {
    if (!d) return;
    if (state === "title" || state === "attract" || state === "over") {
      beginGame();
      return;
    }
    hold = d;
    if (digdug && (state === "play" || state === "ready")) {
      digdug.next = d;
      if (state === "play" && d.id === OPP[digdug.dir.id].id) digdug.dir = d;
    }
  }
  function clearDir(d) {
    if (d && hold && d.id === hold.id) hold = null;
  }

  function togglePauseOrStart() {
    unlockAudio();
    if (state === "title" || state === "over" || state === "attract") beginGame();
    else if (state === "play") {
      state = "pause";
      showOV("PAUSED", isTouchPrimary() ? "TAP TO RESUME" : "SPACE TO RESUME", "paused");
    } else if (state === "pause") {
      state = "play";
      hideOV();
    }
  }

  function toggleMute() {
    muted = !muted;
    const btn = document.getElementById("btn-mute");
    if (btn) {
      btn.textContent = muted ? "X" : "♪";
      btn.classList.toggle("active", muted);
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "m" || e.key === "M") { toggleMute(); return; }
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      if (state === "title" || state === "over" || state === "attract" || state === "pause") togglePauseOrStart();
      else if (state === "play" && !pumping) startPump();
      return;
    }
    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (state === "play" || state === "pause") togglePauseOrStart();
      return;
    }
    const mapK = {
      ArrowLeft: L, a: L, A: L, KeyA: L,
      ArrowRight: R, d: R, D: R, KeyD: R,
      ArrowUp: U, w: U, W: U, KeyW: U,
      ArrowDown: D, s: D, S: D, KeyS: D,
    };
    const dir = mapK[e.key] || mapK[e.code];
    if (dir) { e.preventDefault(); setDir(dir); }
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.key === " ") { stopPump(); return; }
    const mapK = {
      ArrowLeft: L, a: L, A: L,
      ArrowRight: R, d: R, D: R,
      ArrowUp: U, w: U, W: U,
      ArrowDown: D, s: D, S: D,
    };
    const dir = mapK[e.key];
    if (dir) clearDir(dir);
  });

  let swipe = null;
  canvas.tabIndex = 0;
  canvas.style.outline = "none";
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
    unlockAudio();
    if (state === "title" || state === "over" || state === "attract") beginGame();
    else if (state === "pause") { state = "play"; hideOV(); }
  }, { passive: false });
  canvas.addEventListener("pointermove", (e) => {
    if (!swipe || swipe.id !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.hypot(dx, dy) > 18) {
      setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? R : L) : (dy > 0 ? D : U));
      swipe.x = e.clientX; swipe.y = e.clientY;
    }
  }, { passive: false });
  canvas.addEventListener("pointerup", (e) => {
    if (swipe && swipe.id === e.pointerId) swipe = null;
  });

  overlay.style.pointerEvents = "auto";
  overlay.addEventListener("click", () => {
    unlockAudio();
    if (state === "title" || state === "over" || state === "attract") beginGame();
    else if (state === "pause") { state = "play"; hideOV(); }
  });

  function bindHoldButton(el, onDown, onUp) {
    if (!el) return;
    const down = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (el.classList.contains("active")) return;
      el.classList.add("active");
      el.setPointerCapture?.(e.pointerId);
      unlockAudio();
      onDown(e);
    };
    const up = (e) => {
      if (!el.classList.contains("active")) return;
      e.preventDefault?.(); e.stopPropagation?.();
      el.classList.remove("active");
      onUp(e);
    };
    el.addEventListener("pointerdown", down, { passive: false });
    el.addEventListener("pointerup", up, { passive: false });
    el.addEventListener("pointercancel", up, { passive: false });
    el.addEventListener("lostpointercapture", up, { passive: false });
    el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });
  }

  document.querySelectorAll(".dpad-btn[data-dir]").forEach((btn) => {
    const d = DIR_BY_ID[btn.getAttribute("data-dir")];
    bindHoldButton(btn, () => {
      setDir(d);
      if (state === "title" || state === "over" || state === "attract") beginGame();
      else if (state === "pause") { state = "play"; hideOV(); }
    }, () => clearDir(d));
  });

  bindHoldButton(document.getElementById("btn-pause"), () => togglePauseOrStart(), () => {});
  bindHoldButton(document.getElementById("btn-mute"), () => toggleMute(), () => {});
  bindHoldButton(
    document.getElementById("btn-pump"),
    () => { if (state === "play") startPump(); else togglePauseOrStart(); },
    () => stopPump()
  );

  document.getElementById("game-wrapper").addEventListener("touchmove", (e) => {
    e.preventDefault();
  }, { passive: false });

  $high.textContent = pad(high);
  buildLevel(1);
  state = "title";
  titleT = 4200;
  showOV("DIG DUG", "INSERT COIN", null);
  hud();
  $lives.innerHTML = "";
  prev = 0;
  requestAnimationFrame(tick);
})();
