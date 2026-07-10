/**
 * DIG DUG — 1982 Namco / Atari Arcade Classic
 * Dig tunnels, pump Pookas & Fygars, drop rocks, clear the board.
 */
(() => {
  "use strict";

  // ── Board ────────────────────────────────────────────────────────────────
  const TILE = 32;
  const COLS = 14;
  const ROWS = 18; // row 0–1 sky/surface, 2+ dirt
  const W = COLS * TILE;
  const H = ROWS * TILE;
  const SURFACE = 2; // first diggable dirt row

  const EMPTY = 0, DIRT = 1, ROCK = 2;

  // Dirt band colors (arcade layered soil)
  const DIRT_COLS = [
    "#c4783a", // top soil
    "#b06028",
    "#9a4c18",
    "#7a3a10",
    "#5c2c0c",
    "#4a2408",
  ];

  const L = { x: -1, y: 0, id: "L" };
  const R = { x: 1, y: 0, id: "R" };
  const U = { x: 0, y: -1, id: "U" };
  const D = { x: 0, y: 1, id: "D" };
  const ORDER = [U, L, D, R];
  const OPP = { L: R, R: L, U: D, D: U };
  const DIR_BY_ID = { L, R, U, D };

  // Pump / pop scores (arcade-style by depth band)
  const POP_BASE = [200, 200, 300, 400, 500, 600, 700, 800];
  const VEG = [
    { e: "🥕", p: 400 }, { e: "🌽", p: 600 }, { e: "🍅", p: 800 },
    { e: "🥒", p: 1000 }, { e: "🍆", p: 2000 }, { e: "🥦", p: 3000 },
    { e: "🍄", p: 4000 }, { e: "🍍", p: 5000 },
  ];

  // ── DOM ──────────────────────────────────────────────────────────────────
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  canvas.width = W;
  canvas.height = H;
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

  // ── Audio ────────────────────────────────────────────────────────────────
  let audio = null, muted = false;
  function unlockAudio() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  }
  function tone(freq, dur, type = "square", vol = 0.035, when = 0) {
    if (muted || !audio) return;
    const t = audio.currentTime + when;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audio.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function sfx(name) {
    unlockAudio();
    if (name === "dig") tone(90, 0.04, "triangle", 0.02);
    else if (name === "pump") tone(180 + Math.random() * 40, 0.05, "square", 0.03);
    else if (name === "pop") {
      [400, 600, 900].forEach((f, i) => tone(f, 0.08, "square", 0.04, i * 0.05));
    }
    else if (name === "rock") tone(60, 0.2, "sawtooth", 0.05);
    else if (name === "die") {
      for (let i = 0; i < 8; i++) tone(300 - i * 30, 0.07, "sawtooth", 0.03, i * 0.05);
    }
    else if (name === "start") {
      [262, 330, 392, 523].forEach((f, i) => tone(f, 0.1, "square", 0.035, i * 0.1));
    }
    else if (name === "clear") {
      [392, 494, 587, 784].forEach((f, i) => tone(f, 0.1, "square", 0.035, i * 0.1));
    }
    else if (name === "veg") { tone(700, 0.06); tone(1000, 0.1, "square", 0.03, 0.06); }
    else if (name === "1up") [523, 659, 784].forEach((f, i) => tone(f, 0.08, "square", 0.035, i * 0.08));
    else if (name === "fire") tone(200, 0.12, "sawtooth", 0.03);
  }

  // ── State ────────────────────────────────────────────────────────────────
  let map = [];       // tile type
  let dug = [];       // 0–1 how dug (visual)
  let score = 0;
  let high = +localStorage.getItem("digdug_high") || 0;
  let level = 1, lives = 3, extra = false;
  let state = "title";
  let readyT = 0, dieT = 0, clearT = 0;
  let time = 0, prev = 0;
  let digdug, enemies, rocks, hose, veg, pops;
  let hold = null;
  let pumping = false;
  let vegGot = [];
  let lastDir = R;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function pad(n) { return String(n).padStart(2, "0"); }
  function midX(c) { return c * TILE + TILE * 0.5; }
  function midY(r) { return r * TILE + TILE * 0.5; }
  function colOf(x) { return Math.floor(x / TILE); }
  function rowOf(y) { return Math.floor(y / TILE); }
  function nearestCol(x) { return Math.round((x - TILE * 0.5) / TILE); }
  function nearestRow(y) { return Math.round((y - TILE * 0.5) / TILE); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function inBounds(c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS; }

  function isTunnel(c, r) {
    if (!inBounds(c, r)) return false;
    if (r < SURFACE) return true; // sky / surface open
    return map[r][c] === EMPTY || dug[r][c] >= 0.95;
  }

  function dirtBand(r) {
    return clamp(((r - SURFACE) / (ROWS - SURFACE)) * DIRT_COLS.length | 0, 0, DIRT_COLS.length - 1);
  }

  function depthScore(r) {
    const band = clamp(((r - SURFACE) / (ROWS - SURFACE)) * POP_BASE.length | 0, 0, POP_BASE.length - 1);
    return POP_BASE[band];
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
    $veg.textContent = vegGot.map((i) => VEG[i % VEG.length].e).join("");
  }

  function addScore(n) {
    score += n;
    if (score > high) {
      high = score;
      localStorage.setItem("digdug_high", String(high));
    }
    if (!extra && score >= 10000) { extra = true; lives++; sfx("1up"); }
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

  // ── Level build ──────────────────────────────────────────────────────────
  function buildLevel(lv) {
    map = [];
    dug = [];
    for (let r = 0; r < ROWS; r++) {
      map[r] = [];
      dug[r] = [];
      for (let c = 0; c < COLS; c++) {
        if (r < SURFACE) {
          map[r][c] = EMPTY;
          dug[r][c] = 1;
        } else {
          map[r][c] = DIRT;
          dug[r][c] = 0;
        }
      }
    }

    // Starting shaft under Dig Dug spawn
    const sc = 3;
    for (let r = SURFACE; r <= SURFACE + 2; r++) {
      map[r][sc] = EMPTY;
      dug[r][sc] = 1;
    }

    // Pre-dug pockets for enemies
    const pockets = [
      { c: 10, r: 6, w: 2, h: 2 },
      { c: 5, r: 10, w: 2, h: 2 },
      { c: 9, r: 13, w: 2, h: 2 },
    ];
    if (lv >= 3) pockets.push({ c: 2, r: 14, w: 2, h: 2 });
    if (lv >= 5) pockets.push({ c: 11, r: 8, w: 2, h: 2 });
    for (const p of pockets) {
      for (let r = p.r; r < p.r + p.h && r < ROWS; r++)
        for (let c = p.c; c < p.c + p.w && c < COLS; c++) {
          if (r >= SURFACE) { map[r][c] = EMPTY; dug[r][c] = 1; }
        }
    }

    // Rocks
    rocks = [];
    const rockSpots = [
      { c: 6, r: 5 }, { c: 11, r: 9 }, { c: 4, r: 12 },
    ];
    if (lv >= 2) rockSpots.push({ c: 8, r: 7 });
    if (lv >= 4) rockSpots.push({ c: 2, r: 8 });
    if (lv >= 6) rockSpots.push({ c: 12, r: 14 });
    for (const s of rockSpots) {
      if (s.r >= SURFACE && s.r < ROWS && s.c >= 0 && s.c < COLS) {
        map[s.r][s.c] = ROCK;
        dug[s.r][s.c] = 0;
        rocks.push({
          c: s.c, r: s.r,
          x: midX(s.c), y: midY(s.r),
          falling: false, fallV: 0, gone: false, crushT: 0,
        });
      }
    }

    // Player
    digdug = {
      x: midX(sc), y: midY(SURFACE + 1),
      dir: R, next: null,
      dead: false, walk: 0,
    };
    lastDir = R;
    hose = null;
    pumping = false;
    veg = null;
    pops = [];

    // Enemies: mix of Pooka & Fygar
    enemies = [];
    const nPooka = Math.min(2 + (lv / 2 | 0), 5);
    const nFygar = Math.min(1 + ((lv - 1) / 2 | 0), 4);
    const spots = pockets.map((p) => ({ c: p.c, r: p.r }));
    // extra random dirt spawns (will ghost out if buried)
    while (spots.length < nPooka + nFygar) {
      spots.push({
        c: 2 + ((Math.random() * (COLS - 4)) | 0),
        r: SURFACE + 3 + ((Math.random() * (ROWS - SURFACE - 5)) | 0),
      });
    }
    let si = 0;
    for (let i = 0; i < nPooka; i++) {
      const s = spots[si++ % spots.length];
      enemies.push(makeEnemy("pooka", s.c, s.r));
    }
    for (let i = 0; i < nFygar; i++) {
      const s = spots[si++ % spots.length];
      enemies.push(makeEnemy("fygar", s.c, s.r));
    }
  }

  function makeEnemy(type, c, r) {
    return {
      type, // pooka | fygar
      x: midX(c), y: midY(r),
      dir: Math.random() < 0.5 ? L : R,
      state: "roam", // roam | inflate | ghost | crushed | dead
      inflate: 0, // 0–4
      inflateT: 0,
      ghostT: 0,
      roamT: 2000 + Math.random() * 3000,
      fireT: 0,
      fire: null, // {x,y,dir,life}
      bob: Math.random() * 1000,
      popPts: 0,
    };
  }

  function beginLevel(n) {
    level = n;
    buildLevel(level);
    state = "ready";
    readyT = 1800;
    hold = null;
    pumping = false;
    hud();
    showOV("READY!", "LEVEL " + level, "ready");
    sfx("start");
  }

  function beginGame() {
    unlockAudio();
    score = 0; lives = 3; level = 1; extra = false; vegGot = [];
    beginLevel(1);
  }

  // ── Movement / dig ───────────────────────────────────────────────────────
  const ALIGN = 2.5;
  function aligned(e) {
    return Math.abs(e.x - midX(nearestCol(e.x))) <= ALIGN
      && Math.abs(e.y - midY(nearestRow(e.y))) <= ALIGN;
  }
  function center(e) {
    e.x = midX(nearestCol(e.x));
    e.y = midY(nearestRow(e.y));
  }

  function canEnter(c, r, digger) {
    if (!inBounds(c, r)) return false;
    if (r < 0) return false;
    if (map[r][c] === ROCK) return false;
    if (digger) return true; // Dig Dug can dig dirt
    return isTunnel(c, r);
  }

  function digAt(c, r) {
    if (!inBounds(c, r) || r < SURFACE) return;
    if (map[r][c] === DIRT) {
      dug[r][c] = Math.min(1, dug[r][c] + 0.35);
      if (dug[r][c] >= 0.95) {
        map[r][c] = EMPTY;
        dug[r][c] = 1;
        sfx("dig");
        checkRocks();
      }
    } else if (map[r][c] === EMPTY) {
      dug[r][c] = 1;
    }
  }

  function moveDigDug(dt) {
    if (!digdug || digdug.dead) return;
    const speed = pumping ? 0 : 110; // stop while pumping
    if (hold) digdug.next = hold;

    if (digdug.next && digdug.next.id === OPP[digdug.dir.id].id) {
      digdug.dir = digdug.next;
      lastDir = digdug.dir;
    }

    if (aligned(digdug) && digdug.next && digdug.next.id !== digdug.dir.id) {
      const nc = nearestCol(digdug.x) + digdug.next.x;
      const nr = nearestRow(digdug.y) + digdug.next.y;
      if (canEnter(nc, nr, true)) {
        center(digdug);
        digdug.dir = digdug.next;
        lastDir = digdug.dir;
      }
    }

    if (aligned(digdug)) {
      const nc = nearestCol(digdug.x) + digdug.dir.x;
      const nr = nearestRow(digdug.y) + digdug.dir.y;
      if (!canEnter(nc, nr, true)) {
        center(digdug);
        return;
      }
    }

    if (speed <= 0) return;
    digdug.x += digdug.dir.x * speed * (dt / 1000);
    digdug.y += digdug.dir.y * speed * (dt / 1000);
    if (digdug.dir.x !== 0) digdug.y = midY(nearestRow(digdug.y));
    else digdug.x = midX(nearestCol(digdug.x));

    digdug.x = clamp(digdug.x, TILE * 0.5, W - TILE * 0.5);
    digdug.y = clamp(digdug.y, TILE * 0.5, H - TILE * 0.5);

    // Dig cells under feet + ahead
    const c = nearestCol(digdug.x), r = nearestRow(digdug.y);
    digAt(c, r);
    digAt(c + digdug.dir.x, r + digdug.dir.y);
    digdug.walk += dt;
  }

  // ── Hose / pump ──────────────────────────────────────────────────────────
  function startPump() {
    if (state !== "play" || !digdug || digdug.dead) return;
    pumping = true;
    const range = 3;
    hose = {
      dir: digdug.dir,
      c0: nearestCol(digdug.x),
      r0: nearestRow(digdug.y),
      len: 0,
      max: range,
      target: null,
    };
  }

  function stopPump() {
    pumping = false;
    if (hose && hose.target && hose.target.state === "inflate") {
      // deflate slowly handled in enemy update
    }
    hose = null;
  }

  function updatePump(dt) {
    if (!pumping || !hose || !digdug) return;
    hose.dir = digdug.dir;
    hose.c0 = nearestCol(digdug.x);
    hose.r0 = nearestRow(digdug.y);

    // Grow hose through tunnels / empty
    hose.len = Math.min(hose.max, hose.len + dt * 0.012);
    const cells = Math.ceil(hose.len);
    hose.target = null;

    for (let i = 1; i <= cells; i++) {
      const c = hose.c0 + hose.dir.x * i;
      const r = hose.r0 + hose.dir.y * i;
      if (!inBounds(c, r)) break;
      if (map[r][c] === ROCK) break;
      // can pump through dirt a little if recently dug path; require tunnel for full reach
      if (!isTunnel(c, r) && map[r][c] === DIRT) break;

      for (const e of enemies) {
        if (e.state === "dead" || e.state === "crushed") continue;
        if (nearestCol(e.x) === c && nearestRow(e.y) === r) {
          hose.target = e;
          e.state = "inflate";
          e.inflateT += dt;
          if (e.inflateT > 220) {
            e.inflate = Math.min(4, e.inflate + 1);
            e.inflateT = 0;
            sfx("pump");
            if (e.inflate >= 4) {
              popEnemy(e);
              stopPump();
              return;
            }
          }
          return;
        }
      }
    }
  }

  function popEnemy(e) {
    const pts = depthScore(nearestRow(e.y)) * (e.type === "fygar" ? 1 : 1);
    // Fygar worth same base; deeper = more
    e.popPts = pts;
    e.state = "dead";
    addScore(pts);
    sfx("pop");
    pops.push({ x: e.x, y: e.y, p: pts, t: 800 });
    checkClear();
  }

  function checkClear() {
    if (enemies.every((e) => e.state === "dead" || e.state === "crushed")) {
      state = "clear";
      clearT = 2000;
      sfx("clear");
    }
  }

  // ── Rocks ────────────────────────────────────────────────────────────────
  function checkRocks() {
    for (const rk of rocks) {
      if (rk.gone || rk.falling) continue;
      const below = rk.r + 1;
      if (below >= ROWS) continue;
      if (isTunnel(rk.c, below) || map[below][rk.c] === EMPTY) {
        // Need a moment of unsupported — start fall
        rk.falling = true;
        rk.fallV = 0;
        map[rk.r][rk.c] = EMPTY;
        dug[rk.r][rk.c] = 1;
        sfx("rock");
      }
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
        // re-check support
        const below = rk.r + 1;
        if (below < ROWS && (isTunnel(rk.c, below) || map[below][rk.c] === EMPTY)) {
          if (map[rk.r][rk.c] === ROCK) map[rk.r][rk.c] = EMPTY;
          rk.falling = true;
          rk.fallV = 0;
        }
        continue;
      }
      rk.fallV += 480 * (dt / 1000);
      rk.y += rk.fallV * (dt / 1000);
      const nr = rowOf(rk.y + TILE * 0.45);
      // land on dirt / rock / bottom
      if (nr >= ROWS - 1) {
        rk.r = ROWS - 1;
        rk.y = midY(rk.r);
        rk.falling = false;
        map[rk.r][rk.c] = ROCK;
        continue;
      }
      if (nr > rk.r) {
        // left previous
        rk.r = nr;
      }
      // hit solid
      const landR = nearestRow(rk.y);
      const under = landR + 1;
      if (under < ROWS && map[under][rk.c] === DIRT && dug[under][rk.c] < 0.5) {
        rk.r = landR;
        rk.y = midY(rk.r);
        rk.falling = false;
        map[rk.r][rk.c] = ROCK;
        dug[rk.r][rk.c] = 0;
      } else if (under < ROWS && map[under][rk.c] === ROCK) {
        rk.r = landR;
        rk.y = midY(rk.r);
        rk.falling = false;
        map[rk.r][rk.c] = ROCK;
      }

      // crush entities
      for (const e of enemies) {
        if (e.state === "dead" || e.state === "crushed") continue;
        if (Math.hypot(e.x - rk.x, e.y - rk.y) < TILE * 0.7) {
          e.state = "crushed";
          const pts = depthScore(nearestRow(e.y)) * 2;
          addScore(pts);
          pops.push({ x: e.x, y: e.y, p: pts, t: 900 });
          sfx("pop");
          // vegetable bonus
          const vi = Math.min(level - 1, VEG.length - 1);
          veg = { i: vi, p: VEG[vi].p, e: VEG[vi].e, x: e.x, y: e.y, t: 6000 };
          checkClear();
        }
      }
      if (digdug && !digdug.dead && Math.hypot(digdug.x - rk.x, digdug.y - rk.y) < TILE * 0.55) {
        killPlayer();
      }
    }
  }

  // ── Enemies ──────────────────────────────────────────────────────────────
  function enemySpeed() {
    return 55 + Math.min(level, 10) * 4;
  }

  function pickEnemyDir(e) {
    const c = nearestCol(e.x), r = nearestRow(e.y);
    const rev = OPP[e.dir.id];
    const opts = [];
    for (const d of ORDER) {
      if (d.id === rev.id) continue;
      const nc = c + d.x, nr = r + d.y;
      if (!inBounds(nc, nr)) continue;
      if (e.state === "ghost") {
        if (map[nr][nc] !== ROCK) opts.push(d);
      } else if (isTunnel(nc, nr)) {
        opts.push(d);
      }
    }
    if (!opts.length) {
      // reverse or ghost
      if (isTunnel(c + rev.x, r + rev.y)) e.dir = rev;
      else {
        e.state = "ghost";
        e.ghostT = 2500 + Math.random() * 1500;
      }
      return;
    }
    // chase dig dug sometimes
    if (digdug && !digdug.dead && Math.random() < 0.55) {
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
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      e.bob += dt;
      if (e.state === "dead" || e.state === "crushed") continue;

      if (e.state === "inflate") {
        if (!pumping || !hose || hose.target !== e) {
          // deflate
          e.inflateT += dt;
          if (e.inflateT > 400) {
            e.inflate = Math.max(0, e.inflate - 1);
            e.inflateT = 0;
            if (e.inflate <= 0) e.state = "roam";
          }
        }
        continue;
      }

      if (e.state === "ghost") {
        e.ghostT -= dt;
        const sp = enemySpeed() * 0.7;
        if (aligned(e)) pickEnemyDir(e);
        e.x += e.dir.x * sp * (dt / 1000);
        e.y += e.dir.y * sp * (dt / 1000);
        e.x = clamp(e.x, TILE * 0.5, W - TILE * 0.5);
        e.y = clamp(e.y, midY(SURFACE), H - TILE * 0.5);
        if (e.ghostT <= 0 && isTunnel(nearestCol(e.x), nearestRow(e.y))) {
          e.state = "roam";
          center(e);
        }
        // touch player while ghost still kills
        if (digdug && !digdug.dead && Math.hypot(e.x - digdug.x, e.y - digdug.y) < TILE * 0.5) {
          killPlayer();
        }
        continue;
      }

      // roam in tunnels
      e.roamT -= dt;
      const sp = enemySpeed();
      if (aligned(e)) {
        center(e);
        if (e.roamT <= 0 || !isTunnel(nearestCol(e.x) + e.dir.x, nearestRow(e.y) + e.dir.y)) {
          pickEnemyDir(e);
          e.roamT = 800 + Math.random() * 1800;
        }
        // enter ghost if stuck long
        const opts = ORDER.filter((d) => {
          const nc = nearestCol(e.x) + d.x, nr = nearestRow(e.y) + d.y;
          return inBounds(nc, nr) && isTunnel(nc, nr);
        });
        if (!opts.length) {
          e.state = "ghost";
          e.ghostT = 2000 + Math.random() * 2000;
        }
      }
      const nc = nearestCol(e.x) + e.dir.x;
      const nr = nearestRow(e.y) + e.dir.y;
      if (aligned(e) && !isTunnel(nc, nr)) {
        pickEnemyDir(e);
      } else {
        e.x += e.dir.x * sp * (dt / 1000);
        e.y += e.dir.y * sp * (dt / 1000);
        if (e.dir.x !== 0) e.y = midY(nearestRow(e.y));
        else e.x = midX(nearestCol(e.x));
      }
      e.x = clamp(e.x, TILE * 0.5, W - TILE * 0.5);
      e.y = clamp(e.y, midY(SURFACE - 1), H - TILE * 0.5);

      // Fygar fire
      if (e.type === "fygar") {
        e.fireT -= dt;
        if (e.fire && e.fire.life > 0) {
          e.fire.life -= dt;
          e.fire.x += e.fire.dir.x * 140 * (dt / 1000);
          if (digdug && !digdug.dead) {
            if (Math.abs(digdug.y - e.fire.y) < TILE * 0.4
              && Math.abs(digdug.x - e.fire.x) < TILE * 1.2) {
              killPlayer();
            }
          }
          if (e.fire.life <= 0) e.fire = null;
        } else if (e.fireT <= 0 && digdug && !digdug.dead) {
          // same row roughly
          if (Math.abs(nearestRow(e.y) - nearestRow(digdug.y)) <= 0
            && Math.abs(e.x - digdug.x) < TILE * 5
            && isTunnel(nearestCol(e.x), nearestRow(e.y))) {
            const fd = digdug.x >= e.x ? R : L;
            e.fire = { x: e.x + fd.x * TILE * 0.6, y: e.y, dir: fd, life: 500 };
            e.fireT = 2800 + Math.random() * 1500;
            e.dir = fd;
            sfx("fire");
          } else {
            e.fireT = 400 + Math.random() * 600;
          }
        }
      }

      if (digdug && !digdug.dead && Math.hypot(e.x - digdug.x, e.y - digdug.y) < TILE * 0.48) {
        killPlayer();
      }
    }
  }

  function killPlayer() {
    if (!digdug || digdug.dead || state !== "play") return;
    digdug.dead = true;
    lives--;
    hud();
    sfx("die");
    state = "die";
    dieT = 1600;
    pumping = false;
    hose = null;
  }

  // ── Veg ──────────────────────────────────────────────────────────────────
  function updateVeg(dt) {
    if (!veg) return;
    veg.t -= dt;
    if (veg.t <= 0) { veg = null; return; }
    if (digdug && !digdug.dead && Math.hypot(digdug.x - veg.x, digdug.y - veg.y) < TILE * 0.7) {
      addScore(veg.p);
      vegGot.push(veg.i);
      if (vegGot.length > 6) vegGot.shift();
      sfx("veg");
      pops.push({ x: veg.x, y: veg.y, p: veg.p, t: 800 });
      veg = null;
      hud();
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────
  function update(dt) {
    time += dt;
    if (state === "title" || state === "pause" || state === "over") return;

    if (state === "ready") {
      readyT -= dt;
      if (readyT <= 0) { state = "play"; hideOV(); }
      return;
    }

    if (state === "die") {
      dieT -= dt;
      if (dieT <= 0) {
        if (lives <= 0) {
          state = "over";
          showOV("GAME OVER", isTouchPrimary() ? "TAP TO RESTART" : "PRESS SPACE", "gameover");
          return;
        }
        buildLevel(level);
        state = "ready";
        readyT = 1500;
        showOV("READY!", "", "ready");
      }
      return;
    }

    if (state === "clear") {
      clearT -= dt;
      if (clearT <= 0) beginLevel(level + 1);
      return;
    }

    // play
    if (!pumping) moveDigDug(dt);
    else {
      // still allow facing change while pumping
      if (hold) {
        digdug.dir = hold;
        lastDir = hold;
      }
    }
    updatePump(dt);
    updateEnemies(dt);
    updateRocks(dt);
    updateVeg(dt);

    for (const p of pops) p.t -= dt;
    pops = pops.filter((p) => p.t > 0);

    // periodic rock support check
    if ((time / 200 | 0) !== ((time - dt) / 200 | 0)) checkRocks();
  }

  // ── Draw ─────────────────────────────────────────────────────────────────
  function drawWorld() {
    // Sky
    const grd = ctx.createLinearGradient(0, 0, 0, SURFACE * TILE);
    grd.addColorStop(0, "#5ec8ff");
    grd.addColorStop(1, "#b8e8ff");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, SURFACE * TILE);

    // Surface grass strip
    ctx.fillStyle = "#3d9e2f";
    ctx.fillRect(0, SURFACE * TILE - 6, W, 6);
    // flowers
    for (let c = 0; c < COLS; c++) {
      if (c % 2 === 0) {
        ctx.fillStyle = "#ff6688";
        ctx.beginPath();
        ctx.arc(midX(c), SURFACE * TILE - 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dirt / tunnels
    for (let r = SURFACE; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE, y = r * TILE;
        if (map[r][c] === DIRT || (map[r][c] === ROCK && dug[r][c] < 1)) {
          const band = dirtBand(r);
          ctx.fillStyle = DIRT_COLS[band];
          ctx.fillRect(x, y, TILE, TILE);
          // dig progress (partial hole)
          if (dug[r][c] > 0.05 && dug[r][c] < 0.95) {
            ctx.fillStyle = "#1a0c04";
            const s = dug[r][c] * TILE * 0.85;
            ctx.fillRect(x + (TILE - s) / 2, y + (TILE - s) / 2, s, s);
          }
          // speckles
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fillRect(x + 4, y + 8, 3, 3);
          ctx.fillRect(x + 18, y + 20, 2, 2);
        } else if (map[r][c] === EMPTY || dug[r][c] >= 0.95) {
          // tunnel void
          ctx.fillStyle = "#140a04";
          ctx.fillRect(x, y, TILE, TILE);
          // faint tunnel wall outline
          ctx.strokeStyle = DIRT_COLS[dirtBand(r)];
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
        }
      }
    }

    // Rocks
    for (const rk of rocks) {
      if (rk.gone) continue;
      drawRock(rk.x, rk.y, rk.crushT > 0);
    }
  }

  function drawRock(x, y, flash) {
    ctx.fillStyle = flash ? "#888" : "#6a6a6a";
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 12, y - 4);
    ctx.lineTo(x + 10, y + 12);
    ctx.lineTo(x - 10, y + 12);
    ctx.lineTo(x - 12, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#999";
    ctx.beginPath();
    ctx.arc(x - 3, y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDigDug() {
    if (!digdug) return;
    const x = digdug.x, y = digdug.y;
    if (digdug.dead) {
      ctx.fillStyle = "#fff";
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("X", x, y + 4);
      return;
    }
    const facing = digdug.dir.x < 0 ? -1 : 1;
    // body
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 8, y - 10, 16, 18);
    // blue pants
    ctx.fillStyle = "#2244cc";
    ctx.fillRect(x - 8, y + 2, 16, 8);
    // eyes
    ctx.fillStyle = "#2244cc";
    ctx.fillRect(x + facing * 2 - 2, y - 6, 3, 3);
    // helmet
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y - 10, 8, Math.PI, 0);
    ctx.fill();
    // pump gun
    ctx.fillStyle = "#cc3333";
    ctx.fillRect(x + facing * 6, y - 2, facing * 10, 4);

    // hose
    if (hose) {
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + facing * 14, y);
      const hx = x + hose.dir.x * hose.len * TILE;
      const hy = y + hose.dir.y * hose.len * TILE;
      ctx.lineTo(hx, hy);
      ctx.stroke();
      // nozzle
      ctx.fillStyle = "#aaa";
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemy(e) {
    if (e.state === "dead") return;
    const x = e.x, y = e.y + Math.sin(e.bob / 200) * 1.5;
    const scale = 1 + e.inflate * 0.22;

    if (e.state === "crushed") {
      ctx.fillStyle = "#666";
      ctx.fillRect(x - 10, y + 4, 20, 6);
      return;
    }

    if (e.state === "ghost") {
      ctx.globalAlpha = 0.55;
    }

    if (e.type === "pooka") {
      // red balloon goggles
      ctx.fillStyle = e.inflate >= 3 ? "#ff8888" : "#ee3030";
      ctx.beginPath();
      ctx.ellipse(x, y, 11 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x - 4 * scale, y - 2, 4 * scale, 0, Math.PI * 2);
      ctx.arc(x + 4 * scale, y - 2, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x - 4 * scale + e.dir.x, y - 2, 1.8, 0, Math.PI * 2);
      ctx.arc(x + 4 * scale + e.dir.x, y - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // feet
      ctx.fillStyle = "#cc2020";
      ctx.fillRect(x - 8, y + 10 * scale, 6, 4);
      ctx.fillRect(x + 2, y + 10 * scale, 6, 4);
    } else {
      // Fygar green dragon
      ctx.fillStyle = e.inflate >= 3 ? "#aaffaa" : "#33aa44";
      ctx.beginPath();
      ctx.ellipse(x, y, 12 * scale, 10 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x + e.dir.x * 4, y - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x + e.dir.x * 5, y - 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // wings
      ctx.fillStyle = "#2d8a38";
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x - 14, y - 10);
      ctx.lineTo(x - 4, y - 4);
      ctx.fill();
      // fire breath
      if (e.fire) {
        ctx.fillStyle = "#ff6600";
        ctx.beginPath();
        ctx.ellipse(e.fire.x, e.fire.y, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.ellipse(e.fire.x + e.fire.dir.x * 6, e.fire.y, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // inflate rings
    if (e.inflate > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 12 + e.inflate * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function drawVeg() {
    if (!veg) return;
    ctx.font = "18px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(veg.e, veg.x, veg.y);
  }

  function drawPops() {
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    for (const p of pops) {
      ctx.globalAlpha = clamp(p.t / 800, 0, 1);
      ctx.fillText(String(p.p), p.x, p.y - (800 - p.t) * 0.02);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    drawWorld();
    drawVeg();
    for (const e of enemies) drawEnemy(e);
    if (state !== "die" || (dieT > 800)) drawDigDug();
    else drawDigDug();
    drawPops();

    if (state === "ready") {
      ctx.fillStyle = "#f4c430";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("READY!", W / 2, H * 0.45);
    }
    if (state === "clear") {
      ctx.fillStyle = "#f4c430";
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("STAGE CLEAR", W / 2, H * 0.45);
    }
  }

  // ── Loop ─────────────────────────────────────────────────────────────────
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

  // ── Input ────────────────────────────────────────────────────────────────
  function setDir(d) {
    if (!d) return;
    hold = d;
    if (digdug && (state === "play" || state === "ready")) {
      digdug.next = d;
      if (state === "play" && d.id === OPP[digdug.dir.id].id) {
        digdug.dir = d;
        lastDir = d;
      }
    }
  }
  function clearDir(d) {
    if (d && hold && d.id === hold.id) hold = null;
  }

  function togglePauseOrStart() {
    unlockAudio();
    if (state === "title" || state === "over") beginGame();
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
      btn.textContent = muted ? "✕" : "♪";
      btn.classList.toggle("active", muted);
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "m" || e.key === "M") { toggleMute(); return; }
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      if (state === "title" || state === "over" || state === "pause") {
        togglePauseOrStart();
      } else if (state === "play") {
        if (!pumping) startPump();
      }
      return;
    }
    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (state === "play") togglePauseOrStart();
      return;
    }
    const mapK = {
      ArrowLeft: L, a: L, A: L,
      ArrowRight: R, d: R, D: R,
      ArrowUp: U, w: U, W: U,
      ArrowDown: D, s: D, S: D,
    };
    const dir = mapK[e.key] || mapK[e.code];
    if (dir) {
      e.preventDefault();
      setDir(dir);
    }
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.key === " ") {
      stopPump();
      return;
    }
    const mapK = {
      ArrowLeft: L, a: L, A: L,
      ArrowRight: R, d: R, D: R,
      ArrowUp: U, w: U, W: U,
      ArrowDown: D, s: D, S: D,
    };
    const dir = mapK[e.key];
    if (dir) clearDir(dir);
  });

  // Canvas swipe / tap
  let swipe = null;
  canvas.tabIndex = 0;
  canvas.style.outline = "none";
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
    unlockAudio();
    if (state === "title" || state === "over") beginGame();
    else if (state === "pause") { state = "play"; hideOV(); }
  }, { passive: false });
  canvas.addEventListener("pointermove", (e) => {
    if (!swipe || swipe.id !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.hypot(dx, dy) > 20) {
      const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? R : L) : (dy > 0 ? D : U);
      setDir(d);
      swipe.x = e.clientX;
      swipe.y = e.clientY;
    }
  }, { passive: false });
  canvas.addEventListener("pointerup", (e) => {
    if (swipe && swipe.id === e.pointerId) swipe = null;
  });

  overlay.style.pointerEvents = "auto";
  overlay.addEventListener("click", () => {
    unlockAudio();
    if (state === "title" || state === "over") beginGame();
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
      if (state === "title" || state === "over") beginGame();
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

  // ── Boot ─────────────────────────────────────────────────────────────────
  $high.textContent = pad(high);
  buildLevel(1);
  state = "title";
  showOV("DIG DUG", "INSERT COIN", null);
  hud();
  $lives.innerHTML = "";
  prev = 0;
  requestAnimationFrame(tick);
})();
