import pygame
import random
import sys
from dataclasses import dataclass

# ------------------------------------------------------------
# Donkey Kong–style platformer in a single Pygame file
# No external assets. Rects + simple shapes only.
# Controls: ← → to move, Z to jump, ↑/↓ to climb ladders, R to restart.
# ------------------------------------------------------------

WIDTH, HEIGHT = 900, 640
FPS = 60
GRAVITY = 0.9
MOVE_SPEED = 4.0
JUMP_SPEED = 16.0
CLIMB_SPEED = 3.0
BARREL_SPEED = 3.1
BARREL_SPAWN_EVERY = 180  # frames (3 seconds at 60 FPS)
MAX_BARRELS = 12
START_LIVES = 3

# Colors
BLACK = (15, 15, 20)
BG = (18, 18, 26)
WHITE = (245, 245, 250)
RED = (230, 70, 70)
ORANGE = (255, 140, 0)
YELLOW = (250, 220, 80)
BLUE = (80, 170, 255)
PINK = (255, 120, 180)
PURPLE = (140, 110, 255)
PLATFORM = (200, 80, 60)
LADDER = (120, 190, 255)

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Donkey Kong — Pygame Edition")
clock = pygame.time.Clock()
font = pygame.font.SysFont("arial", 20)

@dataclass
class Platform:
    rect: pygame.Rect
    has_gap: bool = False  # visual only

@dataclass
class Ladder:
    rect: pygame.Rect

class Player:
    def __init__(self, x, y):
        self.rect = pygame.Rect(x, y, 28, 36)
        self.vx = 0.0
        self.vy = 0.0
        self.on_ground = False
        self.on_ladder = False
        self.facing = 1
        self.invuln = 0

    def handle_input(self, keys, ladders):
        self.vx = 0
        if keys[pygame.K_LEFT]:
            self.vx = -MOVE_SPEED
            self.facing = -1
        if keys[pygame.K_RIGHT]:
            self.vx = MOVE_SPEED
            self.facing = 1

        # Ladder detection
        self.on_ladder = False
        ladder_under = None
        for lad in ladders:
            if self.rect.centerx in range(lad.rect.left - 6, lad.rect.right + 6) and self.rect.colliderect(lad.rect):
                ladder_under = lad
                break

        if ladder_under and (keys[pygame.K_UP] or keys[pygame.K_DOWN]):
            self.on_ladder = True
            # Snap x to ladder center for cleaner climb
            self.rect.centerx = ladder_under.rect.centerx
            if keys[pygame.K_UP]:
                self.vy = -CLIMB_SPEED
            elif keys[pygame.K_DOWN]:
                self.vy = CLIMB_SPEED
            else:
                self.vy = 0
        else:
            # Jump only when on ground and not on ladder
            if keys[pygame.K_z] and self.on_ground:
                self.vy = -JUMP_SPEED

    def physics(self, platforms):
        # Horizontal move
        self.rect.x += int(self.vx)
        # Wall clamp
        if self.rect.left < 0:
            self.rect.left = 0
        if self.rect.right > WIDTH:
            self.rect.right = WIDTH

        # Gravity unless on ladder
        if not self.on_ladder:
            self.vy += GRAVITY
        else:
            # If on ladder, cancel gravity
            pass

        # Vertical move + collision resolve
        self.on_ground = False
        self.rect.y += int(self.vy)

        for p in platforms:
            if self.rect.colliderect(p.rect):
                if self.vy > 0:  # falling
                    self.rect.bottom = p.rect.top
                    self.vy = 0
                    self.on_ground = True
                elif self.vy < 0:  # rising
                    self.rect.top = p.rect.bottom
                    self.vy = 0

        # Keep inside the world bottom
        if self.rect.bottom > HEIGHT:
            self.rect.bottom = HEIGHT
            self.vy = 0
            self.on_ground = True

        if self.invuln > 0:
            self.invuln -= 1

    def draw(self, surf):
        # Simple little guy with a hat
        body = pygame.Rect(self.rect.x, self.rect.y, self.rect.w, self.rect.h)
        color = BLUE if self.invuln % 10 < 5 else WHITE
        pygame.draw.rect(surf, color, body, border_radius=6)
        # Hat
        brim = pygame.Rect(self.rect.centerx - 12, self.rect.y - 6, 24, 6)
        cap = pygame.Rect(self.rect.centerx - 10, self.rect.y - 16, 20, 12)
        pygame.draw.rect(surf, PURPLE, brim, border_radius=3)
        pygame.draw.rect(surf, PURPLE, cap, border_radius=4)
        # Eyes (facing)
        eye = pygame.Rect(self.rect.centerx + (6 * self.facing) - 2, self.rect.centery - 6, 4, 4)
        pygame.draw.rect(surf, BLACK, eye)

class Barrel:
    def __init__(self, x, y, dir_right=True):
        self.rect = pygame.Rect(x, y, 24, 24)
        self.vx = BARREL_SPEED * (1 if dir_right else -1)
        self.vy = 0.0
        self.roll_anim = 0
        self.fall_mode = False

    def update(self, platforms, ladders):
        # Horizontal roll
        self.rect.x += int(self.vx)
        # Flip at walls
        if self.rect.left <= 0 or self.rect.right >= WIDTH:
            self.vx *= -1

        # Gravity
        self.vy += GRAVITY
        self.rect.y += int(self.vy)

        on_platform = False
        for p in platforms:
            if self.rect.colliderect(p.rect):
                if self.vy > 0:
                    self.rect.bottom = p.rect.top
                    self.vy = 0
                    on_platform = True

        # Randomly drop down if overlapping ladder while on platform
        if on_platform:
            for lad in ladders:
                if self.rect.centerx in range(lad.rect.left, lad.rect.right) and self.rect.colliderect(lad.rect):
                    if random.random() < 0.18:  # classic behavior-ish
                        self.vy = 2  # start falling
                        break

        self.roll_anim = (self.roll_anim + 1) % 60

    def draw(self, surf):
        # Barrel as a rounded rect with two stripes
        pygame.draw.rect(surf, ORANGE, self.rect, border_radius=6)
        stripe1 = pygame.Rect(self.rect.x, self.rect.y + 6, self.rect.w, 4)
        stripe2 = pygame.Rect(self.rect.x, self.rect.y + 14, self.rect.w, 4)
        pygame.draw.rect(surf, YELLOW, stripe1)
        pygame.draw.rect(surf, YELLOW, stripe2)
        # Rim
        pygame.draw.rect(surf, RED, self.rect, width=2, border_radius=6)

class Game:
    def __init__(self):
        self.reset()

    def build_level(self):
        self.platforms = []
        self.ladders = []

        # Create staggered platforms like DK
        spacing_y = 100
        left = 40
        right = WIDTH - 40
        width = right - left

        # From bottom to top
        for i in range(6):
            y = HEIGHT - 60 - i * spacing_y
            # Alternate slant by shifting platform rect
            if i % 2 == 0:
                rect = pygame.Rect(left + 60, y, width - 120, 16)
                # ladders on left side
                lad_xs = [left + 80, left + 240, left + 400]
            else:
                rect = pygame.Rect(left, y, width - 120, 16)
                # ladders on right side
                lad_xs = [right - 80, right - 240, right - 400]
            self.platforms.append(Platform(rect))

            if i < 5:  # ladders between this and the one above
                next_y = HEIGHT - 60 - (i + 1) * spacing_y
                for lx in lad_xs[:2]:  # 2 ladders per level
                    self.ladders.append(Ladder(pygame.Rect(lx - 12, next_y + 16, 24, y - next_y - 16)))

        # Ground
        self.platforms.append(Platform(pygame.Rect(0, HEIGHT - 20, WIDTH, 20)))

        # Princess + DK area (top platform y)
        self.top_y = HEIGHT - 60 - 5 * spacing_y
        self.dk_rect = pygame.Rect(70, self.top_y - 56, 48, 48)
        self.princess_rect = pygame.Rect(WIDTH - 120, self.top_y - 50, 30, 40)

    def reset(self):
        self.player = Player(60, HEIGHT - 120)
        self.lives = START_LIVES
        self.score = 0
        self.time = 0
        self.barrels = []
        self.spawn_timer = BARREL_SPAWN_EVERY
        self.state = "RUN"
        self.build_level()

    def spawn_barrel(self):
        # Spawn near DK, alternating direction
        dir_right = (len(self.barrels) % 2 == 0)
        b = Barrel(self.dk_rect.centerx - 12, self.dk_rect.bottom - 20, dir_right)
        self.barrels.append(b)

    def update(self):
        if self.state != "RUN":
            return

        keys = pygame.key.get_pressed()
        self.player.handle_input(keys, self.ladders)
        self.player.physics([p for p in self.platforms])

        # Barrels
        for b in list(self.barrels):
            b.update([p for p in self.platforms], self.ladders)
            if b.rect.top > HEIGHT + 40:
                self.barrels.remove(b)

        if len(self.barrels) < MAX_BARRELS:
            self.spawn_timer -= 1
            if self.spawn_timer <= 0:
                self.spawn_barrel()
                self.spawn_timer = BARREL_SPAWN_EVERY

        # Collisions with barrels
        if self.player.invuln == 0:
            for b in self.barrels:
                if self.player.rect.colliderect(b.rect):
                    self.lives -= 1
                    self.player.invuln = 90
                    # Knockback + reset position safely
                    self.player.rect.topleft = (60, HEIGHT - 120)
                    self.player.vx = 0
                    self.player.vy = 0
                    if self.lives <= 0:
                        self.state = "LOSE"
                        break

        # Win condition: reach princess
        if self.player.rect.colliderect(self.princess_rect):
            self.state = "WIN"

        # Score & time
        self.time += 1
        # Small survival score
        if self.time % FPS == 0:
            self.score += 100

    def draw_grid(self, surf):
        # Optional faint grid for retro vibes
        for x in range(0, WIDTH, 30):
            pygame.draw.line(surf, (26, 26, 36), (x, 0), (x, HEIGHT))
        for y in range(0, HEIGHT, 30):
            pygame.draw.line(surf, (26, 26, 36), (0, y), (WIDTH, y))

    def draw_ui(self, surf):
        lives_s = font.render(f"Lives: {self.lives}", True, WHITE)
        score_s = font.render(f"Score: {self.score}", True, WHITE)
        help_s = font.render("←/→ move • Z jump • ↑/↓ climb • R restart", True, (210, 210, 220))
        surf.blit(lives_s, (16, 10))
        surf.blit(score_s, (16, 34))
        surf.blit(help_s, (WIDTH - help_s.get_width() - 16, 10))

    def draw_level(self, surf):
        # Platforms
        for p in self.platforms:
            pygame.draw.rect(surf, PLATFORM, p.rect, border_radius=6)
            pygame.draw.rect(surf, (120, 40, 30), p.rect, width=3, border_radius=6)
        # Ladders
        for l in self.ladders:
            # verticals
            pygame.draw.rect(surf, LADDER, l.rect, width=3)
            # rungs
            step = 12
            y = l.rect.top + 4
            while y < l.rect.bottom - 4:
                pygame.draw.line(surf, LADDER, (l.rect.left+2, y), (l.rect.right-2, y), 2)
                y += step

        # DK + Princess
        pygame.draw.rect(surf, RED, self.dk_rect, border_radius=8)
        pygame.draw.rect(surf, PINK, self.princess_rect, border_radius=6)
        # Heart above princess for goal hint
        heart = [(self.princess_rect.centerx, self.princess_rect.y - 18)]
        pygame.draw.circle(surf, PINK, (self.princess_rect.centerx - 6, self.princess_rect.y - 12), 6)
        pygame.draw.circle(surf, PINK, (self.princess_rect.centerx + 6, self.princess_rect.y - 12), 6)
        pygame.draw.polygon(surf, PINK, [
            (self.princess_rect.centerx - 12, self.princess_rect.y - 8),
            (self.princess_rect.centerx + 12, self.princess_rect.y - 8),
            (self.princess_rect.centerx, self.princess_rect.y)
        ])

    def draw(self, surf):
        surf.fill(BG)
        self.draw_grid(surf)
        self.draw_level(surf)

        # Barrels
        for b in self.barrels:
            b.draw(surf)

        # Player
        self.player.draw(surf)

        # UI
        self.draw_ui(surf)

        if self.state == "WIN":
            msg = "YOU SAVED THE PRINCESS! Press R to play again"
            s = font.render(msg, True, YELLOW)
            surf.blit(s, (WIDTH//2 - s.get_width()//2, HEIGHT//2 - 10))
        elif self.state == "LOSE":
            msg = "GAME OVER — Press R to restart"
            s = font.render(msg, True, YELLOW)
            surf.blit(s, (WIDTH//2 - s.get_width()//2, HEIGHT//2 - 10))


def main():
    game = Game()

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    game.reset()

        game.update()
        game.draw(screen)

        pygame.display.flip()
        clock.tick(FPS)


if __name__ == "__main__":
    main()
