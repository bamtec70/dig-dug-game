/**
 * DIG DUG — 1982 Namco / Atari Arcade Classic
 * Dig tunnels, pump Pookas & Fygars, crush with rocks.
 */
(() => {
  "use strict";

  // ── Board ────────────────────────────────────────────────────────────────
  // Vertical arcade shape (narrower than tall), sized to match Ms. Pac-Man
  // on-screen presence: Ms. Pac ≈ 672×744; Dig Dug ≈ 720×864 (taller).
  const TILE = 48;
  const S = TILE / 28;   // sprite scale vs original 28px art
  const COLS = 15;
  const ROWS = 18;       // 0–1 surface, 2+ dirt — more vertical than Pac-Man
  const W = COLS * TILE; // 720
  const H = ROWS * TILE; // 864
  const SURFACE = 2;

  const EMPTY = 0, DIRT = 1, ROCK = 2;

  // Arcade layered soil (top → deep)
  const DIRT_COLS = ["#e8a050", "#d08030", "#b06020", "#904818", "#703810", "#502808"];
  const DIRT_EDGE = ["#f0b868", "#e09840", "#c07028", "#a05420", "#804418", "#603010"];

  const L = { x: -1, y: 0, id: "L" };
  const R = { x: 1, y: 0, id: "R" };
  const U = { x: 0, y: -1, id: "U" };
  const D = { x: 0, y: 1, id: "D" };
  const ORDER = [U, L, D, R];
  const OPP = { L: R, R: L, U: D, D: U };
  const DIR_BY_ID = { L, R, U, D };

  // Pop points by dirt layer (deeper = more)
  const POP_BASE = [200, 200, 300, 400, 500, 600, 700, 800];
  const VEG = [
    { e: "🥕", p: 400 }, { e: "🌽", p: 600 }, { e: "🍅", p: 800 },
    { e: "🥒", p: 1000 }, { e: "🍆", p: 2000 }, { e: "🥦", p: 3000 },
    { e: "🍄", p: 4000 }, { e: "🍍", p: 5000 },
  ];

  // Speeds (px/sec) — scaled with TILE (base was for 28px tiles)
  const SPD_DIG = 105 * (TILE / 28);
  const SPD_DIG_DIRT = 70 * (TILE / 28);
  const SPD_ENEMY = 72 * (TILE / 28);
  const SPD_GHOST = 58 * (TILE / 28);
  const SPD_ROCK = 220 * (TILE / 28);

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
    if (name === "dig") tone(85 + Math.random() * 20, 0.035, "triangle", 0.018);
    else if (name === "pump") tone(160 + Math.random() * 50, 0.05, "square", 0.03);
    else if (name === "pop") [350, 550, 850].forEach((f, i) => tone(f, 0.07, "square", 0.04, i * 0.05));
    else if (name === "rock") tone(55, 0.22, "sawtooth", 0.045);
    else if (name === "die") { for (let i = 0; i < 8; i++) tone(320 - i * 32, 0.07, "sawtooth", 0.03, i * 0.05); }
    else if (name === "start") [294, 370, 440, 587].forEach((f, i) => tone(f, 0.1, "square", 0.035, i * 0.1));
    else if (name === "clear") [392, 494, 587, 784].forEach((f, i) => tone(f, 0.1, "square", 0.035, i * 0.1));
    else if (name === "veg") { tone(700, 0.06); tone(1000, 0.1, "square", 0.03, 0.06); }
    else if (name === "1up") [523, 659, 784].forEach((f, i) => tone(f, 0.08, "square", 0.035, i * 0.08));
    else if (name === "fire") tone(180, 0.14, "sawtooth", 0.03);
    else if (name === "ghost") tone(120, 0.08, "triangle", 0.02);
  }

  // ── State ────────────────────────────────────────────────────────────────
  let map = [], dug = [];
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
  let flowerPhase = 0;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function pad(n) { return String(n).padStart(2, "0"); }
  function midX(c) { return c * TILE + TILE * 0.5; }
  function midY(r) { return r * TILE + TILE * 0.5; }
  function nearestCol(x) { return Math.round((x - TILE * 0.5) / TILE); }
  function nearestRow(y) { return Math.round((y - TILE * 0.5) / TILE); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function inBounds(c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS; }

  function isTunnel(c, r) {
    if (!inBounds(c, r)) return false;
    if (r < SURFACE) return true;
    return map[r][c] === EMPTY;
  }

  function dirtBand(r) {
    return clamp(((r - SURFACE) / Math.max(1, ROWS - SURFACE - 1)) * DIRT_COLS.length | 0, 0, DIRT_COLS.length - 1);
  }

  function depthScore(r) {
    const band = clamp(((r - SURFACE) / Math.max(1, ROWS - SURFACE - 1)) * POP_BASE.length | 0, 0, POP_BASE.length - 1);
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

  // Grid alignment — only for turn decisions (must be << one frame of movement)
  const ALIGN = 1.2 * (TILE / 28); // keep << one frame of movement
  function atCenter(e) {
    return Math.abs(e.x - midX(nearestCol(e.x))) <= ALIGN
      && Math.abs(e.y - midY(nearestRow(e.y))) <= ALIGN;
  }
  function snapCenter(e) {
    e.x = midX(nearestCol(e.x));
    e.y = midY(nearestRow(e.y));
  }

  // ── Level build ──────────────────────────────────────────────────────────
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

  function carvePath(cells) {
    for (const p of cells) carve(p.c, p.r);
  }

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

    // Player start shaft (classic left-side entry)
    const sc = 2;
    carve(sc, SURFACE);
    carve(sc, SURFACE + 1);
    carve(sc, SURFACE + 2);
    carve(sc + 1, SURFACE + 2);

    // Connected tunnel network (enemies can patrol) — arcade-like pockets + corridors
    // Horizontal lanes
    for (let c = 4; c <= 12; c++) carve(c, 6);
    for (let c = 1; c <= 8; c++) carve(c, 10);
    for (let c = 5; c <= 13; c++) carve(c, 14);
    // Vertical connectors
    for (let r = 6; r <= 10; r++) carve(6, r);
    for (let r = 6; r <= 10; r++) carve(11, r);
    for (let r = 10; r <= 14; r++) carve(4, r);
    for (let r = 10; r <= 14; r++) carve(9, r);
    for (let r = 6; r <= 14; r++) carve(13, r);

    // Extra lanes by level
    if (lv >= 2) {
      for (let c = 2; c <= 7; c++) carve(c, 8);
      for (let r = 8; r <= 12; r++) carve(2, r);
    }
    if (lv >= 3) {
      for (let c = 8; c <= 12; c++) carve(c, 12);
      for (let r = 12; r <= 16; r++) carve(12, r);
    }
    if (lv >= 5) {
      for (let c = 1; c <= 5; c++) carve(c, 16);
      for (let r = 14; r <= 16; r++) carve(1, r);
    }

    // Rocks (hover in dirt — fall when tunnel opens below)
    rocks = [];
    const rockSpots = [
      { c: 5, r: 5 }, { c: 10, r: 8 }, { c: 7, r: 12 }, { c: 12, r: 11 },
    ];
    if (lv >= 3) rockSpots.push({ c: 3, r: 9 });
    if (lv >= 5) rockSpots.push({ c: 8, r: 15 });
    if (lv >= 7) rockSpots.push({ c: 14, r: 7 });
    for (const s of rockSpots) {
      if (s.r >= SURFACE && s.r < ROWS && s.c >= 0 && s.c < COLS) {
        map[s.r][s.c] = ROCK;
        dug[s.r][s.c] = 0;
        rocks.push({
          c: s.c, r: s.r,
          x: midX(s.c), y: midY(s.r),
          falling: false, fallV: 0, gone: false, crushT: 0, warn: 0,
        });
      }
    }

    digdug = {
      x: midX(sc), y: midY(SURFACE + 1),
      dir: R, next: null,
      dead: false, walk: 0, digAnim: 0,
    };
    hose = null;
    pumping = false;
    veg = null;
    pops = [];

    // Spawn enemies ON the tunnel network
    const spawnCells = [];
    for (let r = SURFACE; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (map[r][c] === EMPTY && !(c === sc && r <= SURFACE + 2))
          spawnCells.push({ c, r });

    function pickSpawn(preferDeep) {
      const pool = spawnCells.filter((p) => preferDeep ? p.r >= 9 : p.r < 12);
      const use = pool.length ? pool : spawnCells;
      return use[(Math.random() * use.length) | 0] || { c: 10, r: 6 };
    }

    enemies = [];
    const nPooka = Math.min(2 + ((lv - 1) / 2 | 0), 5);
    const nFygar = Math.min(1 + ((lv - 1) / 2 | 0), 4);
    for (let i = 0; i < nPooka; i++) {
      const s = pickSpawn(i > 0);
      enemies.push(makeEnemy("pooka", s.c, s.r));
    }
    for (let i = 0; i < nFygar; i++) {
      const s = pickSpawn(true);
      enemies.push(makeEnemy("fygar", s.c, s.r));
    }
  }

  function makeEnemy(type, c, r) {
    const dirs = [L, R, U, D];
    return {
      type,
      x: midX(c), y: midY(r),
      dir: dirs[(Math.random() * 4) | 0],
      state: "roam", // roam | inflate | ghost | crushed | dead
      inflate: 0,
      inflateT: 0,
      ghostT: 0,
      anger: 0,        // builds while stuck → ghost
      moveBudget: 0,
      fireT: 1500 + Math.random() * 2000,
      fire: null,
      bob: Math.random() * 1000,
      step: 0,
    };
  }

  function beginLevel(n) {
    level = n;
    buildLevel(level);
    state = "ready";
    readyT = 1600;
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

  // ── Dig Dug movement ─────────────────────────────────────────────────────
  function canDigDugEnter(c, r) {
    if (!inBounds(c, r)) return false;
    if (r < 0) return false;
    if (map[r][c] === ROCK) return false;
    return true; // can dig dirt
  }

  function digCell(c, r) {
    if (!inBounds(c, r) || r < SURFACE) return false;
    if (map[r][c] === DIRT) {
      dug[r][c] = Math.min(1, dug[r][c] + 0.55);
      digdug.digAnim = 1;
      if (dug[r][c] >= 1) {
        map[r][c] = EMPTY;
        sfx("dig");
        checkRocks();
        return true;
      }
      return true; // carving
    }
    return false;
  }

  function moveDigDug(dt) {
    if (!digdug || digdug.dead || pumping) return;
    if (hold) digdug.next = hold;

    // Instant reverse
    if (digdug.next && digdug.next.id === OPP[digdug.dir.id].id) {
      digdug.dir = digdug.next;
    }

    // Turn at centers only
    if (atCenter(digdug) && digdug.next && digdug.next.id !== digdug.dir.id) {
      const nc = nearestCol(digdug.x) + digdug.next.x;
      const nr = nearestRow(digdug.y) + digdug.next.y;
      if (canDigDugEnter(nc, nr)) {
        snapCenter(digdug);
        digdug.dir = digdug.next;
      }
    }

    // Blocked ahead?
    if (atCenter(digdug)) {
      const nc = nearestCol(digdug.x) + digdug.dir.x;
      const nr = nearestRow(digdug.y) + digdug.dir.y;
      if (!canDigDugEnter(nc, nr)) {
        snapCenter(digdug);
        return;
      }
      // If next is dirt, dig first (slower progress)
      if (inBounds(nc, nr) && map[nr][nc] === DIRT) {
        digCell(nc, nr);
        if (map[nr][nc] === DIRT) {
          // still carving — inch forward slowly
          const sp = SPD_DIG_DIRT * (dt / 1000);
          digdug.x += digdug.dir.x * sp;
          digdug.y += digdug.dir.y * sp;
          return;
        }
      }
    }

    const aheadC = nearestCol(digdug.x + digdug.dir.x * TILE * 0.4);
    const aheadR = nearestRow(digdug.y + digdug.dir.y * TILE * 0.4);
    const carving = inBounds(aheadC, aheadR) && map[aheadR][aheadC] === DIRT;
    const sp = (carving ? SPD_DIG_DIRT : SPD_DIG) * (dt / 1000);

    digdug.x += digdug.dir.x * sp;
    digdug.y += digdug.dir.y * sp;

    // Axis lock
    if (digdug.dir.x !== 0) digdug.y = midY(nearestRow(digdug.y));
    else digdug.x = midX(nearestCol(digdug.x));

    digdug.x = clamp(digdug.x, TILE * 0.5, W - TILE * 0.5);
    digdug.y = clamp(digdug.y, TILE * 0.5, H - TILE * 0.5);

    // Dig under feet
    digCell(nearestCol(digdug.x), nearestRow(digdug.y));
    digdug.walk += dt;
    if (digdug.digAnim > 0) digdug.digAnim -= dt * 0.008;
  }

  // ── Pump ─────────────────────────────────────────────────────────────────
  function startPump() {
    if (state !== "play" || !digdug || digdug.dead) return;
    pumping = true;
    hose = { dir: digdug.dir, len: 0, max: 3.2, target: null };
  }
  function stopPump() {
    pumping = false;
    hose = null;
  }

  function updatePump(dt) {
    if (!pumping || !hose || !digdug) return;
    hose.dir = digdug.dir;
    hose.len = Math.min(hose.max, hose.len + dt * 0.014);

    const c0 = nearestCol(digdug.x);
    const r0 = nearestRow(digdug.y);
    const cells = Math.ceil(hose.len);
    hose.target = null;

    for (let i = 1; i <= cells; i++) {
      const c = c0 + hose.dir.x * i;
      const r = r0 + hose.dir.y * i;
      if (!inBounds(c, r)) break;
      if (map[r][c] === ROCK) break;
      if (map[r][c] === DIRT) break; // hose only through open tunnels

      for (const e of enemies) {
        if (e.state === "dead" || e.state === "crushed") continue;
        if (nearestCol(e.x) === c && nearestRow(e.y) === r) {
          hose.target = e;
          if (e.state === "ghost") e.state = "roam"; // harpoon pulls ghost back
          e.state = "inflate";
          e.inflateT += dt;
          if (e.inflateT > 200) {
            e.inflate = Math.min(4, e.inflate + 1);
            e.inflateT = 0;
            sfx("pump");
            if (e.inflate >= 4) {
              popEnemy(e);
              stopPump();
            }
          }
          return;
        }
      }
    }
  }

  function popEnemy(e) {
    const pts = depthScore(nearestRow(e.y));
    e.state = "dead";
    addScore(pts);
    sfx("pop");
    pops.push({ x: e.x, y: e.y, p: pts, t: 900 });
    checkClear();
  }

  function checkClear() {
    if (enemies.every((e) => e.state === "dead" || e.state === "crushed")) {
      state = "clear";
      clearT = 1800;
      sfx("clear");
    }
  }

  // ── Rocks ────────────────────────────────────────────────────────────────
  function checkRocks() {
    for (const rk of rocks) {
      if (rk.gone || rk.falling) continue;
      const below = rk.r + 1;
      if (below >= ROWS) continue;
      if (map[below][rk.c] === EMPTY) {
        rk.warn += 1;
        if (rk.warn >= 2) {
          rk.falling = true;
          rk.fallV = 40;
          if (map[rk.r][rk.c] === ROCK) map[rk.r][rk.c] = EMPTY;
          sfx("rock");
        }
      } else {
        rk.warn = 0;
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
        const below = rk.r + 1;
        if (below < ROWS && map[below][rk.c] === EMPTY) {
          rk.warn += dt;
          if (rk.warn > 180) {
            rk.falling = true;
            rk.fallV = 40;
            if (map[rk.r][rk.c] === ROCK) map[rk.r][rk.c] = EMPTY;
            sfx("rock");
          }
        } else rk.warn = 0;
        continue;
      }

      rk.fallV = Math.min(SPD_ROCK, rk.fallV + 500 * (dt / 1000));
      rk.y += rk.fallV * (dt / 1000);
      rk.r = nearestRow(rk.y);

      // Land on dirt / rock / bottom
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

      // Crush
      for (const e of enemies) {
        if (e.state === "dead" || e.state === "crushed") continue;
        if (Math.hypot(e.x - rk.x, e.y - rk.y) < TILE * 0.65) {
          e.state = "crushed";
          const pts = depthScore(nearestRow(e.y)) * 2;
          addScore(pts);
          pops.push({ x: e.x, y: e.y, p: pts, t: 900 });
          sfx("pop");
          const vi = Math.min(level - 1, VEG.length - 1);
          veg = { i: vi, p: VEG[vi].p, e: VEG[vi].e, x: e.x, y: e.y, t: 7000 };
          checkClear();
        }
      }
      if (digdug && !digdug.dead && Math.hypot(digdug.x - rk.x, digdug.y - rk.y) < TILE * 0.5) {
        killPlayer();
      }
    }
  }

  // ── Enemy AI (cell-to-cell, no center-snap freeze) ───────────────────────
  function enemySpd(e) {
    const base = e.state === "ghost" ? SPD_GHOST : SPD_ENEMY;
    return base + Math.min(level, 8) * 5;
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
      // No tunnel exit — go ghost (float through dirt)
      e.state = "ghost";
      e.ghostT = 2800 + Math.random() * 1800;
      e.anger = 0;
      sfx("ghost");
      // pick any free non-rock direction
      const gopts = ORDER.filter((d) => {
        const nc = c + d.x, nr = r + d.y;
        return inBounds(nc, nr) && map[nr][nc] !== ROCK && nr >= SURFACE - 1;
      });
      e.dir = gopts.length ? gopts[(Math.random() * gopts.length) | 0] : R;
      return;
    }

    // Prefer chase Dig Dug along open tunnels
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
    // Aim toward nearest tunnel cell, or Dig Dug
    let opts = ORDER.filter((d) => {
      if (d.id === rev.id) return false;
      const nc = c + d.x, nr = r + d.y;
      return inBounds(nc, nr) && map[nr][nc] !== ROCK && nr >= SURFACE - 1;
    });
    if (!opts.length) {
      opts = ORDER.filter((d) => {
        const nc = c + d.x, nr = r + d.y;
        return inBounds(nc, nr) && map[nr][nc] !== ROCK;
      });
    }
    if (!opts.length) { e.dir = rev; return; }

    // Prefer moving into tunnels; else toward player
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
    // Continuous motion; only decide turns at tile centers — never snap-loop
    const step = sp * (dt / 1000);
    const c = nearestCol(e.x);
    const r = nearestRow(e.y);

    if (atCenter(e)) {
      // Soft-align once (not every subpixel while near center)
      if (Math.abs(e.x - midX(c)) > 0.01 || Math.abs(e.y - midY(r)) > 0.01) {
        e.x = midX(c);
        e.y = midY(r);
      }
      if (mode === "ghost") pickGhostDir(e);
      else pickRoamDir(e);

      // If still blocked after pick, try reverse / ghost
      const nc = c + e.dir.x, nr = r + e.dir.y;
      if (mode !== "ghost" && (!inBounds(nc, nr) || !isTunnel(nc, nr))) {
        e.anger += dt + 80;
        if (e.anger > 400) {
          e.state = "ghost";
          e.ghostT = 2500 + Math.random() * 2000;
          sfx("ghost");
        }
        return; // wait for new decision next frame
      }
    } else {
      // Approaching next tile — if that tile became blocked, stop at center
      const nc = c + e.dir.x, nr = r + e.dir.y;
      if (mode !== "ghost" && inBounds(nc, nr) && !isTunnel(nc, nr)) {
        // Pull back to current center and re-decide next frame
        e.x = midX(c);
        e.y = midY(r);
        e.anger += dt;
        return;
      }
    }

    e.x += e.dir.x * step;
    e.y += e.dir.y * step;

    // Axis lock
    if (e.dir.x !== 0) e.y = midY(nearestRow(e.y));
    else e.x = midX(nearestCol(e.x));

    e.x = clamp(e.x, TILE * 0.5, W - TILE * 0.5);
    e.y = clamp(e.y, midY(SURFACE - 1), H - TILE * 0.5);
    e.step += step;
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      e.bob += dt;
      if (e.state === "dead" || e.state === "crushed") continue;

      // Inflating — frozen in place
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

      if (e.state === "ghost") {
        e.ghostT -= dt;
        stepEntity(e, enemySpd(e), dt, "ghost");
        // Re-enter roam when over a tunnel and timer done
        if (e.ghostT <= 0 && isTunnel(nearestCol(e.x), nearestRow(e.y))) {
          e.state = "roam";
          e.anger = 0;
          e.x = midX(nearestCol(e.x));
          e.y = midY(nearestRow(e.y));
        }
      } else {
        // roam tunnels
        stepEntity(e, enemySpd(e), dt, "roam");
      }

      // Fygar fire breath (horizontal only, like arcade)
      if (e.type === "fygar" && e.state === "roam") {
        e.fireT -= dt;
        if (e.fire) {
          e.fire.life -= dt;
          e.fire.x += e.fire.dir.x * 160 * (dt / 1000);
          if (digdug && !digdug.dead) {
            if (Math.abs(digdug.y - e.fire.y) < TILE * 0.45
              && ((e.fire.dir.x > 0 && digdug.x >= e.fire.x - 4 && digdug.x <= e.fire.x + TILE * 1.4)
                || (e.fire.dir.x < 0 && digdug.x <= e.fire.x + 4 && digdug.x >= e.fire.x - TILE * 1.4))) {
              killPlayer();
            }
          }
          if (e.fire.life <= 0) e.fire = null;
        } else if (e.fireT <= 0 && digdug && !digdug.dead) {
          if (nearestRow(e.y) === nearestRow(digdug.y)
            && Math.abs(e.x - digdug.x) < TILE * 5
            && Math.abs(e.x - digdug.x) > TILE * 0.8) {
            const fd = digdug.x > e.x ? R : L;
            // clear horizontal path check simplified
            e.fire = { x: e.x + fd.x * TILE * 0.7, y: e.y, dir: fd, life: 420 };
            e.dir = fd;
            e.fireT = 2600 + Math.random() * 1800;
            sfx("fire");
          } else {
            e.fireT = 500 + Math.random() * 700;
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
    if (!digdug || digdug.dead || state !== "play") return;
    digdug.dead = true;
    lives--;
    hud();
    sfx("die");
    state = "die";
    dieT = 1500;
    pumping = false;
    hose = null;
  }

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
    flowerPhase += dt;
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
        readyT = 1400;
        showOV("READY!", "", "ready");
      }
      return;
    }
    if (state === "clear") {
      clearT -= dt;
      if (clearT <= 0) beginLevel(level + 1);
      return;
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

  // ── Drawing (arcade-inspired sprites) ────────────────────────────────────
  function drawWorld() {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, SURFACE * TILE);
    sky.addColorStop(0, "#4eb4ff");
    sky.addColorStop(1, "#a8dcff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, SURFACE * TILE);

    // Clouds
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 3; i++) {
      const cx = (i * 97 * S + 40 * S + (time * 0.01 * S) % W) % (W + 40 * S) - 20 * S;
      ctx.beginPath();
      ctx.arc(cx, 18 * S, 10 * S, 0, Math.PI * 2);
      ctx.arc(cx + 12 * S, 16 * S, 12 * S, 0, Math.PI * 2);
      ctx.arc(cx + 24 * S, 18 * S, 9 * S, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grass
    ctx.fillStyle = "#3cb043";
    ctx.fillRect(0, SURFACE * TILE - 8 * S, W, 8 * S);
    // Flowers
    for (let c = 0; c < COLS; c++) {
      const fx = midX(c);
      const fy = SURFACE * TILE - 12 * S;
      ctx.fillStyle = c % 3 === 0 ? "#ff5577" : c % 3 === 1 ? "#ffee55" : "#ffffff";
      ctx.beginPath();
      ctx.arc(fx, fy + Math.sin(flowerPhase / 400 + c) * 1.5 * S, 2.5 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2a8020";
      ctx.lineWidth = 1 * S;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 2 * S);
      ctx.lineTo(fx, SURFACE * TILE - 2 * S);
      ctx.stroke();
    }

    // Dirt layers + tunnels
    for (let r = SURFACE; r < ROWS; r++) {
      const band = dirtBand(r);
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE, y = r * TILE;
        if (map[r][c] === EMPTY) {
          // Black tunnel with soil rim
          ctx.fillStyle = "#0c0602";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = DIRT_EDGE[band];
          ctx.lineWidth = 2 * S;
          // only draw edges adjacent to dirt
          if (c === 0 || map[r][c - 1] !== EMPTY) {
            ctx.beginPath(); ctx.moveTo(x + S, y); ctx.lineTo(x + S, y + TILE); ctx.stroke();
          }
          if (c === COLS - 1 || map[r][c + 1] !== EMPTY) {
            ctx.beginPath(); ctx.moveTo(x + TILE - S, y); ctx.lineTo(x + TILE - S, y + TILE); ctx.stroke();
          }
          if (r === SURFACE || map[r - 1][c] !== EMPTY) {
            ctx.beginPath(); ctx.moveTo(x, y + S); ctx.lineTo(x + TILE, y + S); ctx.stroke();
          }
          if (r === ROWS - 1 || map[r + 1][c] !== EMPTY) {
            ctx.beginPath(); ctx.moveTo(x, y + TILE - S); ctx.lineTo(x + TILE, y + TILE - S); ctx.stroke();
          }
        } else {
          // Dirt (or rock cell base)
          ctx.fillStyle = DIRT_COLS[band];
          ctx.fillRect(x, y, TILE, TILE);
          // Horizontal strata lines
          ctx.strokeStyle = "rgba(0,0,0,0.12)";
          ctx.lineWidth = 1 * S;
          ctx.beginPath();
          ctx.moveTo(x, y + TILE * 0.35);
          ctx.lineTo(x + TILE, y + TILE * 0.35);
          ctx.moveTo(x, y + TILE * 0.7);
          ctx.lineTo(x + TILE, y + TILE * 0.7);
          ctx.stroke();
          // Partial dig
          if (map[r][c] === DIRT && dug[r][c] > 0.05 && dug[r][c] < 1) {
            ctx.fillStyle = "#0c0602";
            const hole = dug[r][c] * TILE * 0.9;
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, hole / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          // Speckles
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.fillRect(x + 5 * S, y + 7 * S, 2 * S, 2 * S);
          ctx.fillRect(x + 16 * S, y + 18 * S, 2 * S, 2 * S);
        }
      }
    }

    for (const rk of rocks) {
      if (!rk.gone) drawRock(rk.x, rk.y);
    }
  }

  function drawRock(x, y) {
    ctx.fillStyle = "#7a7a7a";
    ctx.beginPath();
    ctx.moveTo(x - 2 * S, y - 11 * S);
    ctx.lineTo(x + 11 * S, y - 5 * S);
    ctx.lineTo(x + 10 * S, y + 11 * S);
    ctx.lineTo(x - 11 * S, y + 10 * S);
    ctx.lineTo(x - 12 * S, y - 3 * S);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9a9a9a";
    ctx.beginPath();
    ctx.moveTo(x - 2 * S, y - 11 * S);
    ctx.lineTo(x + 6 * S, y - 8 * S);
    ctx.lineTo(x + 2 * S, y);
    ctx.lineTo(x - 8 * S, y - 2 * S);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#555";
    ctx.fillRect(x - 4 * S, y + 2 * S, 3 * S, 2 * S);
    ctx.fillRect(x + 3 * S, y + 5 * S, 2 * S, 2 * S);
  }

  function drawDigDug() {
    if (!digdug) return;
    const x = digdug.x, y = digdug.y;
    const fl = digdug.dir.id === "L" ? -1 : digdug.dir.id === "R" ? 1 : (hold && hold.id === "L" ? -1 : 1);

    if (digdug.dead) {
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 10 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#c00";
      ctx.lineWidth = 2 * S;
      ctx.beginPath();
      ctx.moveTo(x - 6 * S, y - 6 * S); ctx.lineTo(x + 6 * S, y + 6 * S);
      ctx.moveTo(x + 6 * S, y - 6 * S); ctx.lineTo(x - 6 * S, y + 6 * S);
      ctx.stroke();
      return;
    }

    const bob = Math.sin(digdug.walk / 80) * 1.2 * S;
    const yy = y + bob;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y + 12 * S, 9 * S, 3 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = "#1a3aaa";
    const leg = Math.sin(digdug.walk / 70) * 3 * S;
    ctx.fillRect(x - 6 * S, yy + 6 * S, 4 * S, 7 * S + leg);
    ctx.fillRect(x + 2 * S, yy + 6 * S, 4 * S, 7 * S - leg);

    // Body (white overalls)
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(x - 8 * S, yy - 10 * S, 16 * S, 18 * S);

    // Blue pants/boots detail
    ctx.fillStyle = "#2244cc";
    ctx.fillRect(x - 8 * S, yy + 2 * S, 16 * S, 7 * S);

    // Head
    ctx.fillStyle = "#ffdbac";
    ctx.beginPath();
    ctx.arc(x, yy - 12 * S, 7 * S, 0, Math.PI * 2);
    ctx.fill();

    // Helmet / hair white
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, yy - 14 * S, 7.5 * S, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - 7.5 * S, yy - 14 * S, 15 * S, 4 * S);

    // Eyes
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(x + fl * 2.5 * S, yy - 13 * S, 1.4 * S, 0, Math.PI * 2);
    ctx.fill();

    // Pump harpoon gun
    ctx.fillStyle = "#cc2222";
    ctx.fillRect(x + fl * 5 * S, yy - 3 * S, fl * 11 * S, 5 * S);
    ctx.fillStyle = "#888";
    ctx.fillRect(x + fl * 14 * S, yy - 2 * S, fl * 4 * S, 3 * S);

    // Hose when pumping
    if (hose) {
      const hx = x + hose.dir.x * hose.len * TILE;
      const hy = y + hose.dir.y * hose.len * TILE;
      ctx.strokeStyle = "#e8e8e8";
      ctx.lineWidth = 3 * S;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + hose.dir.x * 12 * S, y);
      const mx = (x + hx) / 2 + hose.dir.y * 4 * S;
      const my = (y + hy) / 2 + Math.abs(hose.dir.x) * 4 * S;
      ctx.quadraticCurveTo(mx, my, hx, hy);
      ctx.stroke();
      ctx.fillStyle = "#aaa";
      ctx.beginPath();
      ctx.arc(hx, hy, 4 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#666";
      ctx.beginPath();
      ctx.arc(hx, hy, 2 * S, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemy(e) {
    if (e.state === "dead") return;
    const inflate = e.inflate || 0;
    const sc = S * (1 + inflate * 0.28);
    const x = e.x;
    const y = e.y + Math.sin(e.bob / 180) * 1.5 * S;

    if (e.state === "crushed") {
      ctx.fillStyle = e.type === "pooka" ? "#aa3030" : "#2a7a30";
      ctx.beginPath();
      ctx.ellipse(x, y + 6 * S, 12 * S, 4 * S, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (e.state === "ghost") ctx.globalAlpha = 0.5 + 0.15 * Math.sin(e.bob / 100);

    if (e.type === "pooka") {
      ctx.fillStyle = inflate >= 3 ? "#ff9999" : "#e02020";
      ctx.beginPath();
      ctx.ellipse(x, y, 11 * sc, 12 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.ellipse(x - 3 * sc, y - 4 * sc, 4 * sc, 5 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x - 4.5 * sc, y - 2 * S, 4.2 * sc, 0, Math.PI * 2);
      ctx.arc(x + 4.5 * sc, y - 2 * S, 4.2 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.2 * S;
      ctx.beginPath();
      ctx.arc(x - 4.5 * sc, y - 2 * S, 4.2 * sc, 0, Math.PI * 2);
      ctx.arc(x + 4.5 * sc, y - 2 * S, 4.2 * sc, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#111";
      const lx = e.dir.x * 1.5 * S, ly = e.dir.y * 1.5 * S;
      ctx.beginPath();
      ctx.arc(x - 4.5 * sc + lx, y - 2 * S + ly, 1.6 * sc, 0, Math.PI * 2);
      ctx.arc(x + 4.5 * sc + lx, y - 2 * S + ly, 1.6 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8c020";
      ctx.fillRect(x - 9 * sc, y + 9 * sc, 7 * sc, 4 * S);
      ctx.fillRect(x + 2 * sc, y + 9 * sc, 7 * sc, 4 * S);
    } else {
      ctx.fillStyle = inflate >= 3 ? "#b0ffb0" : "#2db84a";
      ctx.beginPath();
      ctx.ellipse(x, y, 12 * sc, 10 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      const sx = e.dir.x >= 0 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(x + sx * 10 * sc, y + 1 * S, 6 * sc, 5 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x + sx * 4 * S, y - 3 * S, 3.2 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(x + sx * 5 * S, y - 3 * S, 1.4 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#228b38";
      ctx.beginPath();
      ctx.moveTo(x - sx * 2 * S, y - 2 * S);
      ctx.lineTo(x - sx * 14 * S, y - 12 * S);
      ctx.lineTo(x - sx * 4 * S, y + 2 * S);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1e7a30";
      ctx.fillRect(x - 6 * S, y + 8 * sc, 5 * S, 4 * S);
      ctx.fillRect(x + 2 * S, y + 8 * sc, 5 * S, 4 * S);

      if (e.fire) {
        const fx = e.fire.x, fy = e.fire.y;
        const grd = ctx.createLinearGradient(fx, fy, fx + e.fire.dir.x * 28 * S, fy);
        grd.addColorStop(0, "#ff2200");
        grd.addColorStop(0.5, "#ff8800");
        grd.addColorStop(1, "#ffee44");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(fx, fy - 5 * S);
        ctx.lineTo(fx + e.fire.dir.x * 30 * S, fy);
        ctx.lineTo(fx, fy + 5 * S);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (inflate > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2 * S;
      ctx.beginPath();
      ctx.arc(x, y, (12 + inflate * 5) * S, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function drawVeg() {
    if (!veg) return;
    ctx.font = `${20 * S}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(veg.e, veg.x, veg.y + Math.sin(time / 200) * 2 * S);
  }

  function drawPops() {
    ctx.font = `${9 * S}px 'Press Start 2P', monospace`;
    ctx.textAlign = "center";
    for (const p of pops) {
      ctx.globalAlpha = clamp(p.t / 900, 0, 1);
      ctx.fillStyle = "#fff";
      ctx.fillText(String(p.p), p.x, p.y - (900 - p.t) * 0.025 * S);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    drawWorld();
    drawVeg();
    for (const e of enemies) drawEnemy(e);
    drawDigDug();
    drawPops();

    if (state === "ready") {
      ctx.fillStyle = "#f4c430";
      ctx.font = `${14 * S}px 'Press Start 2P', monospace`;
      ctx.textAlign = "center";
      ctx.fillText("READY!", W / 2, H * 0.42);
    }
    if (state === "clear") {
      ctx.fillStyle = "#f4c430";
      ctx.font = `${12 * S}px 'Press Start 2P', monospace`;
      ctx.textAlign = "center";
      ctx.fillText("STAGE CLEAR", W / 2, H * 0.42);
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
      if (state === "play" && d.id === OPP[digdug.dir.id].id) digdug.dir = d;
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
      if (state === "title" || state === "over" || state === "pause") togglePauseOrStart();
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
    if (state === "title" || state === "over") beginGame();
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

  // Boot
  $high.textContent = pad(high);
  buildLevel(1);
  state = "title";
  showOV("DIG DUG", "INSERT COIN", null);
  hud();
  $lives.innerHTML = "";
  prev = 0;
  requestAnimationFrame(tick);
})();
