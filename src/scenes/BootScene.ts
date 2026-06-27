import Phaser from 'phaser'
import { TEX, COLORS, TILE } from '../config'
import { GameState } from '../systems/GameState'

// Lädt den Spielstand und erzeugt alle Platzhalter-Texturen zur Laufzeit
// (farbige Formen). So braucht der Prototyp keine Bilddateien. Startet danach
// das HUD (UIScene) und die Hauptwelt.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  create() {
    GameState.load()
    this.makeTextures()
    this.scene.launch('UIScene')
    this.scene.start('MainWorldScene')
  }

  private rectTexture(key: string, w: number, h: number, fill: number, stroke?: number) {
    const g = this.add.graphics()
    const radius = Math.min(12, w / 4)
    g.fillStyle(fill, 1)
    g.fillRoundedRect(0, 0, w, h, radius)
    if (stroke !== undefined) {
      g.lineStyle(4, stroke, 1)
      g.strokeRoundedRect(2, 2, w - 4, h - 4, radius)
    }
    g.generateTexture(key, w, h)
    g.destroy()
  }

  private circleTexture(key: string, r: number, fill: number, stroke?: number) {
    const g = this.add.graphics()
    g.fillStyle(fill, 1)
    g.fillCircle(r, r, r)
    if (stroke !== undefined) {
      g.lineStyle(3, stroke, 1)
      g.strokeCircle(r, r, r - 2)
    }
    g.generateTexture(key, r * 2, r * 2)
    g.destroy()
  }

  private makeTextures() {
    // Bodenkacheln (Schachbrettmuster)
    this.rectTexture(TEX.ground, TILE, TILE, COLORS.ground)
    this.rectTexture(TEX.groundAlt, TILE, TILE, COLORS.groundAlt)
    // Spielfigur
    this.circleTexture(TEX.player, 20, COLORS.player, 0xffffff)
    // Portal-Teil
    this.rectTexture(TEX.part, 36, 36, COLORS.part, 0xff6f00)
    // Fundament
    this.rectTexture(TEX.foundation, 90, 90, COLORS.foundation, 0x3e2723)
    // Portal
    this.circleTexture(TEX.portal, 50, COLORS.portal, 0xe1bee7)
    // Wurfkugel
    this.circleTexture(TEX.projectile, 10, COLORS.projectile, 0xffffff)
    // Wesen (weiß -> per Tint eingefärbt)
    this.circleTexture(TEX.creature, 28, COLORS.creature, 0x424242)
    // Begleiter (weiß -> per Tint eingefärbt)
    this.circleTexture(TEX.companion, 14, COLORS.companion, 0x424242)
  }
}
