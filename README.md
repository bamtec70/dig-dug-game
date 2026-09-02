# DIG DUG — 1982 Arcade Classic

A browser recreation of Namco’s **Dig Dug** (1982), companion to:

- [PAC-MAN](https://bamtec70.github.io/pacman-game/)
- [MS. PAC-MAN](https://bamtec70.github.io/ms-pacman-game/)
- [GALAGA](https://bamtec70.github.io/galaga-game/)

## Play

**Live:** https://bamtec70.github.io/dig-dug-game/

You should see **BUILD V3** on the title screen.

```powershell
cd C:\Users\bamte\dig-dug
python -m http.server 8765
```

## How to play

Dig through the dirt, inflate enemies with your pump until they pop, and drop rocks on them for big points. Clear all monsters to advance.

### Desktop

| Control | Action |
|---------|--------|
| **Arrows / WASD** | Move & dig |
| **Space** (hold) | Pump / inflate enemy in front of you |
| **P** | Pause |
| **M** | Mute |

### Phone / touch

| Control | Action |
|---------|--------|
| **D-pad** | Move & dig |
| **P button** (hold) | Pump |
| **Swipe** on maze | Move |
| **❚❚ / ♪** | Pause / mute |

## Features

- Four Namco dirt layers & capsule tunnels  
- **Pooka** (orange, goggles) and **Fygar** (green dragon)  
- Harpoon pump, inflate → pop (deeper = more points)  
- Rocks crush; vegetable after the second rock  
- Ghost-eyes through dirt; last enemy flees top-left  
- Fygar fire stays in open tunnels  
- Walk theme locked to footsteps  
- Lives, high score, mobile / touch controls  

## Files

- `index.html` — page shell  
- `digdug-v3.css` / `digdug-v3.js` — current live build  
- `style.css` / `game.js` — older build, kept as backup  
