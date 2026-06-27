import Phaser from 'phaser'
import { TEX } from '../config'
import { CreatureDef } from '../data/portals'

// Die "Gefahr" in der Belohnungswelt. Bewegt sich gemächlich auf die Figur zu
// und hat einen Energie-Balken. Ist die Energie leer, wird das Wesen NICHT
// zerstört, sondern befreit/besänftigt (free()) und damit zum Freund.
export class Creature extends Phaser.Physics.Arcade.Sprite {
  energy: number
  maxEnergy: number
  speed: number
  freed = false
  private bar: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, x: number, y: number, def: CreatureDef) {
    super(scene, x, y, TEX.creature)
    this.maxEnergy = def.energy
    this.energy = def.energy
    this.speed = def.speed
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setTint(def.color)
    this.setCircle(28)
    this.setDepth(6)
    this.bar = scene.add.graphics().setDepth(7)
    this.drawBar()
  }

  /** Sich auf ein Ziel zubewegen. */
  chase(target: Phaser.Math.Vector2) {
    if (this.freed) return
    this.scene.physics.moveTo(this, target.x, target.y, this.speed)
  }

  /** Einen Treffer einstecken. Gibt true zurück, wenn die Energie leer ist. */
  hit(): boolean {
    if (this.freed) return false
    this.energy = Math.max(0, this.energy - 1)
    this.drawBar()
    this.scene.tweens.add({ targets: this, scale: { from: 1.25, to: 1 }, duration: 150 })
    return this.energy <= 0
  }

  /** Befreien: anhalten, freundlich einfärben, Energie-Balken entfernen. */
  free() {
    this.freed = true
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
    this.setTint(0x66bb6a)
    this.bar.clear()
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.15 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  private drawBar() {
    this.bar.clear()
    if (this.freed) return
    const w = 56
    const h = 8
    const x = this.x - w / 2
    const y = this.y - 46
    this.bar.fillStyle(0x000000, 0.5)
    this.bar.fillRect(x - 1, y - 1, w + 2, h + 2)
    this.bar.fillStyle(0xff5252, 1)
    this.bar.fillRect(x, y, (w * this.energy) / this.maxEnergy, h)
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta)
    this.drawBar() // Balken folgt dem Wesen
  }

  destroy(fromScene?: boolean) {
    this.bar?.destroy()
    super.destroy(fromScene)
  }
}
