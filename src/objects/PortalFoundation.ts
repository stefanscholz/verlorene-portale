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
    // Langsam rotierender Glanz hinter dem Portal für den magischen Look.
    const glow = this.scene.add
      .image(this.x, this.y, TEX.portal)
      .setDepth(this.depth - 1)
      .setScale(1.3)
      .setAlpha(0.3)
      .setTint(0x8be9fd)
    this.scene.tweens.add({ targets: glow, angle: 360, duration: 9000, repeat: -1 })
    this.scene.tweens.add({
      targets: this,
      scale: { from: 0.95, to: 1.08 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }
}
