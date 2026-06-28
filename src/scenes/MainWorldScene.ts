import Phaser from 'phaser'
import { WORLD_WIDTH, WORLD_HEIGHT, TILE, TEX } from '../config'
import { FIRST_PORTAL } from '../data/portals'
import { GameState } from '../systems/GameState'
import { Player } from '../objects/Player'
import { Collectible } from '../objects/Collectible'
import { PortalFoundation } from '../objects/PortalFoundation'
import { Companion } from '../objects/Companion'
import { Compass } from '../objects/Compass'
import { addAtmosphere } from '../objects/atmosphere'
import { GameAudio } from '../systems/Audio'
import { computeLayout } from '../systems/layout'
import { generateTerrain } from '../systems/terrain'
import { TerrainMap } from '../objects/TerrainMap'

// Die Hauptwelt: erkunden, die 3 Portal-Teile sammeln, am Fundament das Portal
// bauen und es betreten. Ein bereits befreundeter Begleiter folgt der Figur.
export class MainWorldScene extends Phaser.Scene {
  private portal = FIRST_PORTAL
  private player!: Player
  private foundation!: PortalFoundation
  private collectibles: Collectible[] = []
  private companion?: Companion
  private buildButton?: Phaser.GameObjects.Container
  private buildButtonRect = new Phaser.Geom.Rectangle(0, 0, 0, 0)
  private entering = false
  private energyHintShown = false
  private compass!: Compass
  private terrain!: TerrainMap
  private lastEnergyInt = -1
  private campPos = { x: 0, y: 0 }

  constructor() {
    super('MainWorldScene')
  }

  create() {
    this.entering = false
    this.collectibles = []
    this.companion = undefined
    this.buildButton = undefined
    this.buildButtonRect = new Phaser.Geom.Rectangle(0, 0, 0, 0)

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.lastEnergyInt = -1

    // Zufällige (aber pro Spielstand stabile) Platzierung.
    const layout = computeLayout(this.portal, GameState.seed)

    // Landschaft erzeugen (Berge/Flüsse/Wälder/Wege); Zielpunkte bleiben begehbar.
    const clear = [
      layout.playerStart,
      layout.foundation,
      layout.camp,
      ...Object.values(layout.parts),
    ].map((p) => ({ col: Math.floor(p.x / TILE), row: Math.floor(p.y / TILE) }))
    const grid = generateTerrain(
      'wald',
      Math.ceil(WORLD_WIDTH / TILE),
      Math.ceil(WORLD_HEIGHT / TILE),
      GameState.seed,
      clear,
    )
    this.terrain = new TerrainMap(this, 'wald', grid)
    addAtmosphere(this, WORLD_WIDTH, WORLD_HEIGHT, 22)

    // Lager (sicherer Ort, um Freunde heimzubringen).
    this.campPos = layout.camp
    this.add.image(layout.camp.x, layout.camp.y, TEX.camp).setDepth(4)

    // Spielfigur – Tempo richtet sich nach dem Boden, Berge/Steine blocken.
    // Mit „Waldläufer" bewegt man sich im Wald wieder normal schnell.
    this.player = new Player(this, layout.playerStart.x, layout.playerStart.y)
    this.player.setTerrain((x, y) => {
      if (this.terrain.idAt(x, y) === 'wald' && GameState.hasTerrainAbility('waldlaeufer')) return 1
      return this.terrain.speedAt(x, y)
    })
    this.physics.add.collider(this.player, this.terrain.blockers)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    // Fundament bzw. (falls bereits gebaut) aktives Portal.
    this.foundation = new PortalFoundation(
      this,
      layout.foundation.x,
      layout.foundation.y,
      GameState.isBuilt(this.portal.id),
    )
    this.physics.add.overlap(this.player, this.foundation, () => this.tryEnterPortal())

    // Noch nicht gesammelte Teile an ihren zufälligen Positionen platzieren.
    for (const part of this.portal.parts) {
      if (GameState.hasPart(this.portal.id, part.id)) continue
      const pos = layout.parts[part.id]
      const c = new Collectible(this, pos.x, pos.y, part)
      this.collectibles.push(c)
      this.physics.add.overlap(this.player, c, () => this.collectPart(c))
    }

    // Begleiter, falls bereits befreundet.
    if (GameState.hasCompanion(this.portal.reward.companion.id)) {
      this.companion = new Companion(
        this,
        this.player.x - 30,
        this.player.y,
        this.portal.reward.companion.color,
      )
    }

    // Tippen: zum Bauen-Knopf -> bauen, sonst hinlaufen.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      GameAudio.ensureStarted()
      // Tipp auf den Ton-Knopf (oben rechts) nicht als Laufen werten
      if (p.x > this.cameras.main.width - 52 && p.y < 50) return
      if (this.buildButton && this.buildButtonRect.contains(p.x, p.y)) {
        this.buildPortal()
        return
      }
      const wp = this.cameras.main.getWorldPoint(p.x, p.y)
      this.player.moveTo(wp.x, wp.y)
    })

    this.compass = new Compass(this)

    this.scene.bringToTop('UIScene')
    this.emitHud()
    this.applyPortalEnergy()

    if (GameState.hasPending(this.portal.reward.companion.id)) {
      this.toast(`Bring ${this.portal.reward.companion.name} zum Lager (Zelt am Feuer)!`)
    } else if (GameState.isBuilt(this.portal.id)) {
      this.toast('Willkommen zurück! Tritt ins Portal, um die andere Welt zu besuchen.')
    } else {
      this.toast(`${this.portal.name} ist zerstört. Finde die 3 Teile und baue es wieder auf!`)
    }
  }

  // Freund im Lager abliefern -> Gelände-Fähigkeit dauerhaft freischalten.
  private tryDeliverFriend() {
    const companionId = this.portal.reward.companion.id
    if (!GameState.hasPending(companionId)) return
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.campPos.x, this.campPos.y) > 95) {
      return
    }
    const ta = this.portal.reward.terrainAbility
    GameState.deliverFriend(companionId, ta.id)
    GameAudio.victory()
    this.cameras.main.flash(450, 180, 255, 180)
    this.toast(`${this.portal.reward.companion.name} ist sicher im Lager! Neue Fähigkeit „${ta.name}": ${ta.description}`)
  }

  private collectPart(c: Collectible) {
    if (!c.active) return
    GameState.collectPart(this.portal.id, c.partDef.id)
    GameAudio.collect()
    const idx = this.collectibles.indexOf(c)
    if (idx >= 0) this.collectibles.splice(idx, 1)
    this.tweens.add({
      targets: c,
      scale: 0,
      alpha: 0,
      duration: 250,
      onComplete: () => c.destroy(),
    })

    const have = GameState.collectedCount(this.portal.id)
    const total = this.portal.parts.length
    const left = total - have
    const msg =
      left > 0
        ? `Super! ${c.partDef.name} gefunden! Noch ${left} ${left === 1 ? 'Teil' : 'Teile'} fehlen.`
        : 'Toll, du hast alle Teile! Geh zum Fundament und tippe auf „Portal bauen".'
    this.toast(msg)
    this.emitHud()
  }

  private buildPortal() {
    if (this.foundation.built) return
    if (!GameState.hasAllParts(this.portal.id)) return
    GameState.buildPortal(this.portal.id)
    GameAudio.build()
    this.foundation.build()
    this.hideBuildButton()
    this.cameras.main.flash(450, 200, 150, 255)
    this.toast('Das Portal leuchtet! Tritt hindurch, um die andere Welt zu betreten.')
    this.emitHud()
  }

  private tryEnterPortal() {
    if (!this.foundation.built || this.entering) return
    this.entering = true
    GameAudio.portalEnter()
    this.player.halt()
    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('PortalWorldScene', { portalId: this.portal.id })
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
    this.buildButton = this.add
      .container(x, y, [bg, label])
      .setScrollFactor(0)
      .setDepth(100)
    this.buildButtonRect = new Phaser.Geom.Rectangle(x - 125, y - 33, 250, 66)
  }

  private hideBuildButton() {
    this.buildButton?.destroy()
    this.buildButton = undefined
    this.buildButtonRect = new Phaser.Geom.Rectangle(0, 0, 0, 0)
  }

  private emitHud() {
    this.game.events.emit('hud', {
      mode: 'main',
      portalName: this.portal.name,
      collected: GameState.collectedCount(this.portal.id),
      total: this.portal.parts.length,
      built: this.foundation.built,
      energy: GameState.getEnergy(this.portal.id),
    })
  }

  // Gebautes Portal nach Ladung heller/dunkler; Hinweis bei wenig Energie.
  private applyPortalEnergy() {
    if (!this.foundation.built) return
    const e = GameState.getEnergy(this.portal.id)
    this.foundation.setAlpha(0.5 + (0.5 * e) / 100)
    if (e < 20 && !this.energyHintShown) {
      this.energyHintShown = true
      this.toast('Das Portal hat wenig Energie! Geh hindurch und sammle Sternenenergie.')
    }
  }

  private toast(text: string) {
    this.game.events.emit('toast', text)
  }

  // Tiefes Wasser zieht Energie, solange man darin steht.
  private drainInDeepWater(delta: number) {
    const drain = this.terrain.drainAt(this.player.x, this.player.y)
    if (drain <= 0) return
    const e = GameState.getEnergy(this.portal.id)
    if (e <= 0) return
    GameState.setEnergy(this.portal.id, e - drain * (delta / 1000))
    const shown = Math.ceil(GameState.getEnergy(this.portal.id))
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

    // Begleiter folgt der Figur und leuchtet (mit Kraft "Spürsinn") nahe Teilen.
    if (this.companion) {
      this.companion.follow(this.player.x - 28, this.player.y - 6)
      const hasSense = GameState.hasAbility(this.portal.reward.ability.id)
      const near =
        hasSense &&
        this.collectibles.some(
          (c) => Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) < 240,
        )
      this.companion.setNearPart(near)
    }

    // Bauen-Knopf nur zeigen, wenn alle Teile da, noch nicht gebaut und nah am Fundament.
    const canBuild = GameState.hasAllParts(this.portal.id) && !this.foundation.built
    const nearFoundation =
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.foundation.x,
        this.foundation.y,
      ) < 150
    if (canBuild && nearFoundation) this.showBuildButton()
    else this.hideBuildButton()

    this.updateCompass()
  }

  // Kompass zeigt zum nächsten Ziel: Lager (Freund heimbringen) > Teil > Portal.
  private updateCompass() {
    if (GameState.hasPending(this.portal.reward.companion.id)) {
      this.compass.point(this.player.x, this.player.y, this.campPos.x, this.campPos.y, 'Lager')
      return
    }
    let tx = this.foundation.x
    let ty = this.foundation.y
    let label = this.foundation.built ? 'Portal' : 'Fundament'
    if (this.collectibles.length > 0) {
      let best = this.collectibles[0]
      let bd = Number.POSITIVE_INFINITY
      for (const c of this.collectibles) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y)
        if (d < bd) {
          bd = d
          best = c
        }
      }
      tx = best.x
      ty = best.y
      label = 'Teil'
    }
    this.compass.point(this.player.x, this.player.y, tx, ty, label)
  }
}
