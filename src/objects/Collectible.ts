import Phaser from 'phaser'
import { TEX } from '../config'
import { PartDef } from '../data/portals'

// Ein einsammelbares Portal-Teil in der Hauptwelt. Schwebt und dreht sich
// leicht, damit es auffällt.
export class Collectible extends Phaser.Physics.Arcade.Image {
  partDef: PartDef

  constructor(scene: Phaser.Scene, def: PartDef) {
    super(scene, def.pos.x, def.pos.y, TEX.part)
    this.partDef = def
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setDepth(5)

    scene.tweens.add({
      targets: this,
      y: def.pos.y - 10,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    scene.tweens.add({ targets: this, angle: 360, duration: 4000, repeat: -1 })
  }
}
