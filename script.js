/* Pixel Kong — JS/Canvas Donkey-Kong-like clone
   - Programmatic pixel sprites (no external assets)
   - Slanted girders, ladders, animated player, rolling barrels
   - Controls: ArrowLeft / ArrowRight, Z to jump, ArrowUp/Down to climb, R to reset
*/

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width, H = canvas.height;
const SCALE = 2; // pixel art scale factor for debug scaling (sprite pixel units * SCALE)
const GRAVITY = 0.6;
const FPS = 60;

let keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; if (e.key === 'r') reset(); });
window.addEventListener('keyup', e => { keys[e.key] = false; });

/* ---------- Utility drawing helpers ---------- */
function drawPixelSprite(pixels, pixelSize, x, y, scale=1) {
  // pixels: array of rows, each row string or array of color or '.' for transparent
  for (let r = 0; r < pixels.length; r++) {
    const row = pixels[r];
    for (let c = 0; c < row.length; c++) {
      const col = row[c];
      if (!col || col === '.' ) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x + c * pixelSize * scale, y + r * pixelSize * scale, pixelSize * scale, pixelSize * scale);
    }
  }
}

/* ---------- Simple palette ---------- */
const palette = {
  skin: '#f2c6a1',
  red: '#d63b3b',
  darkRed: '#9f2a2a',
  yellow: '#ffd24d',
  blue: '#2fa6ff',
  brown: '#7b3f2f',
  dark: '#111114',
  barrel: '#c84a1d',
  barrelStripe: '#f3c171',
  princess: '#ff93c7',
  dk: '#7b2b2b'
};

/* ---------- Generate simple pixel frames for player ---------- */
// Each sprite is small (frames are arrays of strings). '.' is transparent.
// We'll draw scaled up rectangles to mimic pixel art.

const playerFrames = {
  idle: [
    "....RR....",
    "...RBBR...",
    "..RBBBBR..",
    "..RBBBBR..",
    "..RBBRBR..",
    "...R..R...",
    "...R..R...",
    "...R..R..."
  ].map(row => row.replace(/R/g, palette.red).replace(/B/g, palette.skin)),

  walk1: [
    "....RR....",
    "...RBBR...",
    "..RBBBBR..",
    "..RBBBBR..",
    ".RRBBBRR..",
    "..R....R..",
    ".R......R.",
    ".R......R."
  ].map(row => row.replace(/R/g, palette.red).replace(/B/g, palette.skin)),

  walk2: [
    "....RR....",
    "...RBBR...",
    "..RBBBBR..",
    ".R.RBB.R..",
    ".R.R..R...",
    "...R..R...",
    "..R....R..",
    ".R......R."
  ].map(row => row.replace(/R/g, palette.red).replace(/B/g, palette.skin)),

  jump: [
    "....RR....",
    "...RBBR...",
    "..RBBBBR..",
    "..R.BR.R..",
    "...R..R...",
    "...R..R...",
    "...R..R...",
    "....RR...."
  ].map(row => row.replace(/R/g, palette.red).replace(/B/g, palette.skin))
};

/* Barrel sprite (two-frame spinning illusion) */
const barrelFrames = [
  [
    ".....",
    ".BBB.",
    "BBBBB",
    ".BBB.",
    "....."
  ].map(r => r.replace(/B/g, palette.barrel)),
  [
    ".....",
    ".B.B.",
    "BBBBB",
    ".B.B.",
    "....."
  ].map(r => r.replace(/B/g, palette.barrelStripe))
];

/* DK and princess small sprites */
const dkSprite = [
  ".....GG...",
  "...GGGGG..",
  "..G....G..",
  ".GGG..GG..",
  "..G....G..",
  "...GGG...."
].map(r => r.replace(/G/g, palette.dk));

const princessSprite = [
  ".PPP.",
  "PPPPP",
  ".P.P.",
  ".PPP.",
  ".P.P."
].map(r => r.replace(/P/g, palette.princess));

/* ---------- Level layout (girders, ladders) ---------- */
// We'll create slanted girders by drawing rectangles along a slope.
const levels = [];
// Each level: {x,y,w,h,dir} dir = 1 (left->right up) or -1
const levelGap = 90;
const baseY = H - 80;
for (let i = 0; i < 6; i++) {
  const y = baseY - i * levelGap;
  const dir = i % 2 === 0 ? 1 : -1;
  const x = dir === 1 ? 60 : W - 60 - 420;
  levels.push({x, y, w: 420, h: 16, dir});
}

// ladders list (x,y,h)
const ladders = [
  {x: 200, y: levels[1].y - 64, h: 64},
  {x: 420, y: levels[2].y - 64, h: 64},
  {x: 140, y: levels[3].y - 64, h: 64}
];

/* ---------- Entities ---------- */
class Player {
  constructor() {
    this.pw = 10; this.ph = 16; // pixel sprite dimensions (in pixels)
    this.x = 80; this.y = H - 120;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.anim = 0;
    this.frame = playerFrames.idle;
  }
  update() {
    // horizontal
    if (keys['ArrowLeft']) { this.vx = -2.6; this.facing = -1; this.anim += 0.2; }
    else if (keys['ArrowRight']) { this.vx = 2.6; this.facing = 1; this.anim += 0.2; }
    else { this.vx = 0; this.anim = 0; }

    // climb check
    let onLadder = false;
    for (let lad of ladders) {
      if (this.x + this.pw > lad.x && this.x < lad.x + 30 &&
          this.y + this.ph > lad.y && this.y < lad.y + lad.h) { onLadder = true; }
    }
    if (onLadder && (keys['ArrowUp'] || keys['ArrowDown'])) {
      if (keys['ArrowUp']) this.y -= 2.6;
      if (keys['ArrowDown']) this.y += 2.6;
      this.vy = 0;
      this.onGround = false;
      // skip gravity while climbing
    } else {
      // gravity
      this.vy += GRAVITY;
      if (this.vy > 10) this.vy = 10;
      this.y += this.vy;
    }

    // jump
    if (keys['z'] && this.onGround) { this.vy = -10.5; this.onGround = false; }

    this.x += this.vx;

    // simple floor & platforms collision
    this.onGround = false;
    for (let lvl of levels) {
      if (this.x + this.pw > lvl.x && this.x < lvl.x + lvl.w &&
          this.y + this.ph >= lvl.y && this.y + this.ph <= lvl.y + 18 && this.vy >= 0) {
        this.y = lvl.y - this.ph;
        this.vy = 0;
        this.onGround = true;
      }
    }

    // clamp to canvas
    this.x = Math.max(0, Math.min(W - this.pw, this.x));
    this.y = Math.max(0, Math.min(H - this.ph, this.y));

    // choose frame
    if (!this.onGround) this.frame = playerFrames.jump;
    else if (Math.abs(this.vx) < 0.1) this.frame = playerFrames.idle;
    else {
      this.frame = (Math.floor(this.anim) % 2 === 0) ? playerFrames.walk1 : playerFrames.walk2;
    }
  }
  draw() {
    // draw shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(this.x+2, this.y+this.ph+2, this.pw, 4);

    // draw pixel sprite using small pixel size
    const px = 2; // base pixel size for player sprite
    drawPixelSprite(this.frame, px, Math.round(this.x), Math.round(this.y), 1);
    // flip horizontally when facing left
    // the helper draws left-to-right; quick trick: save, translate, scale
    // (We already draw facing default to right; to support facing left we'd need to mirror frames — keep simple)
  }
}

class Barrel {
  constructor(x,y) {
    this.w = 12; this.h = 12;
    this.x = x; this.y = y;
    this.vx = (Math.random() < 0.5 ? -1.8 : 1.8);
    this.vy = 0;
    this.rot = 0;
    this.frameTimer = 0;
  }
  update() {
    this.x += this.vx;
    this.vy += GRAVITY * 0.8;
    if (this.vy > 8) this.vy = 8;
    this.y += this.vy;

    // collision with levels
    for (let lvl of levels) {
      if (this.x + this.w > lvl.x && this.x < lvl.x + lvl.w &&
          this.y + this.h >= lvl.y && this.y + this.h <= lvl.y + 18 && this.vy >= 0) {
        this.y = lvl.y - this.h;
        this.vy = 0;
        // slight chance to drop down ladder area
        // bounce off bounds:
        if (this.x < lvl.x) this.x = lvl.x;
        if (this.x + this.w > lvl.x + lvl.w) this.x = lvl.x + lvl.w - this.w;
      }
    }
    // world wrap/clamp
    if (this.x < 0) { this.x = 0; this.vx *= -1; }
    if (this.x + this.w > W) { this.x = W - this.w; this.vx *= -1; }

    // spinning effect
    this.rot += 0.25;
    this.frameTimer++;
  }
  draw() {
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x + this.w/2, this.y + this.h + 4, this.w*1.2, 4, 0, 0, Math.PI*2);
    ctx.fill();

    // draw barrel pixel art
    const bx = Math.round(this.x), by = Math.round(this.y);
    drawPixelSprite(barrelFrames[this.frameTimer % barrelFrames.length], 2, bx, by, 1);
  }
}

/* ---------- Game state ---------- */
let player = new Player();
let barrels = [];
let spawnTimer = 0;

/* Spawn DK and princess positions */
const dkX = levels[5].x + 10, dkY = levels[5].y - 40;
const princessX = levels[5].x + levels[5].w - 40, princessY = levels[5].y - 34;

function reset() {
  player = new Player();
  barrels = [];
  spawnTimer = 0;
}

reset();

/* ---------- Draw level visuals ---------- */
function drawGirders() {
  // draw each level as a slanted girder
  for (let lvl of levels) {
    const gX = lvl.x, gY = lvl.y;
    // girder body
    ctx.fillStyle = '#8b2f2f';
    // draw slanted plank by drawing many small rectangles to imply slant
    for (let i = 0; i < lvl.w; i += 6) {
      const offset = (lvl.dir === 1) ? i * 0.12 : -i * 0.12;
      ctx.fillRect(gX + i, gY + offset, 6, lvl.h);
    }
    // decorative rivets
    ctx.fillStyle = '#552020';
    for (let i = 10; i < lvl.w; i += 40) {
      const offset = (lvl.dir === 1) ? i * 0.12 : -i * 0.12;
      ctx.fillRect(gX + i + 2, gY + offset + 4, 6, 4);
    }
  }
}

function drawLadders() {
  for (let l of ladders) {
    ctx.fillStyle = '#2fa6ff';
    ctx.fillRect(l.x, l.y, 6, l.h);
    ctx.fillRect(l.x + 24, l.y, 6, l.h);
    ctx.fillStyle = '#1a6f9b';
    for (let ry = l.y + 6; ry < l.y + l.h - 6; ry += 14) {
      ctx.fillRect(l.x + 6, ry, 18, 4);
    }
  }
}

/* ---------- Game Loop ---------- */
function update() {
  // spawn barrels every ~2.2s
  spawnTimer++;
  if (spawnTimer > FPS * 2.2) {
    // spawn from DK location
    const b = new Barrel(dkX + 18, dkY + 18);
    barrels.push(b);
    spawnTimer = 0;
  }

  player.update();
  for (let b of barrels) b.update();

  // simple player-barrel collision
  for (let b of barrels) {
    if (rectIntersect(player.x, player.y, player.pw, player.ph, b.x, b.y, b.w, b.h)) {
      // reset player and clear barrels (soft penalty)
      player.x = 80; player.y = H - 120; player.vy = 0; barrels = [];
      spawnTimer = 0;
    }
  }
}

function rectIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function draw() {
  // background gradient
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0e0b14'); g.addColorStop(1,'#050407');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // UI panel at top
  ctx.fillStyle = '#111018';
  ctx.fillRect(0,0,W,48);
  ctx.fillStyle = '#e6b800';
  ctx.font = '16px monospace';
  ctx.fillText('Pixel Kong — Arrow keys to move • Z jump • R reset', 12, 30);

  // draw girders, ladders
  drawGirders();
  drawLadders();

  // draw DK and princess
  drawPixelSprite(dkSprite, 2, dkX, dkY, 1);
  drawPixelSprite(princessSprite, 2, princessX, princessY, 1);

  // draw barrels and player
  for (let b of barrels) b.draw();
  player.draw();
}
function drawPlayer(x, y) {
  ctx.fillStyle = "#ffcc00"; // yellow head
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = "#ff0000"; // red body
  ctx.fillRect(x, y + 16, 16, 16);
}

/* main animation loop */
let last = performance.now();
function frame(now) {
  const dt = now - last;
  last = now;
  update();
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
