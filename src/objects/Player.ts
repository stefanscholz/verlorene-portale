import Phaser from 'phaser'
import { PLAYER_ANIM, PlayerDir, PLAYER_SPEED } from '../config'
import { GameAudio } from '../systems/Audio'

// Die Spielfigur. Steuerung per "Tippen zum Bewegen": Beim Antippen merkt sich
// die Figur das Ziel und läuft selbstständig dorthin, bis sie ankommt.
// Beim Laufen spielt sie echte Schritt-Frames in der passenden Richtung; im
// Stehen eine sanfte Idle-Atem-Animation.
export class Player extends Phaser.Physics.Arcade.Sprite {
  private target?: Phaser.Math.Vector2
  /** Letzte Laufrichtung – wird z. B. als Wurfrichtung genutzt. */
  facing = new Phaser.Math.Vector2(0, 1)
  private dir: PlayerDir = 'down'
  private moving = false
  private breath?: Phaser.Tweens.Tween
  private stepAcc = 0
  /** Liefert den Tempo-Faktor am Ort (1 = normal); vom Terrain gesetzt. */
  private terrain?: (x: number, y: number) => number

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_ANIM.down.idle)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setCircle(20)
    this.setCollideWorldBounds(true)
    this.setDepth(10)
    this.playIdle()
  }

  /** Tempo-Faktor je nach Boden setzen (Terrain). */
  setTerrain(sampler: (x: number, y: number) => number) {
    this.terrain = sampler
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
        const factor = this.terrain ? Math.max(0.2, this.terrain(this.x, this.y)) : 1
        this.scene.physics.moveTo(this, this.target.x, this.target.y, PLAYER_SPEED * factor)
        this.facing.set(this.target.x - this.x, this.target.y - this.y).normalize()
      }
    }

    this.updateAnimation(body.velocity)

    // Schrittgeräusche im Lauf-Rhythmus
    if (this.moving) {
      this.stepAcc += delta
      if (this.stepAcc >= 300) {
        this.stepAcc = 0
        GameAudio.step()
      }
    } else {
      this.stepAcc = 300 // erster Schritt klingt sofort beim Loslaufen
    }
  }

  private updateAnimation(v: Phaser.Math.Vector2) {
    if (v.length() > 5) {
      const dir: PlayerDir = Math.abs(v.x) > Math.abs(v.y) ? 'side' : v.y > 0 ? 'down' : 'up'
      this.setFlipX(dir === 'side' && v.x < 0)
      if (!this.moving || dir !== this.dir) {
        this.dir = dir
        this.moving = true
        this.stopBreath()
        this.play(`walk-${dir}`, true)
      }
    } else if (this.moving || !this.anims.isPlaying) {
      this.moving = false
      this.play(`idle-${this.dir}`, true)
      this.startBreath()
    }
  }

  private playIdle() {
    this.play(`idle-${this.dir}`, true)
    this.startBreath()
  }

  /** Sanftes „Atmen" im Stand. */
  private startBreath() {
    if (this.breath) return
    this.breath = this.scene.tweens.add({
      targets: this,
      scaleY: { from: 1, to: 1.05 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  private stopBreath() {
    this.breath?.stop()
    this.breath = undefined
    this.setScale(1)
  }
}
