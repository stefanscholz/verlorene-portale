import Phaser from 'phaser'
import { TEX } from '../config'

// Ein fest im Bild verankerter Kompass (unten links): ein Pfeil dreht sich zum
// aktuellen Ziel, darunter steht, worauf er zeigt. Hilft beim Finden, ohne die
// Welt zu überladen.
export class Compass {
  private container: Phaser.GameObjects.Container
  private needle: Phaser.GameObjects.Image
  private label: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene) {
    const cam = scene.cameras.main
    const ring = scene.add.circle(0, 0, 26, 0x0c1030, 0.55).setStrokeStyle(3, 0x8be9fd, 0.9)
    this.needle = scene.add.image(0, 0, TEX.compass)
    this.label = scene.add
      .text(0, 32, '', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#eafffd',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
    this.container = scene.add
      .container(48, cam.height - 58, [ring, this.needle, this.label])
      .setScrollFactor(0)
      .setDepth(1001)
  }

  /** Pfeil auf ein Weltziel ausrichten (Sprite zeigt standardmäßig nach oben). */
  point(fromX: number, fromY: number, targetX: number, targetY: number, label: string) {
    const ang = Math.atan2(targetY - fromY, targetX - fromX)
    this.needle.setRotation(ang + Math.PI / 2)
    this.label.setText(label)
    this.container.setVisible(true)
  }

  hide() {
    this.container.setVisible(false)
  }
}
