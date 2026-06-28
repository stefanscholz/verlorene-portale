// Zentrale Spielkonstanten und Farb-/Textur-Definitionen.
// Hier an einer Stelle gesammelt, damit Balancing und Aussehen leicht
// anpassbar bleiben.

// Logische Spielfläche (Hochformat, gut fürs einhändige Tippen).
// Der Phaser-Scale-Manager passt das per FIT an jede Handygröße an.
export const GAME_WIDTH = 480
export const GAME_HEIGHT = 800

// Größe der Hauptwelt (größer als der Bildschirm -> Kamera folgt der Figur).
export const WORLD_WIDTH = 1600
export const WORLD_HEIGHT = 1600

// Größe der Belohnungswelt hinter dem Portal.
export const REWARD_WIDTH = 720
export const REWARD_HEIGHT = 1000

export const TILE = 64

export const PLAYER_SPEED = 210
export const CREATURE_SPEED = 70
export const PROJECTILE_SPEED = 440
export const THROW_COOLDOWN = 380 // ms zwischen zwei Würfen

// Farbpalette (Platzhalter-Grafik). Später durch echte Sprites ersetzbar.
export const COLORS = {
  ground: 0x2e7d32,
  groundAlt: 0x388e3c,
  player: 0x4fc3f7,
  part: 0xffd54f,
  foundation: 0x6d4c41,
  portal: 0xab47bc,
  projectile: 0xfff176,
  creature: 0xffffff, // weiß -> wird per Tint eingefärbt
  companion: 0xffffff, // weiß -> wird per Tint eingefärbt
}

// Schlüssel für die geladenen SVG-Texturen (siehe public/sprites/, BootScene).
export const TEX = {
  ground: 'tex-ground',
  groundAlt: 'tex-ground-alt',
  partRahmen: 'tex-part-rahmen',
  partKristall: 'tex-part-kristall',
  partSchluessel: 'tex-part-schluessel',
  foundation: 'tex-foundation',
  portal: 'tex-portal',
  projectile: 'tex-projectile',
  creature: 'tex-creature',
  creatureFriend: 'tex-creature-friend',
  companion: 'tex-companion',
  floorSpace: 'tex-floor-space',
  hazard: 'tex-hazard',
  energy: 'tex-energy',
  compass: 'tex-compass',
}

// Schwierigkeitsgrade steuern Energie-Verfall, Hazards und Strafen.
// Werte sind Startpunkte fürs Balancing und leicht anpassbar.
export type Difficulty = 'leicht' | 'mittel' | 'schwer'

export interface DifficultyParams {
  label: string
  energyDecayPerSec: number // % pro Sekunde
  hazardWarnSec: number // Vorwarnzeit, bevor eine Kachel gefährlich wird
  hazardSpawnEverySec: number // Abstand zwischen neuen Verfall-Kacheln
  maxHazards: number // gleichzeitig aktive Verfall-/Hazard-Kacheln
  hazardLifeSec: number // 0 = bleibt dauerhaft (bis maxHazards)
  hazardPenalty: number // % Energieabzug beim Betreten (wenn nicht lethal)
  lethal: boolean // true = Betreten = verloren (zurück zur Hauptwelt)
  energyRespawn: boolean // neue Energiequellen nachwachsen lassen?
  energyPerPickup: number // % Energie pro Quelle
}

export const DIFFICULTY: Record<Difficulty, DifficultyParams> = {
  leicht: {
    label: 'Leicht',
    energyDecayPerSec: 0,
    hazardWarnSec: 2.5,
    hazardSpawnEverySec: 9,
    maxHazards: 4,
    hazardLifeSec: 6,
    hazardPenalty: 8,
    lethal: false,
    energyRespawn: true,
    energyPerPickup: 14,
  },
  mittel: {
    label: 'Mittel',
    energyDecayPerSec: 1.2,
    hazardWarnSec: 1.9,
    hazardSpawnEverySec: 5.5,
    maxHazards: 8,
    hazardLifeSec: 7,
    hazardPenalty: 18,
    lethal: false,
    energyRespawn: true,
    energyPerPickup: 12,
  },
  schwer: {
    label: 'Schwer',
    energyDecayPerSec: 3.2,
    hazardWarnSec: 1.3,
    hazardSpawnEverySec: 3.5,
    maxHazards: 16,
    hazardLifeSec: 0,
    hazardPenalty: 0,
    lethal: true,
    energyRespawn: false,
    energyPerPickup: 20,
  },
}

// Frames der Spielfigur je Blickrichtung (Idle + zwei Schrittbilder).
// Die Seite zeigt nach rechts; für links wird das Sprite gespiegelt.
export const PLAYER_ANIM = {
  down: {
    idle: 'player-down-idle',
    walk: ['player-down-walk1', 'player-down-walk2'],
  },
  up: {
    idle: 'player-up-idle',
    walk: ['player-up-walk1', 'player-up-walk2'],
  },
  side: {
    idle: 'player-side-idle',
    walk: ['player-side-walk1', 'player-side-walk2'],
  },
} as const

export type PlayerDir = keyof typeof PLAYER_ANIM

