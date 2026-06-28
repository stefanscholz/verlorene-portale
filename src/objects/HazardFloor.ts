import Phaser from 'phaser'
import { TILE, DifficultyParams } from '../config'

// Verfall/„Virus" als Overlay auf dem (von TerrainMap gezeichneten) Boden.
// Befallen werden nur begehbare, ungeschützte Kacheln (opts.canInfect). Zuerst
// eine Warnung (rot pulsierend), dann ein schwarzes Loch (Overlay-Sprite).
// Ausbreitung zusammenhängend; Heilen per healAt() (Energie-Freigabe).

type TileState = 'warn' | 'hazard'

interface Tile {
  col: number
  row: number
  state: TileState
  warn?: Phaser.GameObjects.Rectangle
  hole?: Phaser.GameObjects.Image
}

interface HazardFloorOpts {
  playerPos: () => { x: number; y: number }
  canInfect: (col: number, row: number) => boolean
}

export class HazardFloor {
  private scene: Phaser.Scene
  private params: DifficultyParams
  private hazardTex: string
  private cols: number
  private rows: number
  private infected: Tile[] = []
  private stateMap = new Map<number, TileState>()
  private spawnEvent?: Phaser.Time.TimerEvent
  private opts: HazardFloorOpts

  constructor(
    scene: Phaser.Scene,
    cols: number,
    rows: number,
    params: DifficultyParams,
    hazardTex: string,
    opts: HazardFloorOpts,
  ) {
    this.scene = scene
    this.cols = cols
    this.rows = rows
    this.params = params
    this.hazardTex = hazardTex
    this.opts = opts
    this.spawnEvent = scene.time.addEvent({
      delay: params.hazardSpawnEverySec * 1000,
      loop: true,
      callback: () => this.spawnDecay(),
    })
  }

  private key(col: number, row: number) {
    return row * this.cols + col
  }
  private cx(col: number) {
    return col * TILE + TILE / 2
  }
  private cy(row: number) {
    return row * TILE + TILE / 2
  }
  private tileAt(col: number, row: number) {
    return this.infected.find((t) => t.col === col && t.row === row)
  }

  isHazardAt(x: number, y: number): boolean {
    const c = Math.floor(x / TILE)
    const r = Math.floor(y / TILE)
    return this.stateMap.get(this.key(c, r)) === 'hazard'
  }

  /** Nächste befallene Kachel (Zielhilfe beim Freigeben); Hazards bevorzugt. */
  nearestInfected(x: number, y: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null
    let bd = Number.POSITIVE_INFINITY
    for (const onlyHazard of [true, false]) {
      for (const t of this.infected) {
        if (onlyHazard && t.state !== 'hazard') continue
        const d = Phaser.Math.Distance.Between(x, y, this.cx(t.col), this.cy(t.row))
        if (d < bd) {
          bd = d
          best = { x: this.cx(t.col), y: this.cy(t.row) }
        }
      }
      if (best) return best
    }
    return best
  }

  /** Befallene Kachel an einer Position heilen (Energie-Freigabe). */
  healAt(x: number, y: number): boolean {
    const c = Math.floor(x / TILE)
    const r = Math.floor(y / TILE)
    const t = this.tileAt(c, r)
    if (t) {
      this.heal(t)
      return true
    }
    return false
  }

  private spawnDecay() {
    if (this.infected.length >= this.params.maxHazards) return
    let cell: { col: number; row: number } | undefined
    // meistens wachsen (zusammenhängend), nur selten (~7%) ein neuer Herd
    if (this.infected.length > 0 && Phaser.Math.FloatBetween(0, 1) > 0.07) {
      cell = this.pickAdjacent()
    }
    if (!cell) cell = this.pickRandom()
    if (cell) this.startWarn(cell.col, cell.row)
  }

  private infectable(col: number, row: number) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false
    if (this.stateMap.has(this.key(col, row))) return false
    if (!this.opts.canInfect(col, row)) return false
    // nicht direkt auf der Figur
    const p = this.opts.playerPos()
    if (Phaser.Math.Distance.Between(this.cx(col), this.cy(row), p.x, p.y) < TILE * 1.5) return false
    return true
  }

  private pickAdjacent() {
    const order = Phaser.Utils.Array.Shuffle(this.infected.slice())
    for (const src of order) {
      const cands = [
        { col: src.col, row: src.row - 1 },
        { col: src.col, row: src.row + 1 },
        { col: src.col - 1, row: src.row },
        { col: src.col + 1, row: src.row },
      ].filter((n) => this.infectable(n.col, n.row))
      if (cands.length) return Phaser.Utils.Array.GetRandom(cands)
    }
    return undefined
  }

  private pickRandom() {
    for (let i = 0; i < 24; i++) {
      const col = Phaser.Math.Between(0, this.cols - 1)
      const row = Phaser.Math.Between(0, this.rows - 1)
      if (this.infectable(col, row)) return { col, row }
    }
    return undefined
  }

  private startWarn(col: number, row: number) {
    const t: Tile = { col, row, state: 'warn' }
    t.warn = this.scene.add
      .rectangle(col * TILE, row * TILE, TILE, TILE, 0xff3030)
      .setOrigin(0, 0)
      .setDepth(1)
      .setAlpha(0.08)
    this.scene.tweens.add({
      targets: t.warn,
      alpha: { from: 0.1, to: 0.55 },
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    this.infected.push(t)
    this.stateMap.set(this.key(col, row), 'warn')
    this.scene.time.delayedCall(this.params.hazardWarnSec * 1000, () => {
      if (t.state === 'warn') this.makeHazard(t)
    })
  }

  private makeHazard(t: Tile) {
    t.warn?.destroy()
    t.warn = undefined
    t.state = 'hazard'
    t.hole = this.scene.add.image(this.cx(t.col), this.cy(t.row), this.hazardTex).setDepth(1)
    this.stateMap.set(this.key(t.col, t.row), 'hazard')
    if (this.params.hazardLifeSec > 0) {
      this.scene.time.delayedCall(this.params.hazardLifeSec * 1000, () => this.heal(t))
    }
  }

  private heal(t: Tile) {
    t.warn?.destroy()
    t.hole?.destroy()
    this.stateMap.delete(this.key(t.col, t.row))
    const i = this.infected.indexOf(t)
    if (i >= 0) this.infected.splice(i, 1)
  }

  destroy() {
    this.spawnEvent?.remove()
  }
}
