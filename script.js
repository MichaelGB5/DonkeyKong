const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// --- Player ---
class Player {
    constructor() {
        this.width = 30;
        this.height = 40;
        this.x = 50;
        this.y = HEIGHT - 60;
        this.velY = 0;
        this.onGround = false;
    }

    update(platforms, ladders) {
        // Horizontal movement
        if (keys["ArrowLeft"]) this.x -= 5;
        if (keys["ArrowRight"]) this.x += 5;

        // Gravity
        this.velY += 0.5;
        if (this.velY > 8) this.velY = 8;
        this.y += this.velY;

        // Jump
        if (keys["z"] && this.onGround) this.velY = -10;

        // Ladder
        this.onLadder = false;
        for (let l of ladders) {
            if (this.x + this.width > l.x && this.x < l.x + l.width &&
                this.y + this.height > l.y && this.y < l.y + l.height) {
                this.onLadder = true;
                if (keys["ArrowUp"]) { this.y -= 4; this.velY = 0; }
                if (keys["ArrowDown"]) { this.y += 4; this.velY = 0; }
            }
        }

        // Platforms
        this.onGround = false;
        for (let p of platforms) {
            if (this.x + this.width > p.x && this.x < p.x + p.width &&
                this.y + this.height > p.y && this.y + this.height < p.y + p.height + 10 &&
                this.velY >= 0) {
                this.y = p.y - this.height;
                this.velY = 0;
                this.onGround = true;
            }
        }

        // Keep inside canvas
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > WIDTH) this.x = WIDTH - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > HEIGHT) this.y = HEIGHT - this.height;
    }

    draw() {
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// --- Platform ---
class Platform {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }

    draw() {
        ctx.fillStyle = "brown";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// --- Ladder ---
class Ladder {
    constructor(x, y, h) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = h;
    }

    draw() {
        ctx.fillStyle = "blue";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// --- Barrel ---
class Barrel {
    constructor(x, y) {
        this.width = 25;
        this.height = 25;
        this.x = x;
        this.y = y;
        this.velX = Math.random() < 0.5 ? -3 : 3;
        this.velY = 0;
    }

    update(platforms) {
        this.x += this.velX;
        this.velY += 0.5;
        if (this.velY > 8) this.velY = 8;
        this.y += this.velY;

        for (let p of platforms) {
            if (this.x + this.width > p.x && this.x < p.x + p.width &&
                this.y + this.height > p.y && this.y + this.height < p.y + p.height + 10 &&
                this.velY >= 0) {
                this.y = p.y - this.height;
                this.velY = 0;
            }
        }

        if (this.x < 0 || this.x + this.width > WIDTH) this.velX *= -1;
    }

    draw() {
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// --- Setup ---
const player = new Player();
const platforms = [
    new Platform(0, HEIGHT-20, WIDTH, 20),
    new Platform(50, 550, 500, 20),
    new Platform(0, 400, 500, 20),
    new Platform(100, 250, 500, 20),
    new Platform(0, 100, WIDTH, 20)
];

const ladders = [
    new Ladder(250, 450, 100),
    new Ladder(400, 300, 100),
    new Ladder(150, 150, 100)
];

let barrels = [];
let barrelTimer = 0;

// --- Game Loop ---
function gameLoop() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Spawn barrels every 2 seconds
    barrelTimer++;
    if (barrelTimer > 120) { // 60 FPS * 2 seconds
        barrels.push(new Barrel(50, 80));
        barrelTimer = 0;
    }

    player.update(platforms, ladders);
    for (let b of barrels) b.update(platforms);

    // Collision
    for (let b of barrels) {
        if (player.x < b.x + b.width && player.x + player.width > b.x &&
            player.y < b.y + b.height && player.y + player.height > b.y) {
            // Reset player
            player.x = 50;
            player.y = HEIGHT - 60;
            barrels = [];
        }
    }

    // Draw
    player.draw();
    for (let p of platforms) p.draw();
    for (let l of ladders) l.draw();
    for (let b of barrels) b.draw();

    // Text
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText("Donkey Kong Clone", 10, 30);

    requestAnimationFrame(gameLoop);
}

gameLoop();
