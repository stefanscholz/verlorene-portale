import Phaser from 'phaser'
import { TEX } from '../config'

// Das befreundete Wesen, das der Figur in der Hauptwelt folgt. Mit der Kraft
// "Spürsinn" leuchtet es auf, wenn ein verstecktes Portal-Teil in der Nähe ist.
export class Companion extends Phaser.GameObjects.Image {
  private glow: Phaser.GameObjects.Image

  constructor(scene: Phaser.Scene, x: number, y: number, _color: number) {
    super(scene, x, y, TEX.companion)
    scene.add.existing(this)
    this.setDepth(9)

    this.glow = scene.add
      .image(x, y, TEX.companion)
      .setAlpha(0)
      .setScale(2)
      .setDepth(8)

    scene.tweens.add({
      targets: this.glow,
      scale: { from: 1.8, to: 2.8 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  /** Der Figur weich hinterherschweben. */
  follow(tx: number, ty: number) {
    this.x += (tx - this.x) * 0.1
    this.y += (ty - this.y) * 0.1
    this.glow.setPosition(this.x, this.y)
  }

  /** Aufleuchten, wenn ein Teil in der Nähe ist. */
  setNearPart(near: boolean) {
    this.glow.setAlpha(near ? 0.55 : 0)
  }

  destroy(fromScene?: boolean) {
    this.glow?.destroy()
    super.destroy(fromScene)
  }
}
