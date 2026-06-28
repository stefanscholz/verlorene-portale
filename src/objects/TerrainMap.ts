import Phaser from 'phaser'
import { TILE } from '../config'
import { THEMES, TerrainTheme } from '../systems/terrain'
import { GameState } from '../systems/GameState'

// Zeichnet ein Terrain-Grid, baut Kollisionskörper für unpassierbare Kacheln
// (Berge/Brocken/Steine) und beantwortet Abfragen zur Position der Figur.
export class TerrainMap {
  readonly cols: number
  readonly rows: number
  readonly blockers: Phaser.Physics.Arcade.StaticGroup
  private theme: TerrainTheme
  private grid: string[][]

  constructor(scene: Phaser.Scene, themeId: string, grid: string[][]) {
    this.theme = THEMES[themeId]
    this.grid = grid
    this.rows = grid.length
    this.cols = grid[0].length
    this.blockers = scene.physics.add.staticGroup()

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const t = this.theme.types[grid[y][x]]
        if (t.impassable) {
          // Sichtbare Kachel IST der statische Kollisionskörper.
          this.blockers
            .create(x * TILE + TILE / 2, y * TILE + TILE / 2, t.tex)
            .setDepth(0)
        } else {
          scene.add.image(x * TILE, y * TILE, t.tex).setOrigin(0, 0).setDepth(0)
        }
      }
    }
  }

  private typeAt(x: number, y: number) {
    const c = Math.floor(x / TILE)
    const r = Math.floor(y / TILE)
    const id = this.grid[r]?.[c]
    return id ? this.theme.types[id] : undefined
  }

  idAt(x: number, y: number): string | undefined {
    const c = Math.floor(x / TILE)
    const r = Math.floor(y / TILE)
    return this.grid[r]?.[c]
  }

  // Ist die zur Kachel gehörende Gelände-Fähigkeit freigeschaltet?
  private abilityActive(t: { ability?: string }) {
    return !!t.ability && GameState.hasTerrainAbility(t.ability)
  }

  speedAt(x: number, y: number): number {
    const t = this.typeAt(x, y)
    if (!t) return 1
    // Freigeschaltete Fähigkeit hebt die Bremswirkung auf (mind. normales Tempo).
    if (this.abilityActive(t)) return Math.max(t.speed, 1)
    return t.speed
  }

  drainAt(x: number, y: number): number {
    const t = this.typeAt(x, y)
    if (!t) return 0
    // Freigeschaltete Fähigkeit hebt den Energieabzug auf.
    if (this.abilityActive(t)) return 0
    return t.drain
  }

  isImpassable(x: number, y: number): boolean {
    return this.typeAt(x, y)?.impassable ?? false
  }
}
