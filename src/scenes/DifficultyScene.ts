import Phaser from 'phaser'
import { DIFFICULTY, Difficulty } from '../config'
import { GameState } from '../systems/GameState'
import { addAtmosphere } from '../objects/atmosphere'
import { GameAudio } from '../systems/Audio'

// Wird beim Start abgefragt: leicht/mittel/schwer. Speichert die Wahl und
// leitet weiter (frisch: ins Intro, sonst direkt in die Hauptwelt).
const OPTIONS: { id: Difficulty; desc: string; color: number }[] = [
  { id: 'leicht', desc: 'Entspannt: Energie bleibt, kaum Gefahren.', color: 0x66bb6a },
  { id: 'mittel', desc: 'Energie verfällt langsam, mehr Gefahren.', color: 0xffca28 },
  { id: 'schwer', desc: 'Schnell leer, keine neue Energie – riskant!', color: 0xef5350 },
]

export class DifficultyScene extends Phaser.Scene {
  private fresh = true

  constructor() {
    super('DifficultyScene')
  }

  init(data: { fresh?: boolean }) {
    this.fresh = data?.fresh ?? true
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height
    this.cameras.main.setBackgroundColor('#191634')
    addAtmosphere(this, w, h, 22)
    this.game.events.emit('hud', { mode: 'menu' })
    this.input.once('pointerdown', () => GameAudio.ensureStarted())

    this.add
      .text(w / 2, h * 0.15, 'Wähle die\nSchwierigkeit', {
        fontFamily: 'sans-serif',
        fontSize: '34px',
        color: '#8be9fd',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0c1030',
        strokeThickness: 5,
      })
      .setOrigin(0.5)

    OPTIONS.forEach((o, i) => {
      this.makeOption(w / 2, h * 0.37 + i * h * 0.19, o, o.id === GameState.difficulty)
    })
  }

  private makeOption(
    x: number,
    y: number,
    o: { id: Difficulty; desc: string; color: number },
    selected: boolean,
  ) {
    const bg = this.add
      .rectangle(x, y, 300, 94, o.color)
      .setStrokeStyle(selected ? 6 : 3, 0xffffff, selected ? 1 : 0.6)
    this.add
      .text(x, y - 20, DIFFICULTY[o.id].label, {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#0c1030',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.add
      .text(x, y + 16, o.desc, {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#1a1733',
        align: 'center',
        wordWrap: { width: 280 },
      })
      .setOrigin(0.5)

    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => bg.setScale(1.04))
    bg.on('pointerout', () => bg.setScale(1))
    bg.on('pointerdown', () => this.choose(o.id))
  }

  private choose(d: Difficulty) {
    GameAudio.ensureStarted()
    GameState.setDifficulty(d)
    GameAudio.collect()
    this.cameras.main.fadeOut(250, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.fresh) this.scene.start('StoryScene', { next: 'MainWorldScene' })
      else this.scene.start('MainWorldScene')
    })
  }
}
