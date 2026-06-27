import Phaser from 'phaser'
import { TEX, PLAYER_SPEED } from '../config'

// Die Spielfigur. Steuerung per "Tippen zum Bewegen": Beim Antippen merkt sich
// die Figur das Ziel und läuft selbstständig dorthin, bis sie ankommt.
// Beim Laufen zeigt sie in die passende Richtung (unten/oben/Seite) und
// wackelt leicht – eine kleine Geh-Animation.
export class Player extends Phaser.Physics.Arcade.Sprite {
  private target?: Phaser.Math.Vector2
  /** Letzte Laufrichtung – wird z. B. als Wurfrichtung genutzt. */
  facing = new Phaser.Math.Vector2(0, 1)
  private walking = false
  private waddle?: Phaser.Tweens.Tween

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.playerDown)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setCircle(20)
    this.setCollideWorldBounds(true)
    this.setDepth(10)
  }

  /** Ziel setzen – die Figur läuft im preUpdate dorthin. */
  moveTo(x: number, y: number) {
    this.target = new Phaser.Math.Vector2(x, y)
  }

  /** Sofort anhalten. */
  halt() {
    this.target = undefined
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta)
    const body = this.body as Phaser.Physics.Arcade.Body

    if (this.target) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y)
      if (dist < 6) {
        body.setVelocity(0, 0)
        this.target = undefined
      } else {
        this.scene.physics.moveTo(this, this.target.x, this.target.y, PLAYER_SPEED)
        this.facing.set(this.target.x - this.x, this.target.y - this.y).normalize()
      }
    }

    this.updateAnimation(body.velocity)
  }

  /** Blickrichtung anhand der Geschwindigkeit setzen und Wackeln starten/stoppen. */
  private updateAnimation(v: Phaser.Math.Vector2) {
    if (v.length() > 5) {
      if (Math.abs(v.x) > Math.abs(v.y)) {
        this.setTexture(TEX.playerSide)
        this.setFlipX(v.x < 0) // Seiten-Sprite zeigt nach rechts -> für links spiegeln
      } else {
        this.setTexture(v.y > 0 ? TEX.playerDown : TEX.playerUp)
        this.setFlipX(false)
      }
      this.startWaddle()
    } else {
      this.stopWaddle()
    }
  }

  private startWaddle() {
    if (this.walking) return
    this.walking = true
    this.waddle = this.scene.tweens.add({
      targets: this,
      angle: { from: -7, to: 7 },
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  private stopWaddle() {
    if (!this.walking) return
    this.walking = false
    this.waddle?.stop()
    this.waddle = undefined
    this.setAngle(0)
  }
}
