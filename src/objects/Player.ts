import Phaser from 'phaser'
import { TEX, PLAYER_SPEED } from '../config'

// Die Spielfigur. Steuerung per "Tippen zum Bewegen": Beim Antippen merkt sich
// die Figur das Ziel und läuft selbstständig dorthin, bis sie ankommt.
export class Player extends Phaser.Physics.Arcade.Sprite {
  private target?: Phaser.Math.Vector2
  /** Letzte Laufrichtung – wird z. B. als Wurfrichtung genutzt. */
  facing = new Phaser.Math.Vector2(0, 1)

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.player)
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
    if (!this.target) return
    const body = this.body as Phaser.Physics.Arcade.Body
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y)
    if (dist < 6) {
      body.setVelocity(0, 0)
      this.target = undefined
      return
    }
    this.scene.physics.moveTo(this, this.target.x, this.target.y, PLAYER_SPEED)
    this.facing.set(this.target.x - this.x, this.target.y - this.y).normalize()
  }
}
