import pygame
import random

# --- Pygbag-compatible Donkey Kong clone ---
# Works in browser with pygbag

WIDTH, HEIGHT = 600, 700
FPS = 60

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
BROWN = (139, 69, 19)
RED = (200, 30, 30)
BLUE = (30, 144, 255)
YELLOW = (255, 215, 0)

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Donkey Kong Clone")
clock = pygame.time.Clock()
font = pygame.font.SysFont("Arial", 24, bold=True)

# --- Classes ---
class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((30, 40))
        self.image.fill(YELLOW)
        self.rect = self.image.get_rect()
        self.rect.center = (50, HEIGHT - 60)
        self.vel_y = 0
        self.on_ground = False

    def update(self, platforms, ladders, keys):
        dx, dy = 0, 0
        if keys[pygame.K_LEFT]: dx = -5
        if keys[pygame.K_RIGHT]: dx = 5

        # Gravity
        self.vel_y += 0.5
        if self.vel_y > 8: self.vel_y = 8
        dy += self.vel_y

        # Jump
        if keys[pygame.K_z] and self.on_ground:
            self.vel_y = -10

        # Ladders
        self.on_ladder = False
        for ladder in ladders:
            if self.rect.colliderect(ladder.rect):
                self.on_ladder = True
                if keys[pygame.K_UP]:
                    dy = -4
                    self.vel_y = 0
                if keys[pygame.K_DOWN]:
                    dy = 4
                    self.vel_y = 0

        # Move
        self.rect.x += dx
        self.rect.y += dy

        # Keep inside screen
        self.rect.left = max(self.rect.left, 0)
        self.rect.right = min(self.rect.right, WIDTH)
        self.rect.top = max(self.rect.top, 0)
        self.rect.bottom = min(self.rect.bottom, HEIGHT)

        # Platforms
        self.on_ground = False
        for p in platforms:
            if self.rect.colliderect(p.rect) and dy >= 0:
                self.rect.bottom = p.rect.top
                self.vel_y = 0
                self.on_ground = True

class Platform(pygame.sprite.Sprite):
    def __init__(self, x, y, w, h):
        super().__init__()
        self.image = pygame.Surface((w, h))
        self.image.fill(BROWN)
        self.rect = self.image.get_rect(topleft=(x, y))

class Ladder(pygame.sprite.Sprite):
    def __init__(self, x, y, h):
        super().__init__()
        self.image = pygame.Surface((30, h))
        self.image.fill(BLUE)
        self.rect = self.image.get_rect(topleft=(x, y))

class Barrel(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.image = pygame.Surface((25, 25))
        self.image.fill(RED)
        self.rect = self.image.get_rect(center=(x, y))
        self.vel_x = random.choice([-3, 3])
        self.vel_y = 0

    def update(self, platforms):
        self.rect.x += self.vel_x
        if self.rect.left < 0 or self.rect.right > WIDTH: self.vel_x *= -1

        self.vel_y += 0.5
        if self.vel_y > 8: self.vel_y = 8
        self.rect.y += self.vel_y

        for p in platforms:
            if self.rect.colliderect(p.rect) and self.vel_y >= 0:
                self.rect.bottom = p.rect.top
                self.vel_y = 0

# --- Setup ---
player = Player()
platforms = pygame.sprite.Group()
ladders = pygame.sprite.Group()
barrels = pygame.sprite.Group()
all_sprites = pygame.sprite.Group(player)

platform_data = [(0, HEIGHT-20, WIDTH, 20), (50, 550, 500, 20), (0, 400, 500, 20), (100, 250, 500, 20), (0, 100, WIDTH, 20)]
for data in platform_data:
    p = Platform(*data)
    platforms.add(p)
    all_sprites.add(p)

ladder_data = [(250, 450, 100), (400, 300, 100), (150, 150, 100)]
for x, y, h in ladder_data:
    l = Ladder(x, y, h)
    ladders.add(l)
    all_sprites.add(l)

# Barrel spawn timer
BARREL_EVENT = pygame.USEREVENT + 1
pygame.time.set_timer(BARREL_EVENT, 2000)

# --- Game Loop ---
running = True
while running:
    clock.tick(FPS)
    keys = pygame.key.get_pressed()

    # Events
    for event in pygame.event.get():
        if event.type == pygame.QUIT: running = False
        if event.type == BARREL_EVENT:
            b = Barrel(50, 80)
            barrels.add(b)
            all_sprites.add(b)

    # Update
    player.update(platforms, ladders, keys)
    barrels.update(platforms)

    # Collision check
    if pygame.sprite.spritecollideany(player, barrels):
        player.rect.center = (50, HEIGHT - 60)
        barrels.empty()
        all_sprites = pygame.sprite.Group(player, *platforms, *ladders)

    # Draw
    screen.fill(BLACK)
    all_sprites.draw(screen)
    text = font.render("Donkey Kong Clone", True, WHITE)
    screen.blit(text, (10, 10))

    pygame.display.flip()
