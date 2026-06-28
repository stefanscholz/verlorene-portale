import Phaser from 'phaser'
import { WORLD_WIDTH, WORLD_HEIGHT, TILE, TEX } from '../config'
import { PORTALS, PortalDef } from '../data/portals'
import { GameState } from '../systems/GameState'
import { Player } from '../objects/Player'
import { Collectible } from '../objects/Collectible'
import { PortalFoundation } from '../objects/PortalFoundation'
import { Companion } from '../objects/Companion'
import { Compass } from '../objects/Compass'
import { addAtmosphere } from '../objects/atmosphere'
import { GameAudio } from '../systems/Audio'
import { computeLayout, PortalLayout, Vec2 } from '../systems/layout'
import { generateTerrain } from '../systems/terrain'
import { TerrainMap } from '../objects/TerrainMap'

// Ein Portal in der Hauptwelt: Fundament + (noch nicht gesammelte) Teile.
interface PortalEntry {
  portal: PortalDef
  layout: PortalLayout
  foundation: PortalFoundation
  collectibles: Collectible[]
}

// Die Hauptwelt: erkunden, Teile sammeln, Portale (mehrere!) bauen und betreten,
// Freunde ins Lager bringen. Landschaft beeinflusst die Bewegung.
export class MainWorldScene extends Phaser.Scene {
  private player!: Player
  private terrain!: TerrainMap
  private compass!: Compass
  private entries: PortalEntry[] = []
  private escort?: Companion
  private campPos = { x: 0, y: 0 }
  private friendCount = 0
  private buildButton?: Phaser.GameObjects.Container
  private buildButtonRect = new Phaser.Geom.Rectangle(0, 0, 0, 0)
  private buildEntry?: PortalEntry
  private entering = false
  private energyHintShown = false
  private lastEnergyInt = -1

  constructor() {
    super('MainWorldScene')
  }

  create() {
    this.entering = false
    this.entries = []
    this.escort = undefined
    this.buildButton = undefined
    this.buildButtonRect = new Phaser.Geom.Rectangle(0, 0, 0, 0)
    this.buildEntry = undefined
    this.lastEnergyInt = -1
    this.friendCount = 0

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    // Layouts sequenziell berechnen: jedes neue Portal weicht den schon
    // platzierten Fundamenten/Teilen aus (kein Überlappen bei vielen Portalen).
    // Das erste Portal liefert Spielstart + Lager (das „Zuhause").
    const layouts = new Map<string, PortalLayout>()
    const avoid: Vec2[] = []
    for (const p of PORTALS) {
      const L = computeLayout(p, GameState.seed, avoid)
      layouts.set(p.id, L)
      avoid.push(L.foundation, ...Object.values(L.parts))
    }
    const home = layouts.get(PORTALS[0].id)!
    this.campPos = home.camp

    // Landschaft erzeugen; alle Fundamente/Teile/Start/Lager bleiben begehbar.
    const clearPts = [home.playerStart, home.camp]
    for (const p of PORTALS) {
      const L = layouts.get(p.id)!
      clearPts.push(L.foundation, ...Object.values(L.parts))
    }
    const clear = clearPts.map((p) => ({ col: Math.floor(p.x / TILE), row: Math.floor(p.y / TILE) }))
    const grid = generateTerrain(
      'wald',
      Math.ceil(WORLD_WIDTH / TILE),
      Math.ceil(WORLD_HEIGHT / TILE),
      GameState.seed,
      clear,
    )
    this.terrain = new TerrainMap(this, 'wald', grid)
    addAtmosphere(this, WORLD_WIDTH, WORLD_HEIGHT, 22)

    // Lager + bereits heimgebrachte Freunde am Feuer.
    this.add.image(home.camp.x, home.camp.y, TEX.camp).setDepth(4)
    for (const c of this.deliveredCompanions()) this.addFriendAtCamp(c.color)

    // Spielfigur – Tempo nach Boden; freigeschaltete Gelände-Fähigkeiten
    // (z. B. „Waldläufer") berücksichtigt speedAt bereits datengetrieben.
    this.player = new Player(this, home.playerStart.x, home.playerStart.y)
    this.player.setTerrain((x, y) => this.terrain.speedAt(x, y))
    this.physics.add.collider(this.player, this.terrain.blockers)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    // Der noch heimzubringende Freund folgt der Figur.
    const pending = PORTALS.map((p) => p.reward.companion).find((c) => GameState.hasPending(c.id))
    if (pending) {
      this.escort = new Companion(this, this.player.x - 30, this.player.y, pending.color)
    }

    // Fundamente + Teile aller Portale.
    for (const p of PORTALS) {
      const L = layouts.get(p.id)!
      const foundation = new PortalFoundation(this, L.foundation.x, L.foundation.y, GameState.isBuilt(p.id))
      const entry: PortalEntry = { portal: p, layout: L, foundation, collectibles: [] }
      this.physics.add.overlap(this.player, foundation, () => this.tryEnterPortal(entry))
      for (const part of p.parts) {
        if (GameState.hasPart(p.id, part.id)) continue
        const pos = L.parts[part.id]
        const c = new Collectible(this, pos.x, pos.y, part)
        entry.collectibles.push(c)
        this.physics.add.overlap(this.player, c, () => this.collectPart(c, entry))
      }
      this.entries.push(entry)
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      GameAudio.ensureStarted()
      if (p.x > this.cameras.main.width - 52 && p.y < 50) return // Ton-Knopf
      if (this.buildButton && this.buildButtonRect.contains(p.x, p.y)) {
        if (this.buildEntry) this.buildPortal(this.buildEntry)
        return
      }
      const wp = this.cameras.main.getWorldPoint(p.x, p.y)
      this.player.moveTo(wp.x, wp.y)
    })

    this.compass = new Compass(this)
    this.scene.bringToTop('UIScene')
    this.emitHud()
    this.applyPortalEnergy()

    if (pending) {
      this.toast(`Bring ${pending.name} zum Lager (Zelt am Feuer)!`)
    } else {
      const e = this.nearestEntry()
      this.toast(
        e.foundation.built
          ? `Willkommen zurück! Tritt in ein Portal, um eine andere Welt zu besuchen.`
          : `${e.portal.name} ist zerstört. Finde die 3 Teile und baue es wieder auf!`,
      )
    }
  }

  private deliveredCompanions() {
    return PORTALS.map((p) => p.reward.companion).filter(
      (c) => GameState.hasCompanion(c.id) && !GameState.hasPending(c.id),
    )
  }

  private addFriendAtCamp(color: number) {
    const i = this.friendCount++
    const fx = this.campPos.x - 34 + (i % 3) * 30
    const fy = this.campPos.y + 34 + Math.floor(i / 3) * 24
    const img = this.add.image(fx, fy, TEX.companion).setTint(color).setDepth(5).setScale(0.9)
    this.tweens.add({
      targets: img,
      y: fy - 5,
      duration: 700 + i * 90,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  private nearestEntry(): PortalEntry {
    let best = this.entries[0]
    let bd = Number.POSITIVE_INFINITY
    for (const e of this.entries) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.foundation.x, e.foundation.y)
      if (d < bd) {
        bd = d
        best = e
      }
    }
    return best
  }

  // Freund im Lager abliefern -> Gelände-Fähigkeit dauerhaft freischalten.
  private tryDeliverFriend() {
    const pending = PORTALS.find((p) => GameState.hasPending(p.reward.companion.id))
    if (!pending) return
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.campPos.x, this.campPos.y) > 95) {
      return
    }
    const ta = pending.reward.terrainAbility
    GameState.deliverFriend(pending.reward.companion.id, ta.id)
    GameAudio.victory()
    this.cameras.main.flash(450, 180, 255, 180)
    this.escort?.destroy()
    this.escort = undefined
    this.addFriendAtCamp(pending.reward.companion.color)
    this.toast(
      `${pending.reward.companion.name} ist sicher im Lager! Neue Fähigkeit „${ta.name}": ${ta.description}`,
    )
  }

  private collectPart(c: Collectible, entry: PortalEntry) {
    if (!c.active) return
    GameState.collectPart(entry.portal.id, c.partDef.id)
    GameAudio.collect()
    const idx = entry.collectibles.indexOf(c)
    if (idx >= 0) entry.collectibles.splice(idx, 1)
    this.tweens.add({ targets: c, scale: 0, alpha: 0, duration: 250, onComplete: () => c.destroy() })

    const have = GameState.collectedCount(entry.portal.id)
    const left = entry.portal.parts.length - have
    this.toast(
      left > 0
        ? `Super! ${c.partDef.name} gefunden! Noch ${left} ${left === 1 ? 'Teil' : 'Teile'} fehlen.`
        : `Toll, du hast alle Teile für ${entry.portal.name}! Geh zum Fundament und baue es.`,
    )
    this.emitHud()
  }

  private buildPortal(entry: PortalEntry) {
    if (entry.foundation.built || !GameState.hasAllParts(entry.portal.id)) return
    GameState.buildPortal(entry.portal.id)
    GameAudio.build()
    entry.foundation.build()
    this.hideBuildButton()
    this.cameras.main.flash(450, 200, 150, 255)
    this.toast('Das Portal leuchtet! Tritt hindurch, um die andere Welt zu betreten.')
    this.emitHud()
  }

  private tryEnterPortal(entry: PortalEntry) {
    if (!entry.foundation.built || this.entering) return
    this.entering = true
    GameAudio.portalEnter()
    this.player.halt()
    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('PortalWorldScene', { portalId: entry.portal.id })
    })
  }

  private showBuildButton() {
    if (this.buildButton) return
    const cam = this.cameras.main
    const x = cam.width / 2
    const y = cam.height - 96
    const bg = this.add.rectangle(0, 0, 250, 66, 0xffb300).setStrokeStyle(4, 0xff6f00)
    const label = this.add
      .text(0, 0, '🔨 Portal bauen', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#3e2723',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.buildButton = this.add.container(x, y, [bg, label]).setScrollFactor(0).setDepth(100)
    this.buildButtonRect = new Phaser.Geom.Rectangle(x - 125, y - 33, 250, 66)
  }

  private hideBuildButton() {
    this.buildButton?.destroy()
    this.buildButton = undefined
    this.buildButtonRect = new Phaser.Geom.Rectangle(0, 0, 0, 0)
  }

  private emitHud() {
    const e = this.nearestEntry()
    this.game.events.emit('hud', {
      mode: 'main',
      portalName: e.portal.name,
      collected: GameState.collectedCount(e.portal.id),
      total: e.portal.parts.length,
      built: e.foundation.built,
      energy: GameState.getEnergy(e.portal.id),
    })
  }

  // Gebaute Portale nach Ladung heller/dunkler; Hinweis bei wenig Energie.
  private applyPortalEnergy() {
    for (const e of this.entries) {
      if (!e.foundation.built) continue
      const energy = GameState.getEnergy(e.portal.id)
      e.foundation.setAlpha(0.5 + (0.5 * energy) / 100)
      if (energy < 20 && !this.energyHintShown) {
        this.energyHintShown = true
        this.toast('Ein Portal hat wenig Energie! Geh hindurch und sammle Sternenenergie.')
      }
    }
  }

  private toast(text: string) {
    this.game.events.emit('toast', text)
  }

  // Tiefes Wasser zieht Energie vom nächsten gebauten Portal. Freigeschaltete
  // Fähigkeiten (z. B. „Wassergeist") liefern über drainAt bereits 0.
  private drainInDeepWater(delta: number) {
    const drain = this.terrain.drainAt(this.player.x, this.player.y)
    if (drain <= 0) return
    const built = this.entries.filter((e) => e.foundation.built)
    if (!built.length) return
    let near = built[0]
    let bd = Number.POSITIVE_INFINITY
    for (const e of built) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.foundation.x, e.foundation.y)
      if (d < bd) {
        bd = d
        near = e
      }
    }
    const energy = GameState.getEnergy(near.portal.id)
    if (energy <= 0) return
    GameState.setEnergy(near.portal.id, energy - drain * (delta / 1000))
    const shown = Math.ceil(GameState.getEnergy(near.portal.id))
    if (shown !== this.lastEnergyInt) {
      this.lastEnergyInt = shown
      this.emitHud()
      this.applyPortalEnergy()
      this.cameras.main.flash(120, 60, 90, 160)
    }
  }

  update(_time: number, delta: number) {
    this.drainInDeepWater(delta)
    this.tryDeliverFriend()

    // Begleiter (heimzubringender Freund) folgt und leuchtet nahe Teilen.
    if (this.escort) {
      this.escort.follow(this.player.x - 28, this.player.y - 6)
      const near = this.entries.some((e) =>
        e.collectibles.some(
          (c) => Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) < 240,
        ),
      )
      this.escort.setNearPart(near)
    }

    // Bauen-Knopf: nahe einem Fundament mit allen Teilen, noch nicht gebaut.
    this.buildEntry = this.entries.find(
      (e) =>
        !e.foundation.built &&
        GameState.hasAllParts(e.portal.id) &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, e.foundation.x, e.foundation.y) < 150,
    )
    if (this.buildEntry) this.showBuildButton()
    else this.hideBuildButton()

    this.updateCompass()
  }

  // Kompass: Lager (Freund heimbringen) > nächstes Teil > nächstes Fundament.
  private updateCompass() {
    const pending = PORTALS.find((p) => GameState.hasPending(p.reward.companion.id))
    if (pending) {
      this.compass.point(this.player.x, this.player.y, this.campPos.x, this.campPos.y, 'Lager')
      return
    }
    let tx = 0
    let ty = 0
    let label = 'Fundament'
    let bd = Number.POSITIVE_INFINITY
    let found = false
    for (const e of this.entries) {
      for (const c of e.collectibles) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y)
        if (d < bd) {
          bd = d
          tx = c.x
          ty = c.y
          label = 'Teil'
          found = true
        }
      }
    }
    if (!found) {
      // nächstes Fundament/Portal
      const e = this.nearestEntry()
      tx = e.foundation.x
      ty = e.foundation.y
      label = e.foundation.built ? 'Portal' : 'Fundament'
    }
    this.compass.point(this.player.x, this.player.y, tx, ty, label)
  }
}
