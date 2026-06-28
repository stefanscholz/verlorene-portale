import Phaser from 'phaser'
import { TEX } from '../config'
import { GameState } from '../systems/GameState'
import { addAtmosphere } from '../objects/atmosphere'
import { GameAudio } from '../systems/Audio'

// Startbildschirm: Titel, leuchtendes Portal, „Spielen" und „Geschichte".
// Bei vorhandenem Fortschritt führt „Spielen" direkt in die Welt, sonst
// zuerst durch das Erzähl-Intro (StoryScene).
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene')
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height
    this.cameras.main.setBackgroundColor('#191634')
    addAtmosphere(this, w, h, 26)

    this.game.events.emit('hud', { mode: 'menu' })
    // Erste Berührung gibt Audio frei und startet die Musik.
    this.input.once('pointerdown', () => GameAudio.ensureStarted())

    // Leuchtendes Portal als Blickfang
    const portal = this.add.image(w / 2, h * 0.3, TEX.portal).setScale(1.4)
    this.tweens.add({ targets: portal, angle: 360, duration: 16000, repeat: -1 })
    this.tweens.add({
      targets: portal,
      scale: { from: 1.35, to: 1.5 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })

    this.add
      .text(w / 2, h * 0.52, 'Verlorene\nPortale', {
        fontFamily: 'sans-serif',
        fontSize: '46px',
        color: '#8be9fd',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0c1030',
        strokeThickness: 6,
      })
      .setOrigin(0.5)

    this.add
      .text(w / 2, h * 0.63, 'Ein magisches Portal-Abenteuer', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#c9c2ee',
      })
      .setOrigin(0.5)

    const hasProgress =
      GameState.collectedParts.size > 0 || GameState.builtPortals.size > 0

    this.makeButton(w / 2, h * 0.76, hasProgress ? '▶  Weiterspielen' : '▶  Spielen', 0x39d4c8, () => {
      this.scene.start('DifficultyScene', { fresh: !hasProgress })
    })

    this.makeButton(w / 2, h * 0.86, 'Geschichte', 0x6a4caf, () => {
      this.scene.start('StoryScene', { next: 'TitleScene' })
    })

    if (hasProgress) {
      this.add
        .text(w / 2, h * 0.93, 'Neu starten', {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#9a93c0',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          GameState.reset()
          this.scene.start('DifficultyScene', { fresh: true })
        })
    }
  }

  private makeButton(x: number, y: number, label: string, color: number, onClick: () => void) {
    const bg = this.add.rectangle(x, y, 250, 56, color).setStrokeStyle(3, 0xffffff, 0.8)
    const txt = this.add
      .text(x, y, label, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#0c1030',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => bg.setScale(1.05))
    bg.on('pointerout', () => bg.setScale(1))
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, txt], scale: 0.95, duration: 80, yoyo: true, onComplete: onClick })
    })
  }
}
