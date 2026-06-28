import Phaser from 'phaser'
import { TILE, DifficultyParams } from '../config'

// Kachelraster für die Belohnungswelt. Zufällige Kacheln verfallen:
// zuerst Warnung (rot pulsierend), dann gefährlich (Hazard-Textur, z. B.
// schwarzes Loch). Je nach Schwierigkeit heilen sie wieder oder bleiben.
// Die Scene fragt per isHazardAt(), ob die Spielerposition gefährlich ist.

type TileState = 'ok' | 'warn' | 'hazard'

interface Tile {
  img: Phaser.GameObjects.Image
  state: TileState
  col: number
  row: number
  warn?: Phaser.GameObjects.Rectangle
}

interface HazardFloorOpts {
  playerPos: () => { x: number; y: number }
  avoid: { x: number; y: number; r: number }[] // geschützte Zonen (Start, Rück-Portal)
}

export class HazardFloor {
  private scene: Phaser.Scene
  private params: DifficultyParams
  private floorTex: string
  private hazardTex: string
  private cols: number
  private rows: number
  private tiles: Tile[][] = []
  private infected: Tile[] = [] // aktuell befallene Kacheln (warn + hazard)
  private spawnEvent?: Phaser.Time.TimerEvent
  private opts: HazardFloorOpts

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    params: DifficultyParams,
    floorTex: string,
    hazardTex: string,
    opts: HazardFloorOpts,
  ) {
    this.scene = scene
    this.params = params
    this.floorTex = floorTex
    this.hazardTex = hazardTex
    this.opts = opts
    this.cols = Math.ceil(width / TILE)
    this.rows = Math.ceil(height / TILE)

    for (let r = 0; r < this.rows; r++) {
      this.tiles[r] = []
      for (let c = 0; c < this.cols; c++) {
        const img = scene.add.image(c * TILE, r * TILE, floorTex).setOrigin(0, 0).setDepth(0)
        this.tiles[r][c] = { img, state: 'ok', col: c, row: r }
      }
    }

    this.spawnEvent = scene.time.addEvent({
      delay: params.hazardSpawnEverySec * 1000,
      loop: true,
      callback: () => this.spawnDecay(),
    })
  }

  private tileAt(x: number, y: number): Tile | undefined {
    const c = Math.floor(x / TILE)
    const r = Math.floor(y / TILE)
    return this.tiles[r]?.[c]
  }

  isHazardAt(x: number, y: number): boolean {
    return this.tileAt(x, y)?.state === 'hazard'
  }

  /** Nächste befallene Kachel (für die Zielhilfe beim Freigeben). */
  nearestInfected(x: number, y: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null
    let bd = Number.POSITIVE_INFINITY
    // Hazards bevorzugen (sichtbar), sonst Warn-Kacheln.
    for (const onlyHazard of [true, false]) {
      for (const t of this.infected) {
        if (onlyHazard && t.state !== 'hazard') continue
        const cx = t.col * TILE + TILE / 2
        const cy = t.row * TILE + TILE / 2
        const d = Phaser.Math.Distance.Between(x, y, cx, cy)
        if (d < bd) {
          bd = d
          best = { x: cx, y: cy }
        }
      }
      if (best) return best
    }
    return best
  }

  /** Befallene Kachel an einer Position heilen (durch Energie-Freigabe). */
  healAt(x: number, y: number): boolean {
    const t = this.tileAt(x, y)
    if (t && (t.state === 'hazard' || t.state === 'warn')) {
      this.heal(t)
      return true
    }
    return false
  }

  private isProtected(t: Tile): boolean {
    const cx = t.col * TILE + TILE / 2
    const cy = t.row * TILE + TILE / 2
    const p = this.opts.playerPos()
    if (Phaser.Math.Distance.Between(cx, cy, p.x, p.y) < TILE * 1.5) return true
    for (const a of this.opts.avoid) {
      if (Phaser.Math.Distance.Between(cx, cy, a.x, a.y) < a.r) return true
    }
    return false
  }

  // Virus-Ausbreitung: meist von bestehenden Herden auf Nachbarkacheln wachsen
  // (zusammenhängende Flächen), selten ein neuer Herd.
  private spawnDecay() {
    if (this.infected.length >= this.params.maxHazards) return
    let t: Tile | undefined
    // meistens wachsen (zusammenhängend), nur selten (~7%) ein neuer Herd
    if (this.infected.length > 0 && Phaser.Math.FloatBetween(0, 1) > 0.07) {
      t = this.pickAdjacentOk()
    }
    if (!t) t = this.pickRandomOk()
    if (t) this.startWarn(t)
  }

  private pickAdjacentOk(): Tile | undefined {
    const order = Phaser.Utils.Array.Shuffle(this.infected.slice())
    for (const src of order) {
      const n = this.okNeighbors(src)
      if (n.length) return Phaser.Utils.Array.GetRandom(n)
    }
    return undefined
  }

  private pickRandomOk(): Tile | undefined {
    for (let i = 0; i < 16; i++) {
      const r = Phaser.Math.Between(0, this.rows - 1)
      const c = Phaser.Math.Between(0, this.cols - 1)
      const t = this.tiles[r][c]
      if (t.state === 'ok' && !this.isProtected(t)) return t
    }
    return undefined
  }

  private okNeighbors(t: Tile): Tile[] {
    const cand = [
      this.tiles[t.row - 1]?.[t.col],
      this.tiles[t.row + 1]?.[t.col],
      this.tiles[t.row]?.[t.col - 1],
      this.tiles[t.row]?.[t.col + 1],
    ]
    const res: Tile[] = []
    for (const n of cand) {
      if (n && n.state === 'ok' && !this.isProtected(n)) res.push(n)
    }
    return res
  }

  private startWarn(t: Tile) {
    t.state = 'warn'
    this.infected.push(t)
    t.warn = this.scene.add
      .rectangle(t.col * TILE, t.row * TILE, TILE, TILE, 0xff3030)
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
    this.scene.time.delayedCall(this.params.hazardWarnSec * 1000, () => {
      if (t.state === 'warn') this.makeHazard(t)
    })
  }

  private makeHazard(t: Tile) {
    t.warn?.destroy()
    t.warn = undefined
    t.state = 'hazard'
    t.img.setTexture(this.hazardTex)
    if (this.params.hazardLifeSec > 0) {
      this.scene.time.delayedCall(this.params.hazardLifeSec * 1000, () => this.heal(t))
    }
  }

  private heal(t: Tile) {
    if (t.state === 'ok') return
    t.warn?.destroy()
    t.warn = undefined
    t.state = 'ok'
    t.img.setTexture(this.floorTex)
    const i = this.infected.indexOf(t)
    if (i >= 0) this.infected.splice(i, 1)
  }

  destroy() {
    this.spawnEvent?.remove()
  }
}
