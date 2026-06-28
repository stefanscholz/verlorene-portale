import Phaser from 'phaser'
import { PartDef } from '../data/portals'

// Ein einsammelbares Portal-Teil in der Hauptwelt. Schwebt und dreht sich
// leicht, damit es auffällt. Jedes Teil hat sein eigenes Aussehen (def.tex).
export class Collectible extends Phaser.Physics.Arcade.Image {
  partDef: PartDef

  constructor(scene: Phaser.Scene, x: number, y: number, def: PartDef) {
    super(scene, x, y, def.tex)
    this.partDef = def
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setDepth(5)

    scene.tweens.add({
      targets: this,
      y: y - 10,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    scene.tweens.add({ targets: this, angle: 360, duration: 4000, repeat: -1 })
  }
}
