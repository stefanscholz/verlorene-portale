// Globaler Spielzustand: gesammelte Teile, gebaute Portale, freigeschaltete
// Kräfte und befreundete Begleiter. Wird bei jeder Änderung in localStorage
// gespeichert, damit der Fortschritt einen Neustart übersteht.

import { PORTALS } from '../data/portals'
import { Difficulty } from '../config'

const SAVE_KEY = 'verlorene-portale:v1'

interface SaveData {
  collectedParts: string[] // "portalId:partId"
  builtPortals: string[] // portalId
  clearedDangers: string[] // portalId (Gefahr besiegt)
  abilities: string[] // ability-ids
  companions: string[] // companion-ids
  difficulty: Difficulty
  portalEnergy: Record<string, number> // portalId -> 0..100
}

class GameStateClass {
  collectedParts = new Set<string>()
  builtPortals = new Set<string>()
  clearedDangers = new Set<string>()
  abilities = new Set<string>()
  companions = new Set<string>()
  difficulty: Difficulty = 'leicht'
  portalEnergy: Record<string, number> = {}

  private key(portalId: string, partId: string) {
    return `${portalId}:${partId}`
  }

  hasPart(portalId: string, partId: string) {
    return this.collectedParts.has(this.key(portalId, partId))
  }

  collectPart(portalId: string, partId: string) {
    this.collectedParts.add(this.key(portalId, partId))
    this.save()
  }

  collectedCount(portalId: string) {
    const portal = PORTALS.find((p) => p.id === portalId)
    if (!portal) return 0
    return portal.parts.filter((pt) => this.hasPart(portalId, pt.id)).length
  }

  hasAllParts(portalId: string) {
    const portal = PORTALS.find((p) => p.id === portalId)
    if (!portal) return false
    return portal.parts.every((pt) => this.hasPart(portalId, pt.id))
  }

  isBuilt(portalId: string) {
    return this.builtPortals.has(portalId)
  }

  buildPortal(portalId: string) {
    this.builtPortals.add(portalId)
    this.save()
  }

  isDangerCleared(portalId: string) {
    return this.clearedDangers.has(portalId)
  }

  clearDanger(portalId: string) {
    this.clearedDangers.add(portalId)
    this.save()
  }

  hasAbility(id: string) {
    return this.abilities.has(id)
  }

  unlockAbility(id: string) {
    this.abilities.add(id)
    this.save()
  }

  hasCompanion(id: string) {
    return this.companions.has(id)
  }

  addCompanion(id: string) {
    this.companions.add(id)
    this.save()
  }

  setDifficulty(d: Difficulty) {
    this.difficulty = d
    this.save()
  }

  getEnergy(portalId: string) {
    return this.portalEnergy[portalId] ?? 0
  }

  setEnergy(portalId: string, value: number) {
    this.portalEnergy[portalId] = Math.max(0, Math.min(100, value))
    this.save()
  }

  save() {
    const data: SaveData = {
      collectedParts: [...this.collectedParts],
      builtPortals: [...this.builtPortals],
      clearedDangers: [...this.clearedDangers],
      abilities: [...this.abilities],
      companions: [...this.companions],
      difficulty: this.difficulty,
      portalEnergy: this.portalEnergy,
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      /* localStorage evtl. nicht verfügbar – Spiel läuft trotzdem weiter */
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as SaveData
      this.collectedParts = new Set(data.collectedParts ?? [])
      this.builtPortals = new Set(data.builtPortals ?? [])
      this.clearedDangers = new Set(data.clearedDangers ?? [])
      this.abilities = new Set(data.abilities ?? [])
      this.companions = new Set(data.companions ?? [])
      this.difficulty = data.difficulty ?? 'leicht'
      this.portalEnergy = data.portalEnergy ?? {}
    } catch {
      /* defekter Spielstand -> mit leerem Zustand starten */
    }
  }

  reset() {
    this.collectedParts.clear()
    this.builtPortals.clear()
    this.clearedDangers.clear()
    this.abilities.clear()
    this.companions.clear()
    this.portalEnergy = {}
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      /* ignorieren */
    }
  }
}

// Einzige, global geteilte Instanz.
export const GameState = new GameStateClass()
