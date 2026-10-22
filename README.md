# DIG DUG — Namco 1982 web recreation

**Live:** https://bamtec70.github.io/dig-dug-game/ · part of the [WTP Arcade](https://wethepeoplepress.com/games/)

Native 224×288 portrait screen (the cabinet's resolution), pixel-scaled. Every sprite is hand-authored pixel data in `game.js`, the dirt, font and HUD are drawn in code, and every sound is synthesized with Web Audio using a Namco WSG-style wavetable. No ROM data, samples or extracted images are included.

## Controls
| Input | Action |
|---|---|
| Arrows / WASD | 4-way move & dig |
| Space / Ctrl | Pump (fire harpoon, then tap or hold to inflate) |
| 5 | Insert coin |
| Enter / 1 | Start (Enter also coins if there are no credits) |
| P / M | Pause / sound |
| Touch | Hold the d-pad to run (slide to turn), big PUMP button, multi-touch; tap to coin/start |

## Game
- Dirt in 4 strata; colours change every 4 rounds. Round 1 layout and colours measured from the arcade.
- Pooka / Fygar pop: 200 / 300 / 400 / 500 by stratum, Fygar ×2 when pumped horizontally.
- Rock crush: 1000 / 2500 / 4000 / 6000 / 8000 / 10000 / 12000 / 15000 for 1–8+ enemies.
- Bonus vegetable after 2 dropped rocks: carrot 400, turnip 600, mushroom 800, cucumber 1000, eggplant 2000, pepper 3000, tomato 4000, onion 5000, watermelon 6000, Galaxian 7000, pineapple 8000.
- Enemies turn into ghost eyes and drift through dirt; the last enemy flees to the top-left with the hurry-up music.
- Walking music plays only while Dig Dug moves. Flowers count rounds (small = 1, big = 10). Extra life at 10,000, then every 40,000. Best-5 table with initials.
- Attract loop (build 7): title (Dig Dug tunnels under the logo) → CHARACTER intro (Pooka pumped to 200, Fygar fire, rock drop for 1000) → scripted demo round (dig, rock crush, pump Fygar and Pooka; scores never saved) → BEST 5 → repeat. Any key or tap exits instantly.

Debug: `?wave=N` (or `?round=N`) starts directly at round N; with it, the backquote key clears the round.

Fan recreation for personal / educational use. Not affiliated with Namco / Bandai Namco.
