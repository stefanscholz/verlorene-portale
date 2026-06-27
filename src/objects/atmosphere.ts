import Phaser from 'phaser'
import { TEX } from '../config'

// Streut leuchtende, langsam schwebende und funkelnde "Motes" über die Welt –
// für die magisch-geheimnisvolle Stimmung. Rein dekorativ (keine Physik).
export function addAtmosphere(
  scene: Phaser.Scene,
  worldWidth: number,
  worldHeight: number,
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * worldWidth
    const y = Math.random() * worldHeight
    const scale = 0.25 + Math.random() * 0.5
    const mote = scene.add
      .image(x, y, TEX.projectile)
      .setScale(scale)
      .setAlpha(0.15 + Math.random() * 0.35)
      .setDepth(1)

    // sanftes Auf- und Abschweben
    scene.tweens.add({
      targets: mote,
      y: y - (10 + Math.random() * 20),
      duration: 2500 + Math.random() * 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    // Funkeln
    scene.tweens.add({
      targets: mote,
      alpha: 0.05,
      duration: 900 + Math.random() * 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }
}
