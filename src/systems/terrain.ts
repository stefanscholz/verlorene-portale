import Phaser from 'phaser'
import { TEX } from '../config'

// Terrain-System: Bodenarten je Welt-Thema mit Tempo-/Energie-Wirkung und eine
// deterministische (seed-basierte) Generierung von Landschaften. Begehbarkeit
// zu allen wichtigen Punkten wird garantiert (BFS + Korridore).

export interface TerrainType {
  speed: number // Tempo-Faktor (1 normal); bei impassable irrelevant
  drain: number // Energie %/s, solange man darauf steht
  impassable: boolean
  tex: string
}

export interface TerrainTheme {
  types: Record<string, TerrainType>
  roles: {
    base: string
    road: string
    rough: string
    shallow?: string
    deep: string
    block: string
    block2?: string
  }
  features: { mountains: number; forests: number; rivers: number; stones: number }
}

export const THEMES: Record<string, TerrainTheme> = {
  wald: {
    types: {
      gras: { speed: 1.0, drain: 0, impassable: false, tex: TEX.tGras },
      weg: { speed: 1.4, drain: 0, impassable: false, tex: TEX.tWeg },
      wald: { speed: 0.55, drain: 0, impassable: false, tex: TEX.tWald },
      flach: { speed: 0.5, drain: 0, impassable: false, tex: TEX.tFlach },
      tief: { speed: 0.42, drain: 4, impassable: false, tex: TEX.tTief },
      berg: { speed: 0, drain: 0, impassable: true, tex: TEX.tBerg },
      stein: { speed: 0, drain: 0, impassable: true, tex: TEX.tStein },
    },
    roles: { base: 'gras', road: 'weg', rough: 'wald', shallow: 'flach', deep: 'tief', block: 'berg', block2: 'stein' },
    features: { mountains: 7, forests: 12, rivers: 2, stones: 18 },
  },
  weltraum: {
    types: {
      nebel: { speed: 1.0, drain: 0, impassable: false, tex: TEX.tNebel },
      pfad: { speed: 1.4, drain: 0, impassable: false, tex: TEX.tPfad },
      feld: { speed: 0.55, drain: 0, impassable: false, tex: TEX.tFeld },
      leere: { speed: 0.45, drain: 4, impassable: false, tex: TEX.tLeere },
      brocken: { speed: 0, drain: 0, impassable: true, tex: TEX.tBrocken },
    },
    roles: { base: 'nebel', road: 'pfad', rough: 'feld', deep: 'leere', block: 'brocken' },
    features: { mountains: 6, forests: 9, rivers: 1, stones: 0 },
  },
}

export interface TileXY {
  col: number
  row: number
}

export function generateTerrain(
  themeId: string,
  cols: number,
  rows: number,
  seed: string,
  clearTiles: TileXY[],
): string[][] {
  const theme = THEMES[themeId]
  const r = theme.roles
  const rng = new Phaser.Math.RandomDataGenerator([`${seed}:terrain:${themeId}`])

  const grid: string[][] = []
  for (let y = 0; y < rows; y++) {
    grid[y] = []
    for (let x = 0; x < cols; x++) grid[y][x] = r.base
  }
  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows
  const set = (x: number, y: number, t: string) => {
    if (inB(x, y)) grid[y][x] = t
  }
  const blob = (cx: number, cy: number, rad: number, fn: (x: number, y: number) => void) => {
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy <= rad * rad + rng.between(0, rad)) fn(cx + dx, cy + dy)
      }
    }
  }
  const scale = Math.max(1, (cols * rows) / (50 * 50))

  // Berge / große Asteroiden
  const mountains = Math.round(theme.features.mountains * scale)
  for (let i = 0; i < mountains; i++) {
    blob(rng.between(3, cols - 4), rng.between(3, rows - 4), rng.between(2, 4), (x, y) =>
      set(x, y, r.block),
    )
  }
  // Wälder / Asteroidenfelder
  const forests = Math.round(theme.features.forests * scale)
  for (let i = 0; i < forests; i++) {
    blob(rng.between(2, cols - 3), rng.between(2, rows - 3), rng.between(2, 5), (x, y) => {
      if (grid[y]?.[x] === r.base) set(x, y, r.rough)
    })
  }
  // Steine (kleine Blocker)
  if (r.block2) {
    const stones = Math.round(theme.features.stones * scale)
    for (let i = 0; i < stones; i++) set(rng.between(0, cols - 1), rng.between(0, rows - 1), r.block2)
  }
  // Flüsse / Leere als wandernde Linie (Mitte tief, Ränder flach)
  for (let i = 0; i < theme.features.rivers; i++) {
    let x = rng.between(0, cols - 1)
    let y = 0
    let dirX = rng.between(-1, 1)
    const steps = rows + cols
    for (let s = 0; s < steps && inB(x, y); s++) {
      set(x, y, r.deep)
      set(x + 1, y, r.deep)
      if (r.shallow) {
        set(x - 1, y, r.shallow)
        set(x + 2, y, r.shallow)
      }
      y += 1
      if (rng.frac() < 0.35) dirX = rng.between(-1, 1)
      x += dirX
      x = Phaser.Math.Clamp(x, 1, cols - 3)
    }
  }

  // Wichtige Punkte freiräumen
  for (const c of clearTiles) blob(c.col, c.row, 2, (x, y) => set(x, y, r.base))

  // Begehbarkeit sicherstellen: BFS vom Spielstart, Korridore zu unerreichbaren Zielen
  const passable = (x: number, y: number) => inB(x, y) && !theme.types[grid[y][x]].impassable
  if (clearTiles.length > 0) {
    const start = clearTiles[0]
    let visited = bfs(start, cols, rows, passable)
    for (let k = 1; k < clearTiles.length; k++) {
      const c = clearTiles[k]
      if (!visited.has(c.row * cols + c.col)) {
        carveLine(start, c, (x, y) => {
          if (inB(x, y) && theme.types[grid[y][x]].impassable) set(x, y, r.base)
        })
        visited = bfs(start, cols, rows, passable)
      }
    }
    // Eine sichtbare Straße vom Start zum zweiten Punkt (i.d.R. Fundament)
    if (clearTiles.length > 1) {
      carveLine(start, clearTiles[1], (x, y) => {
        if (inB(x, y) && !theme.types[grid[y][x]].impassable) set(x, y, r.road)
      })
    }
  }

  return grid
}

function bfs(
  start: TileXY,
  cols: number,
  rows: number,
  passable: (x: number, y: number) => boolean,
): Set<number> {
  const visited = new Set<number>()
  if (!passable(start.col, start.row)) return visited
  const queue: TileXY[] = [start]
  visited.add(start.row * cols + start.col)
  while (queue.length) {
    const t = queue.shift() as TileXY
    const neigh = [
      { col: t.col, row: t.row - 1 },
      { col: t.col, row: t.row + 1 },
      { col: t.col - 1, row: t.row },
      { col: t.col + 1, row: t.row },
    ]
    for (const n of neigh) {
      const key = n.row * cols + n.col
      if (n.col < 0 || n.row < 0 || n.col >= cols || n.row >= rows) continue
      if (visited.has(key) || !passable(n.col, n.row)) continue
      visited.add(key)
      queue.push(n)
    }
  }
  return visited
}

// Bresenham-Linie; ruft fn für jede Kachel auf dem Weg auf.
function carveLine(a: TileXY, b: TileXY, fn: (x: number, y: number) => void) {
  let x0 = a.col
  let y0 = a.row
  const x1 = b.col
  const y1 = b.row
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    fn(x0, y0)
    fn(x0 + 1, y0) // etwas breiter, damit die Figur durchpasst
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
}
