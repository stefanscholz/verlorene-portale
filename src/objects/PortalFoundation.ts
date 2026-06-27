import Phaser from 'phaser'
import { TEX } from '../config'

// Das Fundament an der Stelle des zerstörten Portals. Sobald alle Teile da
// sind, verwandelt es sich per build() in ein leuchtendes, aktives Portal.
export class PortalFoundation extends Phaser.Physics.Arcade.Image {
  built = false

  constructor(scene: Phaser.Scene, x: number, y: number, built: boolean) {
    super(scene, x, y, built ? TEX.portal : TEX.foundation)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    ;(this.body as Phaser.Physics.Arcade.Body).setImmovable(true)
    this.setDepth(4)
    this.built = built
    if (built) this.activatePortalVisual()
  }

  build() {
    if (this.built) return
    this.built = true
    this.setTexture(TEX.portal)
    ;(this.body as Phaser.Physics.Arcade.Body).setCircle(50)
    this.activatePortalVisual()
  }

  private activatePortalVisual() {
    this.scene.tweens.add({
      targets: this,
      scale: { from: 0.9, to: 1.1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }
}
