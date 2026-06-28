import Phaser from 'phaser'
import { WORLD_WIDTH, WORLD_HEIGHT, REWARD_WIDTH, REWARD_HEIGHT, TILE } from '../config'
import { PortalDef } from '../data/portals'

// Berechnet die zufällige – aber pro Seed STABILE – Platzierung von Fundament,
// Spielstart, Lager, Portal-Teilen und Gefahr. Gleicher Seed => gleiche Welt;
// ein neues Spiel (neuer Seed) => neue Anordnung.

export interface Vec2 {
  x: number
  y: number
}

export interface PortalLayout {
  foundation: Vec2
  playerStart: Vec2
  camp: Vec2 // sicherer Ort in der Hauptwelt (Freunde heimbringen)
  parts: Record<string, Vec2> // partId -> Position (Hauptwelt)
  creature: Vec2 // Gefahr in der Belohnungswelt (= Anker fürs Rück-Portal)
  rewardSpawn: Vec2 // Spielstart in der Belohnungswelt
}

export function computeLayout(portal: PortalDef, seed: string, avoid: Vec2[] = []): PortalLayout {
  const rng = new Phaser.Math.RandomDataGenerator([`${seed}:${portal.id}`])

  // Mindestabstand zu bereits platzierten Portalen (Fundamente/Teile). Kleiner
  // als der Intra-Portal-Abstand, damit viele Portale im Feld noch passen.
  const crossDist = TILE * 6
  const farFromAvoid = (c: Vec2) =>
    avoid.every((p) => Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y) > crossDist)

  // Hauptwelt: Fundament zufällig, aber nicht am Rand – und mit Abstand zu
  // anderen Portalen (mehrere Versuche, sonst letzter Vorschlag).
  let foundation: Vec2 = {
    x: rng.between(350, WORLD_WIDTH - 350),
    y: rng.between(350, WORLD_HEIGHT - 350),
  }
  for (let i = 0; i < 60 && !farFromAvoid(foundation); i++) {
    foundation = {
      x: rng.between(350, WORLD_WIDTH - 350),
      y: rng.between(350, WORLD_HEIGHT - 350),
    }
  }
  const playerStart: Vec2 = {
    x: Phaser.Math.Clamp(foundation.x, 160, WORLD_WIDTH - 160),
    y: Phaser.Math.Clamp(foundation.y + 260, 160, WORLD_HEIGHT - 160),
  }
  // Lager nahe dem Start (man startet quasi „zuhause").
  const campAng = rng.realInRange(0, Math.PI * 2)
  const camp: Vec2 = {
    x: Phaser.Math.Clamp(playerStart.x + Math.cos(campAng) * 240, 160, WORLD_WIDTH - 160),
    y: Phaser.Math.Clamp(playerStart.y + Math.sin(campAng) * 240, 160, WORLD_HEIGHT - 160),
  }

  // Portal-Teile: weit verteilt (Mindestabstand skaliert mit der Weltgröße).
  const minDist = WORLD_WIDTH * 0.22
  const parts: Record<string, Vec2> = {}
  // Eigene Punkte mit vollem Abstand; fremde Portale (avoid) mit Cross-Abstand.
  const placed: Vec2[] = [foundation, playerStart, camp]
  for (const part of portal.parts) {
    let chosen: Vec2 | undefined
    for (let i = 0; i < 120; i++) {
      const c = {
        x: rng.between(180, WORLD_WIDTH - 180),
        y: rng.between(180, WORLD_HEIGHT - 180),
      }
      const okOwn = placed.every((p) => Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y) > minDist)
      if (okOwn && farFromAvoid(c)) {
        chosen = c
        break
      }
    }
    if (!chosen) {
      chosen = { x: rng.between(180, WORLD_WIDTH - 180), y: rng.between(180, WORLD_HEIGHT - 180) }
    }
    parts[part.id] = chosen
    placed.push(chosen)
  }

  // Belohnungswelt: Spielstart unten Mitte, Gefahr zufällig in der oberen Hälfte.
  const rewardSpawn: Vec2 = { x: REWARD_WIDTH / 2, y: REWARD_HEIGHT - 160 }
  const creature: Vec2 = {
    x: rng.between(180, REWARD_WIDTH - 180),
    y: rng.between(220, REWARD_HEIGHT * 0.45),
  }

  return { foundation, playerStart, camp, parts, creature, rewardSpawn }
}
