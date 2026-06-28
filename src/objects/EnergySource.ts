import Phaser from 'phaser'

// Eine einsammelbare Energiequelle in der Belohnungswelt. Schwebt und pulsiert,
// damit sie auffällt. Drüberlaufen lädt das Portal auf (Logik in der Scene).
export class EnergySource extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, x: number, y: number, tex: string) {
    super(scene, x, y, tex)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setDepth(5)

    scene.tweens.add({
      targets: this,
      y: y - 8,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    scene.tweens.add({
      targets: this,
      scale: { from: 0.9, to: 1.1 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }
}
