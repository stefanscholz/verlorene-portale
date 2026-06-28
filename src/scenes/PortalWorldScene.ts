import Phaser from 'phaser'
import {
  REWARD_WIDTH,
  REWARD_HEIGHT,
  TILE,
  TEX,
  THROW_COOLDOWN,
  DIFFICULTY,
  DifficultyParams,
} from '../config'
import { PORTALS, PortalDef } from '../data/portals'
import { GameState } from '../systems/GameState'
import { Player } from '../objects/Player'
import { Creature } from '../objects/Creature'
import { Projectile } from '../objects/Projectile'
import { EnergySource } from '../objects/EnergySource'
import { HazardFloor } from '../objects/HazardFloor'
import { Compass } from '../objects/Compass'
import { addAtmosphere } from '../objects/atmosphere'
import { GameAudio } from '../systems/Audio'
import { generateTerrain } from '../systems/terrain'
import { TerrainMap } from '../objects/TerrainMap'
import { computeLayout, PortalLayout } from '../systems/layout'

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

  // Lade-/Hazard-Spiel (nur in der bereits befreiten Welt)
  private charging = false
  private params!: DifficultyParams
  private hazardFloor?: HazardFloor
  private energySources: EnergySource[] = []
  private energy = 0
  private entryEnergy = 0
  private invulnUntil = 0
  private full = false
  private failed = false
  private compass?: Compass
  private chargingStart = 0
  private layout!: PortalLayout
  private healProjectiles: Projectile[] = []
  private terrain!: TerrainMap

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
    this.charging = false
    this.full = false
    this.failed = false
    this.energySources = []
    this.hazardFloor = undefined
    this.invulnUntil = 0
    this.compass = undefined
    this.chargingStart = 0
    this.healProjectiles = []
    this.layout = computeLayout(this.portal, GameState.seed)

    this.physics.world.setBounds(0, 0, REWARD_WIDTH, REWARD_HEIGHT)
    this.cameras.main.setBounds(0, 0, REWARD_WIDTH, REWARD_HEIGHT)
    this.cameras.main.setBackgroundColor(this.portal.reward.groundColor)

    // Weltraum-Landschaft (Nebel/Sternenpfade/Asteroidenfelder/Brocken/Leere).
    const clear = [this.layout.rewardSpawn, this.layout.creature].map((p) => ({
      col: Math.floor(p.x / TILE),
      row: Math.floor(p.y / TILE),
    }))
    const grid = generateTerrain(
      'weltraum',
      Math.ceil(REWARD_WIDTH / TILE),
      Math.ceil(REWARD_HEIGHT / TILE),
      GameState.seed,
      clear,
    )
    this.terrain = new TerrainMap(this, 'weltraum', grid)
    addAtmosphere(this, REWARD_WIDTH, REWARD_HEIGHT, 30)

    this.player = new Player(this, this.layout.rewardSpawn.x, this.layout.rewardSpawn.y)
    this.player.setTerrain((x, y) => this.terrain.speedAt(x, y))
    this.physics.add.collider(this.player, this.terrain.blockers)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    if (this.cleared) {
      // Bereits befreit: Lade-/Hazard-Spiel zum Aufladen des Portals.
      this.beginCharging()
    } else {
      this.creature = new Creature(
        this,
        this.layout.creature.x,
        this.layout.creature.y,
        this.portal.reward.creature,
      )
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
    if (!this.cleared) {
      this.game.events.emit(
        'toast',
        'Vorsicht – hier lauert eine Gefahr! Tippe den gelben Knopf, um Lichtkugeln zu werfen.',
      )
    }
  }

  private createThrowButton(label = 'Werfen', fontSize = '18px') {
    const cam = this.cameras.main
    const r = 48
    const x = cam.width - r - 22
    const y = cam.height - r - 22
    const circle = this.add.circle(0, 0, r, 0xffee58).setStrokeStyle(4, 0xf9a825)
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'sans-serif',
        fontSize,
        color: '#5d4037',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
    this.throwButton = this.add.container(x, y, [circle, text]).setScrollFactor(0).setDepth(100)
    this.throwButtonRect = new Phaser.Geom.Rectangle(x - r, y - r, r * 2, r * 2)
  }

  private hideThrowButton() {
    this.throwButton?.destroy()
    this.throwButton = undefined
    this.throwButtonRect = new Phaser.Geom.Rectangle(0, 0, 0, 0)
  }

  private tryThrow() {
    if (this.charging) {
      this.tryHealThrow()
      return
    }
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

  // Energie freigeben: wirft eine Lichtkugel auf das nächste schwarze Loch und
  // heilt es (kostet Energie). So räumt man auf schwer den Boden auf.
  private tryHealThrow() {
    const now = this.time.now
    if (now - this.lastThrow < THROW_COOLDOWN) return
    const target = this.hazardFloor?.nearestInfected(this.player.x, this.player.y)
    if (!target) return // nichts zu heilen
    const cost = 6
    if (this.energy < cost) {
      this.game.events.emit('toast', 'Zu wenig Energie zum Freigeben – sammle erst Sternenenergie!')
      return
    }
    this.lastThrow = now
    this.setEnergy(this.energy - cost)
    GameAudio.shoot()
    const dir = new Phaser.Math.Vector2(target.x - this.player.x, target.y - this.player.y)
    if (dir.length() < 1) dir.copy(this.player.facing)
    this.healProjectiles.push(new Projectile(this, this.player.x, this.player.y, dir))
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
    // Freund zur Seite bewegen, damit Rück-Portal/Energie-Bereich frei sind.
    if (this.creature) {
      this.tweens.add({ targets: this.creature, x: 130, y: 175, duration: 700, ease: 'Sine.inOut' })
    }
    this.hideThrowButton()
    GameAudio.victory()
    this.cameras.main.flash(500, 180, 255, 180)
    this.game.events.emit(
      'toast',
      `Geschafft! ${reward.companion.name} ist jetzt dein Freund. Neue Kraft „${reward.ability.name}": ${reward.ability.description}`,
    )
    // Direkt nach dem Boss-Kampf beginnt sanft das Aufladen (Energie erscheint
    // nach und nach, Verfall startet langsam).
    this.time.delayedCall(1600, () => this.beginCharging())
  }

  private spawnReturnPortal() {
    if (this.returnPortal) return
    // Erscheint dort, wo die Gefahr war.
    this.returnPortal = this.physics.add
      .staticImage(this.layout.creature.x, this.layout.creature.y, TEX.portal)
      .setDepth(4)
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
    this.hazardFloor?.destroy()
    this.game.events.emit('energy', null)
    this.player.halt()
    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainWorldScene')
    })
  }

  // --- Lade-/Hazard-Spiel (befreite Welt) ---

  private beginCharging() {
    if (this.charging) return
    this.params = DIFFICULTY[GameState.difficulty]
    this.energy = this.entryEnergy = GameState.getEnergy(this.portal.id)

    const zones = [this.layout.creature, this.layout.rewardSpawn]
    this.hazardFloor = new HazardFloor(
      this,
      Math.ceil(REWARD_WIDTH / TILE),
      Math.ceil(REWARD_HEIGHT / TILE),
      this.params,
      this.portal.reward.hazardTex,
      {
        playerPos: () => ({ x: this.player.x, y: this.player.y }),
        // Nur auf begehbarem, nicht-zehrendem Boden außerhalb der Schutzzonen.
        canInfect: (col, row) => {
          const x = col * TILE + TILE / 2
          const y = row * TILE + TILE / 2
          if (this.terrain.isImpassable(x, y) || this.terrain.drainAt(x, y) > 0) return false
          return zones.every((z) => Phaser.Math.Distance.Between(x, y, z.x, z.y) > 120)
        },
      },
    )

    // Energie erscheint nach und nach (nicht alles auf einmal).
    this.spawnEnergyGradually(this.portal.reward.initialEnergySources)

    this.spawnReturnPortal()
    this.compass = new Compass(this)
    this.createThrowButton('Frei-\ngeben', '15px')
    this.chargingStart = this.time.now
    this.charging = true
    this.emitEnergy()
    const healHint =
      GameState.difficulty === 'schwer'
        ? ' Mit „Freigeben" heilst du schwarze Löcher (kostet Energie).'
        : ''
    this.game.events.emit(
      'toast',
      `Sternenenergie erscheint – lade das Portal auf und meide die schwarzen Löcher!${healHint}`,
    )
  }

  private spawnEnergyGradually(n: number) {
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(400 + i * 1100, () => {
        if (this.charging && !this.leaving && !this.failed) this.spawnEnergySource()
      })
    }
  }

  private randomEnergyPos(): { x: number; y: number } {
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(80, REWARD_WIDTH - 80)
      const y = Phaser.Math.Between(120, REWARD_HEIGHT - 140)
      if (this.terrain.isImpassable(x, y)) continue // nicht in Brocken
      const dPortal = Phaser.Math.Distance.Between(x, y, this.layout.creature.x, this.layout.creature.y)
      const dSpawn = Phaser.Math.Distance.Between(x, y, this.layout.rewardSpawn.x, this.layout.rewardSpawn.y)
      if (dPortal > 110 && dSpawn > 90) return { x, y }
    }
    return { x: Phaser.Math.Between(80, REWARD_WIDTH - 80), y: REWARD_HEIGHT / 2 }
  }

  private spawnEnergySource() {
    const pos = this.randomEnergyPos()
    const src = new EnergySource(this, pos.x, pos.y, this.portal.reward.energyTex)
    this.energySources.push(src)
    this.physics.add.overlap(this.player, src, () => this.collectEnergy(src))
  }

  private collectEnergy(src: EnergySource) {
    if (!src.active) return
    const idx = this.energySources.indexOf(src)
    if (idx >= 0) this.energySources.splice(idx, 1)
    src.destroy()
    GameAudio.collect()
    this.setEnergy(this.energy + this.params.energyPerPickup)

    if (this.energy >= 100 && !this.full) this.onFull()

    if (this.params.energyRespawn) {
      this.time.delayedCall(2400, () => {
        if (this.charging && !this.leaving && !this.failed) this.spawnEnergySource()
      })
    }
  }

  private onFull() {
    this.full = true
    GameAudio.build()
    this.game.events.emit('toast', '✨ Portal voll aufgeladen! Stark gemacht!')
  }

  private setEnergy(value: number) {
    this.energy = Phaser.Math.Clamp(value, 0, 100)
    if (this.energy < 100) this.full = false
    GameState.setEnergy(this.portal.id, this.energy)
    this.emitEnergy()
  }

  private emitEnergy() {
    this.game.events.emit('energy', { value: this.energy })
  }

  private hazardHit() {
    if (this.params.lethal) {
      this.fail('Oje – ein schwarzes Loch hat dich erwischt!')
      return
    }
    this.invulnUntil = this.time.now + 1000
    this.setEnergy(this.energy - this.params.hazardPenalty)
    GameAudio.hit()
    this.cameras.main.flash(160, 120, 0, 0)
    // kurzes Blinken + Rückstoß Richtung Startpunkt
    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 120, yoyo: true, repeat: 3 })
    const dir = new Phaser.Math.Vector2(
      REWARD_WIDTH / 2 - this.player.x,
      REWARD_HEIGHT - 150 - this.player.y,
    )
      .normalize()
      .scale(240)
    this.player.halt()
    ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(dir.x, dir.y)
    this.time.delayedCall(220, () => this.player.halt())
  }

  private fail(msg: string) {
    if (this.failed || this.leaving) return
    this.failed = true
    this.charging = false
    // Runden-Energie verfällt: zurück auf den Stand beim Betreten
    GameState.setEnergy(this.portal.id, this.entryEnergy)
    this.hazardFloor?.destroy()
    GameAudio.hit()
    this.player.halt()
    this.game.events.emit('energy', null)
    this.game.events.emit('toast', `${msg} Versuch es gleich nochmal!`)
    this.cameras.main.flash(300, 140, 0, 0)
    this.cameras.main.fadeOut(700, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainWorldScene'))
  }

  update(_time: number, delta: number) {
    if (this.creature && !this.creature.freed) {
      this.creature.chase(new Phaser.Math.Vector2(this.player.x, this.player.y))
    }

    if (!this.charging || this.failed || this.leaving) return

    // Leere (tiefer Weltraum) zieht Energie, solange man darin steht.
    const drain = this.terrain.drainAt(this.player.x, this.player.y)
    if (drain > 0) this.setEnergy(this.energy - drain * (delta / 1000))

    // Energie-Verfall startet langsam: 3 s Schonzeit, dann über 5 s auf vollen
    // Verfall hochrampen. Leere Energie ist KEIN Verlust – verloren hat man nur
    // beim Betreten eines schwarzen Lochs.
    if (this.params.energyDecayPerSec > 0) {
      const elapsed = this.time.now - this.chargingStart
      const factor = Phaser.Math.Clamp((elapsed - 3000) / 5000, 0, 1)
      if (factor > 0) {
        this.setEnergy(this.energy - this.params.energyDecayPerSec * factor * (delta / 1000))
      }
    }

    // Gefährliche Kachel betreten?
    if (
      this.time.now > this.invulnUntil &&
      this.hazardFloor?.isHazardAt(this.player.x, this.player.y)
    ) {
      this.hazardHit()
    }

    // Geworfene Energie heilt befallene Kacheln, die sie überfliegt.
    for (let i = this.healProjectiles.length - 1; i >= 0; i--) {
      const pr = this.healProjectiles[i]
      if (!pr.active) {
        this.healProjectiles.splice(i, 1)
        continue
      }
      if (this.hazardFloor?.healAt(pr.x, pr.y)) {
        GameAudio.hit()
        this.cameras.main.flash(80, 120, 255, 180)
        pr.destroy()
        this.healProjectiles.splice(i, 1)
      }
    }

    this.updateCompass()
  }

  // Kompass zeigt zur nächsten Energiequelle, sonst zum Rück-Portal.
  private updateCompass() {
    if (!this.compass) return
    if (this.energySources.length > 0) {
      let best = this.energySources[0]
      let bd = Number.POSITIVE_INFINITY
      for (const s of this.energySources) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y)
        if (d < bd) {
          bd = d
          best = s
        }
      }
      this.compass.point(this.player.x, this.player.y, best.x, best.y, 'Energie')
    } else {
      this.compass.point(
        this.player.x,
        this.player.y,
        this.layout.creature.x,
        this.layout.creature.y,
        'Zurück',
      )
    }
  }
}
