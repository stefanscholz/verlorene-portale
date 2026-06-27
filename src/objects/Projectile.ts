import Phaser from 'phaser'
import { TEX, PROJECTILE_SPEED } from '../config'

// Eine geworfene Licht-/Energiekugel. Fliegt in eine Richtung und löst sich
// nach kurzer Zeit von selbst auf.
export class Projectile extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, x: number, y: number, dir: Phaser.Math.Vector2) {
    super(scene, x, y, TEX.projectile)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setDepth(8)

    const v = dir.clone().normalize().scale(PROJECTILE_SPEED)
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocity(v.x, v.y)

    scene.time.delayedCall(1500, () => {
      if (this.active) this.destroy()
    })
  }
}
