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
  private active = 0
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

  private spawnDecay() {
    if (this.active >= this.params.maxHazards) return
    for (let i = 0; i < 12; i++) {
      const r = Phaser.Math.Between(0, this.rows - 1)
      const c = Phaser.Math.Between(0, this.cols - 1)
      const t = this.tiles[r][c]
      if (t.state !== 'ok' || this.isProtected(t)) continue
      this.startWarn(t)
      return
    }
  }

  private startWarn(t: Tile) {
    t.state = 'warn'
    this.active++
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
    if (t.state !== 'hazard') return
    t.state = 'ok'
    t.img.setTexture(this.floorTex)
    this.active = Math.max(0, this.active - 1)
  }

  destroy() {
    this.spawnEvent?.remove()
  }
}
