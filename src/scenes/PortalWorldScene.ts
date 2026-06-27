import Phaser from 'phaser'
import { REWARD_WIDTH, REWARD_HEIGHT, TEX, THROW_COOLDOWN } from '../config'
import { PORTALS, PortalDef } from '../data/portals'
import { GameState } from '../systems/GameState'
import { Player } from '../objects/Player'
import { Creature } from '../objects/Creature'
import { Projectile } from '../objects/Projectile'
import { addAtmosphere } from '../objects/atmosphere'
import { GameAudio } from '../systems/Audio'

// Die Welt hinter dem Portal: Hier lauert eine Gefahr (Creature). Der Spieler
// läuft per Tippen und wirft mit dem "Werfen"-Knopf Lichtkugeln. Ist die Gefahr
// besiegt, wird sie zum Freund, man erhält eine Kraft, und ein Rück-Portal
// öffnet sich.
export class PortalWorldScene extends Phaser.Scene {
  private portal!: PortalDef
  private player!: Player
  private creature?: Creature
  private returnPortal?: Phaser.Physics.Arcade.Image
  private throwButton?: Phaser.GameObjects.Container
  private throwButtonRect = new Phaser.Geom.Rectangle(0, 0, 0, 0)
  private lastThrow = 0
  private lastTouch = 0
  private cleared = false
  private leaving = false

  constructor() {
    super('PortalWorldScene')
  }

  init(data: { portalId: string }) {
    this.portal = PORTALS.find((p) => p.id === data.portalId) ?? PORTALS[0]
  }

  create() {
    this.leaving = false
    this.cleared = GameState.isDangerCleared(this.portal.id)
    this.creature = undefined
    this.returnPortal = undefined

    this.physics.world.setBounds(0, 0, REWARD_WIDTH, REWARD_HEIGHT)
    this.cameras.main.setBounds(0, 0, REWARD_WIDTH, REWARD_HEIGHT)
    this.cameras.main.setBackgroundColor(this.portal.reward.groundColor)
    addAtmosphere(this, REWARD_WIDTH, REWARD_HEIGHT, 30)

    this.player = new Player(this, REWARD_WIDTH / 2, REWARD_HEIGHT - 150)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    if (this.cleared) {
      // Bereits befreit: freundliches Wesen + offenes Rück-Portal.
      const friend = new Creature(this, REWARD_WIDTH / 2, 230, this.portal.reward.creature)
      friend.free()
      this.spawnReturnPortal()
    } else {
      this.creature = new Creature(this, REWARD_WIDTH / 2, 230, this.portal.reward.creature)
      this.physics.add.overlap(this.player, this.creature, () => this.creatureTouchesPlayer())
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      GameAudio.ensureStarted()
      // Tipp auf den Ton-Knopf (oben rechts) nicht als Laufen werten
      if (p.x > this.cameras.main.width - 52 && p.y < 50) return
      if (this.throwButtonRect.contains(p.x, p.y)) {
        this.tryThrow()
        return
      }
      const wp = this.cameras.main.getWorldPoint(p.x, p.y)
      this.player.moveTo(wp.x, wp.y)
    })

    if (!this.cleared) this.createThrowButton()

    this.scene.bringToTop('UIScene')
    this.game.events.emit('hud', { mode: 'portal', portalName: this.portal.name })

    this.cameras.main.fadeIn(400, 0, 0, 0)
    this.game.events.emit(
      'toast',
      this.cleared
        ? 'Dein Freund wartet hier. Geh durch das Portal oben zurück.'
        : 'Vorsicht – hier lauert eine Gefahr! Tippe den gelben Knopf, um Lichtkugeln zu werfen.',
    )
  }

  private createThrowButton() {
    const cam = this.cameras.main
    const r = 48
    const x = cam.width - r - 22
    const y = cam.height - r - 22
    const circle = this.add.circle(0, 0, r, 0xffee58).setStrokeStyle(4, 0xf9a825)
    const label = this.add
      .text(0, 0, 'Werfen', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#5d4037',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.throwButton = this.add.container(x, y, [circle, label]).setScrollFactor(0).setDepth(100)
    this.throwButtonRect = new Phaser.Geom.Rectangle(x - r, y - r, r * 2, r * 2)
  }

  private hideThrowButton() {
    this.throwButton?.destroy()
    this.throwButton = undefined
    this.throwButtonRect = new Phaser.Geom.Rectangle(0, 0, 0, 0)
  }

  private tryThrow() {
    if (this.cleared || !this.creature || this.creature.freed) return
    const now = this.time.now
    if (now - this.lastThrow < THROW_COOLDOWN) return
    this.lastThrow = now
    GameAudio.shoot()

    // Auto-Zielhilfe: Richtung zur Gefahr (sonst aktuelle Laufrichtung).
    const dir = new Phaser.Math.Vector2(
      this.creature.x - this.player.x,
      this.creature.y - this.player.y,
    )
    if (dir.length() < 1) dir.copy(this.player.facing)

    const pr = new Projectile(this, this.player.x, this.player.y, dir)
    this.physics.add.overlap(pr, this.creature, () => this.hitCreature(pr))
  }

  private hitCreature(pr: Projectile) {
    if (!this.creature || this.creature.freed || !pr.active) return
    pr.destroy()
    const defeated = this.creature.hit()
    GameAudio.hit()
    this.cameras.main.shake(110, 0.004)
    if (defeated) this.onVictory()
  }

  private creatureTouchesPlayer() {
    if (!this.creature || this.creature.freed) return
    const now = this.time.now
    if (now - this.lastTouch < 800) return
    this.lastTouch = now
    // Kein Game-Over: nur kurzes Zurückstoßen.
    const dir = new Phaser.Math.Vector2(
      this.player.x - this.creature.x,
      this.player.y - this.creature.y,
    )
      .normalize()
      .scale(220)
    this.player.halt()
    ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(dir.x, dir.y)
    this.time.delayedCall(220, () => this.player.halt())
    this.cameras.main.flash(150, 120, 0, 0)
  }

  private onVictory() {
    if (this.cleared) return
    this.cleared = true
    const reward = this.portal.reward
    GameState.clearDanger(this.portal.id)
    GameState.unlockAbility(reward.ability.id)
    GameState.addCompanion(reward.companion.id)

    this.creature?.free()
    this.hideThrowButton()
    GameAudio.victory()
    this.cameras.main.flash(500, 180, 255, 180)
    this.game.events.emit(
      'toast',
      `Geschafft! ${reward.companion.name} ist jetzt dein Freund. Neue Kraft „${reward.ability.name}": ${reward.ability.description}`,
    )
    this.time.delayedCall(900, () => this.spawnReturnPortal())
  }

  private spawnReturnPortal() {
    if (this.returnPortal) return
    // Erscheint dort, wo die Gefahr war.
    this.returnPortal = this.physics.add.staticImage(REWARD_WIDTH / 2, 230, TEX.portal).setDepth(4)
    this.tweens.add({
      targets: this.returnPortal,
      scale: { from: 0.9, to: 1.1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    this.physics.add.overlap(this.player, this.returnPortal, () => this.leave())
    this.game.events.emit('toast', 'Das Rück-Portal ist offen! Geh hindurch, um zurückzukehren.')
  }

  private leave() {
    if (this.leaving) return
    this.leaving = true
    GameAudio.portalEnter()
    this.player.halt()
    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainWorldScene')
    })
  }

  update() {
    if (this.creature && !this.creature.freed) {
      this.creature.chase(new Phaser.Math.Vector2(this.player.x, this.player.y))
    }
  }
}
