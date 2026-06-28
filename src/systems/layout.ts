import Phaser from 'phaser'
import { WORLD_WIDTH, WORLD_HEIGHT, REWARD_WIDTH, REWARD_HEIGHT } from '../config'
import { PortalDef } from '../data/portals'

// Berechnet die zufällige – aber pro Seed STABILE – Platzierung von Fundament,
// Spielstart, Portal-Teilen und Gefahr. Gleicher Seed => gleiche Welt; ein neues
// Spiel (neuer Seed) => neue Anordnung.

export interface Vec2 {
  x: number
  y: number
}

export interface PortalLayout {
  foundation: Vec2
  playerStart: Vec2
  parts: Record<string, Vec2> // partId -> Position (Hauptwelt)
  creature: Vec2 // Gefahr in der Belohnungswelt (= Anker fürs Rück-Portal)
  rewardSpawn: Vec2 // Spielstart in der Belohnungswelt
}

export function computeLayout(portal: PortalDef, seed: string): PortalLayout {
  const rng = new Phaser.Math.RandomDataGenerator([`${seed}:${portal.id}`])

  // Hauptwelt: Fundament zufällig, aber nicht am Rand.
  const foundation: Vec2 = {
    x: rng.between(300, WORLD_WIDTH - 300),
    y: rng.between(300, WORLD_HEIGHT - 300),
  }
  const playerStart: Vec2 = {
    x: Phaser.Math.Clamp(foundation.x, 140, WORLD_WIDTH - 140),
    y: Phaser.Math.Clamp(foundation.y + 190, 140, WORLD_HEIGHT - 140),
  }

  // Portal-Teile: gut verteilt (Mindestabstand zu Fundament, Start & untereinander).
  const parts: Record<string, Vec2> = {}
  const placed: Vec2[] = [foundation, playerStart]
  for (const part of portal.parts) {
    let chosen: Vec2 | undefined
    for (let i = 0; i < 80; i++) {
      const c = {
        x: rng.between(160, WORLD_WIDTH - 160),
        y: rng.between(160, WORLD_HEIGHT - 160),
      }
      if (placed.every((p) => Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y) > 360)) {
        chosen = c
        break
      }
    }
    if (!chosen) {
      chosen = { x: rng.between(160, WORLD_WIDTH - 160), y: rng.between(160, WORLD_HEIGHT - 160) }
    }
    parts[part.id] = chosen
    placed.push(chosen)
  }

  // Belohnungswelt: Spielstart unten Mitte (fix), Gefahr zufällig in der oberen Hälfte.
  const rewardSpawn: Vec2 = { x: REWARD_WIDTH / 2, y: REWARD_HEIGHT - 150 }
  const creature: Vec2 = {
    x: rng.between(140, REWARD_WIDTH - 140),
    y: rng.between(160, 430),
  }

  return { foundation, playerStart, parts, creature, rewardSpawn }
}
