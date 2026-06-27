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

// Schlüssel für die zur Laufzeit erzeugten Platzhalter-Texturen.
export const TEX = {
  ground: 'tex-ground',
  groundAlt: 'tex-ground-alt',
  player: 'tex-player',
  part: 'tex-part',
  foundation: 'tex-foundation',
  portal: 'tex-portal',
  projectile: 'tex-projectile',
  creature: 'tex-creature',
  companion: 'tex-companion',
}
