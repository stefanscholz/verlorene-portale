import Phaser from 'phaser'
import { WORLD_WIDTH, WORLD_HEIGHT, TILE, TEX } from '../config'
import { FIRST_PORTAL } from '../data/portals'
import { GameState } from '../systems/GameState'
import { Player } from '../objects/Player'
import { Collectible } from '../objects/Collectible'
import { PortalFoundation } from '../objects/PortalFoundation'
import { Companion } from '../objects/Companion'
import { addAtmosphere } from '../objects/atmosphere'

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
    this.drawGround()
    addAtmosphere(this, WORLD_WIDTH, WORLD_HEIGHT, 22)

    // Spielfigur startet etwas unterhalb des Fundaments.
    this.player = new Player(this, this.portal.foundation.x, this.portal.foundation.y + 170)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    // Fundament bzw. (falls bereits gebaut) aktives Portal.
    this.foundation = new PortalFoundation(
      this,
      this.portal.foundation.x,
      this.portal.foundation.y,
      GameState.isBuilt(this.portal.id),
    )
    this.physics.add.overlap(this.player, this.foundation, () => this.tryEnterPortal())

    // Noch nicht gesammelte Teile platzieren.
    for (const part of this.portal.parts) {
      if (GameState.hasPart(this.portal.id, part.id)) continue
      const c = new Collectible(this, part)
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
      if (this.buildButton && this.buildButtonRect.contains(p.x, p.y)) {
        this.buildPortal()
        return
      }
      const wp = this.cameras.main.getWorldPoint(p.x, p.y)
      this.player.moveTo(wp.x, wp.y)
    })

    this.scene.bringToTop('UIScene')
    this.emitHud()

    if (GameState.isBuilt(this.portal.id)) {
      this.toast('Willkommen zurück! Tritt ins Portal, um die andere Welt zu besuchen.')
    } else {
      this.toast(`${this.portal.name} ist zerstört. Finde die 3 Teile und baue es wieder auf!`)
    }
  }

  private drawGround() {
    const cols = Math.ceil(WORLD_WIDTH / TILE)
    const rows = Math.ceil(WORLD_HEIGHT / TILE)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = (r + c) % 2 === 0 ? TEX.ground : TEX.groundAlt
        this.add.image(c * TILE, r * TILE, key).setOrigin(0, 0).setDepth(0)
      }
    }
  }

  private collectPart(c: Collectible) {
    if (!c.active) return
    GameState.collectPart(this.portal.id, c.partDef.id)
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
    this.foundation.build()
    this.hideBuildButton()
    this.cameras.main.flash(450, 200, 150, 255)
    this.toast('Das Portal leuchtet! Tritt hindurch, um die andere Welt zu betreten.')
    this.emitHud()
  }

  private tryEnterPortal() {
    if (!this.foundation.built || this.entering) return
    this.entering = true
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
    })
  }

  private toast(text: string) {
    this.game.events.emit('toast', text)
  }

  update() {
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
  }
}
